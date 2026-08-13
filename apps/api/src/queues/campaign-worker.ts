import { Worker, type Job } from "bullmq";
import { MESSAGING_TIERS, type MessagingTier } from "@wa/types";
import { isRedisAvailable, QUEUE_NAMES, redisConnection } from "./connection.js";
import type { CampaignJob } from "./campaign-queue.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { decrypt } from "../lib/crypto.js";
import { meta } from "../lib/meta.js";
import { logger } from "../lib/logger.js";

const BATCH_SIZE = 100;

/** Meta's documented ceiling is 80 messages/second; stay comfortably under it. */
const MESSAGES_PER_SECOND = 20;

interface RecipientRow {
  id: string;
  contact_id: string;
  variables: Record<string, string>;
  contacts: { wa_id: string; name: string | null } | { wa_id: string; name: string | null }[] | null;
}

/** Returns null when Redis is absent; campaigns then run in-process instead. */
export function startCampaignWorker() {
  if (!isRedisAvailable()) {
    logger.warn("Campaign worker not started — Redis unavailable");
    return null;
  }

  const worker = new Worker<CampaignJob>(
    QUEUE_NAMES.campaign,
    async (job) => processCampaign(job),
    {
      connection: redisConnection,
      concurrency: 2,
      limiter: { max: MESSAGES_PER_SECOND, duration: 1000 },
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Campaign job failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Campaign job completed");
  });

  return worker;
}

async function processCampaign(job: Job<CampaignJob>) {
  const { campaignId, organizationId } = job.data;
  await runCampaign(campaignId, organizationId, (pct) => job.updateProgress(pct));
}

/**
 * Sends a campaign end to end.
 *
 * Exported so it can be driven either by the BullMQ worker or, when Redis is
 * unavailable, directly in-process — the delivery logic must not differ
 * between the two paths.
 */
export async function runCampaign(
  campaignId: string,
  organizationId: string,
  onProgress: (percent: number) => unknown = () => undefined,
) {

  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("id, status, template_id, variable_mapping, stats, templates(name, language, status)")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  if (campaign.status !== "running") {
    logger.info({ campaignId, status: campaign.status }, "Campaign is not running; skipping");
    return;
  }

  const template = toOne<{ name: string; language: string; status: string }>(campaign.templates);
  if (!template || template.status !== "approved") {
    await failCampaign(campaignId, "Template is no longer approved");
    return;
  }

  const { data: waba } = await supabaseAdmin
    .from("waba_accounts")
    .select("phone_number_id, access_token_encrypted, messaging_tier")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!waba) {
    await failCampaign(campaignId, "WhatsApp is not connected");
    return;
  }

  const accessToken = decrypt(waba.access_token_encrypted);
  const tierLimit = MESSAGING_TIERS[(waba.messaging_tier ?? "TIER_250") as MessagingTier] ?? 250;
  const remainingToday = await remainingDailyAllowance(organizationId, tierLimit);

  if (remainingToday <= 0) {
    logger.warn({ campaignId }, "Daily messaging limit reached; pausing campaign");
    await supabaseAdmin.from("campaigns").update({ status: "paused" }).eq("id", campaignId);
    return;
  }

  const mapping = (campaign.variable_mapping ?? {}) as Record<string, string>;
  let sent = 0;
  let failed = 0;
  let processed = 0;

  while (processed < remainingToday) {
    // Re-read status each batch so a pause or cancel takes effect promptly.
    const { data: current } = await supabaseAdmin
      .from("campaigns")
      .select("status")
      .eq("id", campaignId)
      .maybeSingle();

    if (current?.status !== "running") {
      logger.info({ campaignId, status: current?.status }, "Campaign halted mid-send");
      break;
    }

    const { data: batch } = await supabaseAdmin
      .from("campaign_recipients")
      .select("id, contact_id, variables, contacts(wa_id, name)")
      .eq("campaign_id", campaignId)
      .eq("status", "queued")
      .limit(Math.min(BATCH_SIZE, remainingToday - processed));

    const recipients = (batch ?? []) as RecipientRow[];
    if (recipients.length === 0) break;

    for (const recipient of recipients) {
      const contact = toOne<{ wa_id: string; name: string | null }>(recipient.contacts);
      if (!contact) continue;

      try {
        const result = await meta.sendTemplate(
          waba.phone_number_id,
          accessToken,
          contact.wa_id,
          template.name,
          template.language,
          buildComponents(mapping, recipient.variables, contact),
        );

        const wamid = result.messages?.[0]?.id ?? null;

        await supabaseAdmin
          .from("campaign_recipients")
          .update({ status: "sent", wamid, sent_at: new Date().toISOString() })
          .eq("id", recipient.id);

        await recordOutboundMessage(organizationId, campaignId, recipient.contact_id, {
          templateId: campaign.template_id,
          templateName: template.name,
          wamid,
        });

        sent++;
      } catch (err) {
        failed++;
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "failed",
            error: { message: err instanceof Error ? err.message : String(err) },
          })
          .eq("id", recipient.id);
      }

      processed++;
      await onProgress(Math.round((processed / remainingToday) * 100));
    }

    await bumpStats(campaignId, sent, failed);
    sent = 0;
    failed = 0;
  }

  const { count: pending } = await supabaseAdmin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  if ((pending ?? 0) === 0) {
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
  }
}

