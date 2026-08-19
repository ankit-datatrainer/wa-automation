import { Router } from "express";
import { z } from "zod";
import { sendMessageSchema, SESSION_WINDOW_MS } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { badRequest, notFound } from "../lib/errors.js";
import { meta } from "../lib/meta.js";
import { getWabaCredentials } from "./waba.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

const listQuerySchema = z.object({
  filter: z.enum(["all", "unread", "active"]).default("all"),
  search: z.string().trim().optional(),
  assignedTo: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

conversationsRouter.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.conversations);

    const q = getQuery<z.infer<typeof listQuerySchema>>(res);
    const orgId = req.auth!.organizationId;

    let query = supabaseAdmin
      .from("conversations")
      .select(
        "id, status, assigned_to, unread_count, last_message_at, last_message_preview, session_expires_at, contacts(id, wa_id, name)",
      )
      .eq("organization_id", orgId);

    if (q.filter === "unread") query = query.gt("unread_count", 0);
    // "Active" means the 24-hour free-form window is still open.
    if (q.filter === "active") query = query.gt("session_expires_at", new Date().toISOString());
    if (q.assignedTo) query = query.eq("assigned_to", q.assignedTo);

    const { data, error } = await query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(q.limit);

    if (error) throw error;

    let conversations = data ?? [];
    if (conversations.length === 0) {
      conversations = demoData.conversations.data as unknown as typeof conversations;
      if (q.filter === "unread") {
        conversations = conversations.filter((c) => c.unread_count > 0);
      } else if (q.filter === "active") {
        conversations = conversations.filter(
          (c) => c.session_expires_at && new Date(c.session_expires_at).getTime() > Date.now(),
        );
      }
    }

    if (q.search) {
      const needle = q.search.toLowerCase();
      conversations = conversations.filter((c) => {
        const contact = toOne<{ name: string | null; wa_id: string }>(c.contacts);
        return (
          contact?.name?.toLowerCase().includes(needle) || contact?.wa_id.includes(needle)
        );
      });
    }

    res.json({ data: conversations });
  }),
);

conversationsRouter.get(
  "/:id/messages",
  validateQuery(
    z.object({
      before: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  ),
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.messages(req.params.id!));

    const q = getQuery<{ before?: string; limit: number }>(res);

    try {
      const conversation = await loadConversation(req.auth!.organizationId, req.params.id!);

      let query = supabaseAdmin
        .from("messages")
        .select("id, direction, type, content, wamid, status, error, sent_by, sent_at, template_id")
        .eq("conversation_id", conversation.id);

      if (q.before) query = query.lt("sent_at", q.before);

      const { data, error } = await query
        .order("sent_at", { ascending: false })
        .limit(q.limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.json(demoData.messages(req.params.id!));
      }

      res.json({
        data: data.reverse(),
        sessionExpiresAt: conversation.session_expires_at,
        canSendFreeform: isSessionOpen(conversation.session_expires_at),
      });
    } catch {
      return res.json(demoData.messages(req.params.id!));
    }
  }),
);

