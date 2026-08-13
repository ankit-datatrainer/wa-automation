import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { normalizeQualityRating } from "../lib/meta.js";
import { applyOptInKeywords } from "./opt-out.js";
import { handleInboundForAutomation } from "./flow-engine.js";
import { dispatchIntegrationWebhooks } from "./integrations.js";
import { recordOrder, type MetaOrderMessage } from "./commerce.js";

interface MetaChange {
  field: string;
  value: {
    metadata?: { phone_number_id: string };
    contacts?: { wa_id: string; profile?: { name?: string } }[];
    messages?: MetaInboundMessage[];
    statuses?: MetaStatus[];
    // template status + quality webhooks
    message_template_id?: string | number;
    message_template_name?: string;
    event?: string;
    reason?: string;
    current_limit?: string;
    display_phone_number?: string;
  };
}

interface MetaInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
  video?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; filename?: string };
  sticker?: { id: string };
  location?: { latitude: number; longitude: number; name?: string };
  button?: { text: string; payload: string };
  interactive?: Record<string, unknown>;
  reaction?: { message_id: string; emoji: string };
  order?: MetaOrderMessage;
  context?: { id: string };
}

interface MetaStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message?: string }[];
  pricing?: { category?: string; billable?: boolean };
  conversation?: { id: string; origin?: { type: string } };
}

/**
 * Processes one raw webhook payload. Safe to re-run: message inserts dedupe on
 * `wamid` and status updates are last-write-wins on a monotonic ladder.
 */
export async function processWebhookEvent(eventId: string, payload: unknown) {
  const body = payload as { entry?: { id: string; changes?: MetaChange[] }[] };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      try {
        switch (change.field) {
          case "messages":
            await handleMessagesChange(change);
            break;
          case "message_template_status_update":
            await handleTemplateStatus(change);
            break;
          case "phone_number_quality_update":
            await handleQualityUpdate(change);
            break;
          default:
            logger.debug({ field: change.field }, "Unhandled webhook field");
        }
      } catch (err) {
        logger.error({ err, field: change.field }, "Webhook change failed");
      }
    }
  }

  await supabaseAdmin
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);
}

async function handleMessagesChange(change: MetaChange) {
  const phoneNumberId = change.value.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  const { data: waba } = await supabaseAdmin
    .from("waba_accounts")
    .select("organization_id")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (!waba) {
    logger.warn({ phoneNumberId }, "Webhook for an unknown phone number");
    return;
  }

  const orgId = waba.organization_id;

  for (const message of change.value.messages ?? []) {
    const profileName = change.value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
    await ingestInboundMessage(orgId, message, profileName);
  }

  for (const status of change.value.statuses ?? []) {
    await applyStatusUpdate(orgId, status);
  }
}

async function ingestInboundMessage(
  organizationId: string,
  message: MetaInboundMessage,
  profileName?: string,
) {
  // Upsert the contact first — an inbound message may be our first sight of them.
  const { data: contact, error: contactError } = await supabaseAdmin
    .from("contacts")
    .upsert(
      {
        organization_id: organizationId,
        wa_id: message.from,
        ...(profileName && { name: profileName }),
        source: "whatsapp",
        last_seen_at: new Date(Number(message.timestamp) * 1000).toISOString(),
      },
      { onConflict: "organization_id,wa_id" },
    )
    .select("id")
    .single();

  if (contactError || !contact) throw contactError;

  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from("conversations")
    .upsert(
      { organization_id: organizationId, contact_id: contact.id, status: "open" },
      { onConflict: "organization_id,contact_id" },
    )
    .select("id")
    .single();

  if (conversationError || !conversation) throw conversationError;

  const content = extractContent(message);

  const { error } = await supabaseAdmin.from("messages").insert({
    organization_id: organizationId,
    conversation_id: conversation.id,
    direction: "inbound",
    type: message.type,
    content,
    wamid: message.id,
    status: "delivered",
    sent_at: new Date(Number(message.timestamp) * 1000).toISOString(),
  });

  // 23505 means we have already ingested this wamid on an earlier retry. Bail
  // out entirely so a redelivery cannot re-trigger opt-out or the chatbot.
  if (error?.code === "23505") return;
  if (error) throw error;

  // A catalogue order arrives as its own message type, not as text.
  if (message.type === "order" && message.order) {
    await recordOrder(
      organizationId,
      contact.id,
      conversation.id,
      message.id,
      message.order,
    );
    await dispatchIntegrationWebhooks(organizationId, "order.placed", {
      contactId: contact.id,
      waId: message.from,
      items: message.order.product_items,
    });
    return;
  }

  const text = String(content.text ?? "");
  if (!text.trim()) return;

  // Consent first: someone sending STOP must not then receive a bot reply.
  const optInOutcome = await applyOptInKeywords(organizationId, contact.id, text);
  if (optInOutcome === "opted_out") return;

  // A single prior message means this one is their first-ever inbound.
  const { count: inboundCount } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .eq("direction", "inbound");

  await handleInboundForAutomation(
    organizationId,
    contact.id,
    message.from,
    profileName ?? null,
    text,
    (inboundCount ?? 0) <= 1,
  );

  await dispatchIntegrationWebhooks(organizationId, "message.received", {
    contactId: contact.id,
    waId: message.from,
    conversationId: conversation.id,
    type: message.type,
    text,
    wamid: message.id,
  });
}