/** Business-initiated conversations already used in the current 24-hour window. */
async function remainingDailyAllowance(organizationId: string, tierLimit: number) {
  if (!Number.isFinite(tierLimit)) return Number.MAX_SAFE_INTEGER;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("direction", "outbound")
    .eq("type", "template")
    .gte("sent_at", since);

  return Math.max(0, tierLimit - (count ?? 0));
}

async function recordOutboundMessage(
  organizationId: string,
  campaignId: string,
  contactId: string,
  details: { templateId: string; templateName: string; wamid: string | null },
) {
  const { data: conversation } = await supabaseAdmin
    .from("conversations")
    .upsert(
      { organization_id: organizationId, contact_id: contactId, status: "open" },
      { onConflict: "organization_id,contact_id" },
    )
    .select("id")
    .single();

  if (!conversation) return;

  await supabaseAdmin.from("messages").insert({
    organization_id: organizationId,
    conversation_id: conversation.id,
    direction: "outbound",
    type: "template",
    content: { templateName: details.templateName },
    wamid: details.wamid,
    status: "sent",
    template_id: details.templateId,
    campaign_id: campaignId,
  });
}

async function bumpStats(campaignId: string, sent: number, failed: number) {
  if (sent === 0 && failed === 0) return;

  const { data } = await supabaseAdmin
    .from("campaigns")
    .select("stats")
    .eq("id", campaignId)
    .maybeSingle();

  const stats = (data?.stats ?? {}) as Record<string, number>;

  await supabaseAdmin
    .from("campaigns")
    .update({
      stats: {
        ...stats,
        sent: (stats.sent ?? 0) + sent,
        failed: (stats.failed ?? 0) + failed,
      },
    })
    .eq("id", campaignId);
}

async function failCampaign(campaignId: string, reason: string) {
  logger.error({ campaignId, reason }, "Campaign failed");
  await supabaseAdmin
    .from("campaigns")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", campaignId);
}

/**
 * Builds the body parameters for one recipient. Each {{n}} resolves from the
 * campaign's mapping: a `contact.<field>` reference, or a literal.
 */
function buildComponents(
  mapping: Record<string, string>,
  overrides: Record<string, string>,
  contact: { wa_id: string; name: string | null },
) {
  const keys = Object.keys(mapping).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) return [];

  return [
    {
      type: "body",
      parameters: keys.map((key) => {
        const source = mapping[key] ?? "";
        const value =
          overrides[key] ??
          (source === "contact.name"
            ? (contact.name ?? "there")
            : source === "contact.phone"
              ? contact.wa_id
              : source);
        return { type: "text", text: value };
      }),
    },
  ];
}

function toOne<T>(relation: unknown): T | null {
  if (!relation) return null;
  return (Array.isArray(relation) ? (relation[0] ?? null) : relation) as T | null;
}