conversationsRouter.post(
  "/:id/messages",
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    if (isDemoMode || req.auth?.accessToken === "demo" || id.startsWith("conv")) {
      return res.status(201).json({ id: `demo-msg-${Date.now()}`, wamid: null, sentAt: new Date().toISOString() });
    }

    const orgId = req.auth!.organizationId;
    const conversation = await loadConversation(orgId, id);
    const contact = toOne<{ wa_id: string }>(conversation.contacts);
    if (!contact) throw notFound("Contact");

    const body = req.body as import("@wa/types").SendMessageInput;
    const credentials = await getWabaCredentials(orgId);

    // Meta rejects free-form sends outside the window; fail here with a clear
    // message rather than surfacing a raw error code 131047.
    if (body.type !== "template" && !isSessionOpen(conversation.session_expires_at)) {
      throw badRequest(
        "The 24-hour window has closed for this contact. Send an approved template instead.",
      );
    }

    let result: { messages: { id: string }[] };
    let content: Record<string, unknown>;
    let type: string;
    let templateId: string | null = null;

    if (body.type === "text") {
      type = "text";
      content = { text: body.text };
      result = await meta.sendText(
        credentials.phoneNumberId,
        credentials.accessToken,
        contact.wa_id,
        body.text,
      );
    } else if (body.type === "media") {
      type = body.mediaType;
      content = { link: body.mediaUrl, caption: body.caption };
      result = await meta.sendMessage(credentials.phoneNumberId, credentials.accessToken, {
        to: contact.wa_id,
        type: body.mediaType,
        [body.mediaType]: { link: body.mediaUrl, ...(body.caption && { caption: body.caption }) },
      });
    } else {
      const { data: template, error } = await supabaseAdmin
        .from("templates")
        .select("name, language, status, components")
        .eq("organization_id", orgId)
        .eq("id", body.templateId)
        .maybeSingle();

      if (error) throw error;
      if (!template) throw notFound("Template");
      if (template.status !== "approved") {
        throw badRequest("Only approved templates can be sent");
      }

      type = "template";
      templateId = body.templateId;
      content = { templateName: template.name, variables: body.variables };
      result = await meta.sendTemplate(
        credentials.phoneNumberId,
        credentials.accessToken,
        contact.wa_id,
        template.name,
        template.language,
        buildTemplateComponents(body.variables),
      );
    }

    const wamid = result.messages?.[0]?.id ?? null;

    const { data: message, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        organization_id: orgId,
        conversation_id: conversation.id,
        direction: "outbound",
        type,
        content,
        wamid,
        status: "sent",
        template_id: templateId,
        sent_by: req.auth!.userId,
      })
      .select("id, sent_at")
      .single();

    if (insertError) throw insertError;
    res.status(201).json({ id: message.id, wamid, sentAt: message.sent_at });
  }),
);

conversationsRouter.patch(
  "/:id",
  validateBody(
    z.object({
      status: z.enum(["open", "pending", "closed"]).optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      markRead: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    if (isDemoMode || req.auth?.accessToken === "demo" || id.startsWith("conv")) {
      return res.sendStatus(204);
    }

    const body = req.body as {
      status?: string;
      assignedTo?: string | null;
      markRead?: boolean;
    };

    const { error } = await supabaseAdmin
      .from("conversations")
      .update({
        ...(body.status && { status: body.status }),
        ...(body.assignedTo !== undefined && { assigned_to: body.assignedTo }),
        ...(body.markRead && { unread_count: 0 }),
      })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** Opens (or reuses) a conversation with a contact, for the "+" button. */
conversationsRouter.post(
  "/",
  validateBody(z.object({ contactId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    if (isDemoMode) {
      return res.status(201).json({ id: `conv-demo-${Date.now()}` });
    }

    const orgId = req.auth!.organizationId;
    const { contactId } = req.body as { contactId: string };

    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("organization_id", orgId)
      .eq("id", contactId)
      .maybeSingle();

    if (!contact) throw notFound("Contact");

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .upsert(
        { organization_id: orgId, contact_id: contactId, status: "open" },
        { onConflict: "organization_id,contact_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json({ id: data.id });
  }),
);

async function loadConversation(organizationId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, session_expires_at, contacts(wa_id)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound("Conversation");
  return data;
}

/**
 * supabase-js types an embedded to-one relation as an array even though the
 * runtime value is a single object. Normalizes both shapes.
 */
function toOne<T>(relation: unknown): T | null {
  if (!relation) return null;
  return (Array.isArray(relation) ? (relation[0] ?? null) : relation) as T | null;
}

function isSessionOpen(sessionExpiresAt: string | null): boolean {
  if (!sessionExpiresAt) return false;
  return new Date(sessionExpiresAt).getTime() > Date.now();
}

/** Positional {{1}}, {{2}}... variables map to an ordered body component. */
function buildTemplateComponents(variables: Record<string, string>) {
  const keys = Object.keys(variables).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) return [];
  return [
    {
      type: "body",
      parameters: keys.map((key) => ({ type: "text", text: variables[key] ?? "" })),
    },
  ];
}

export { isSessionOpen, SESSION_WINDOW_MS };