function extractContent(message: MetaInboundMessage): Record<string, unknown> {
  switch (message.type) {
    case "text":
      return { text: message.text?.body ?? "" };
    case "image":
      return { mediaId: message.image?.id, caption: message.image?.caption, text: message.image?.caption };
    case "video":
      return { mediaId: message.video?.id, caption: message.video?.caption, text: message.video?.caption };
    case "audio":
      return { mediaId: message.audio?.id };
    case "document":
      return { mediaId: message.document?.id, filename: message.document?.filename, text: message.document?.filename };
    case "sticker":
      return { mediaId: message.sticker?.id };
    case "location":
      return { ...message.location, text: message.location?.name };
    case "button":
      return { text: message.button?.text, payload: message.button?.payload };
    case "interactive":
      return { ...message.interactive, text: extractInteractiveTitle(message.interactive) };
    case "reaction":
      return { emoji: message.reaction?.emoji, targetWamid: message.reaction?.message_id, text: message.reaction?.emoji };
    default:
      return { raw: message };
  }
}

function extractInteractiveTitle(interactive: Record<string, unknown> | undefined) {
  const reply = (interactive?.button_reply ?? interactive?.list_reply) as
    | { title?: string }
    | undefined;
  return reply?.title ?? "";
}

/** Status only ever moves forward: sent → delivered → read. */
const STATUS_RANK: Record<string, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

async function applyStatusUpdate(organizationId: string, status: MetaStatus) {
  const { data: message } = await supabaseAdmin
    .from("messages")
    .select("id, status")
    .eq("wamid", status.id)
    .maybeSingle();

  if (!message) return;

  if ((STATUS_RANK[status.status] ?? 0) <= (STATUS_RANK[message.status] ?? 0)) return;

  await supabaseAdmin
    .from("messages")
    .update({
      status: status.status,
      error: status.errors?.[0]
        ? {
            code: status.errors[0].code,
            title: status.errors[0].title,
            details: status.errors[0].message,
          }
        : null,
    })
    .eq("id", message.id);

  await supabaseAdmin
    .from("campaign_recipients")
    .update({ status: status.status })
    .eq("wamid", status.id);

  // A billable conversation is charged once, when Meta reports its category.
  if (status.pricing?.billable && status.pricing.category) {
    await chargeConversation(organizationId, message.id, status.pricing.category);
  }
}

async function chargeConversation(
  organizationId: string,
  messageId: string,
  category: string,
) {
  const normalized = category.toLowerCase().replace("_conversation", "");
  const validCategories = ["marketing", "utility", "authentication", "service"];
  if (!validCategories.includes(normalized)) return;

  const { data: existing } = await supabaseAdmin
    .from("credit_history")
    .select("id")
    .eq("message_id", messageId)
    .maybeSingle();

  if (existing) return;

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("wallet_balance, currency")
    .eq("id", organizationId)
    .maybeSingle();

  const { data: pricing } = await supabaseAdmin
    .from("message_pricing")
    .select("price, currency")
    .eq("category", normalized)
    .eq("country", "IN")
    .maybeSingle();

  const cost = Number(pricing?.price ?? 0);
  if (!org || cost <= 0) return;

  const balanceAfter = Number(org.wallet_balance) - cost;

  await supabaseAdmin.from("credit_history").insert({
    organization_id: organizationId,
    message_id: messageId,
    category: normalized,
    cost,
    currency: pricing?.currency ?? org.currency,
  });

  await supabaseAdmin.from("wallet_transactions").insert({
    organization_id: organizationId,
    type: "debit",
    amount: cost,
    balance_after: balanceAfter,
    reference: messageId,
    description: `${normalized} conversation`,
  });

  await supabaseAdmin
    .from("organizations")
    .update({ wallet_balance: balanceAfter })
    .eq("id", organizationId);
}

async function handleTemplateStatus(change: MetaChange) {
  const metaTemplateId = change.value.message_template_id;
  const event = change.value.event?.toLowerCase();
  if (!metaTemplateId || !event) return;

  const statusMap: Record<string, string> = {
    approved: "approved",
    rejected: "rejected",
    paused: "paused",
    disabled: "disabled",
    pending: "pending",
  };

  const status = statusMap[event];
  if (!status) return;

  await supabaseAdmin
    .from("templates")
    .update({ status, rejection_reason: change.value.reason ?? null })
    .eq("meta_template_id", String(metaTemplateId));
}

async function handleQualityUpdate(change: MetaChange) {
  const displayPhone = change.value.display_phone_number;
  if (!displayPhone) return;

  await supabaseAdmin
    .from("waba_accounts")
    .update({
      quality_rating: normalizeQualityRating(change.value.event),
      ...(change.value.current_limit && { messaging_tier: change.value.current_limit }),
    })
    .eq("display_phone", displayPhone);
}
