import { Router } from "express";
import { z } from "zod";
import { paginationSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getWabaCredentials } from "./waba.js";
import {
  sendCatalogMessage,
  sendMultiProductMessage,
  sendProductMessage,
  syncCatalogToMeta,
  verifyCatalog,
} from "../services/commerce.js";

export const commerceRouter = Router();

commerceRouter.use(requireAuth);

// ---------------------------------------------------------------- catalog link
commerceRouter.get(
  "/catalog",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("catalogs")
      .select("id, meta_catalog_id, name, product_count, last_synced_at, is_default")
      .eq("organization_id", req.auth!.organizationId)
      .eq("is_default", true)
      .maybeSingle();

    if (error) throw error;
    res.json({ data: data ?? null });
  }),
);

/** Links a Meta Commerce catalog, validating it against the Graph API first. */
commerceRouter.post(
  "/catalog",
  requireRole("manager"),
  validateBody(z.object({ metaCatalogId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const { metaCatalogId } = req.body as { metaCatalogId: string };

    const credentials = await getWabaCredentials(orgId);
    const remote = await verifyCatalog(metaCatalogId, credentials.accessToken);

    // Only one default catalog per org, so clear any previous one first.
    await supabaseAdmin
      .from("catalogs")
      .update({ is_default: false })
      .eq("organization_id", orgId);

    const { data, error } = await supabaseAdmin
      .from("catalogs")
      .upsert(
        {
          organization_id: orgId,
          meta_catalog_id: remote.id,
          name: remote.name,
          product_count: remote.productCount,
          is_default: true,
        },
        { onConflict: "organization_id" },
      )
      .select("id, meta_catalog_id, name, product_count")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  }),
);

/** Pushes every local product up to the linked Meta catalog. */
commerceRouter.post(
  "/catalog/sync",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;

    const { data: catalog } = await supabaseAdmin
      .from("catalogs")
      .select("meta_catalog_id")
      .eq("organization_id", orgId)
      .eq("is_default", true)
      .maybeSingle();

    if (!catalog?.meta_catalog_id) {
      throw badRequest("Link a Meta Commerce catalog before syncing");
    }

    const credentials = await getWabaCredentials(orgId);
    const result = await syncCatalogToMeta(orgId, catalog.meta_catalog_id, credentials.accessToken);

    await supabaseAdmin
      .from("catalogs")
      .update({ last_synced_at: new Date().toISOString(), product_count: result.synced })
      .eq("organization_id", orgId)
      .eq("is_default", true);

    res.json(result);
  }),
);

// ---------------------------------------------------------------- send products
const sendSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("product"),
    conversationId: z.string().uuid(),
    retailerId: z.string().min(1),
    body: z.string().max(1024).optional(),
  }),
  z.object({
    type: z.literal("product_list"),
    conversationId: z.string().uuid(),
    header: z.string().min(1).max(60),
    body: z.string().min(1).max(1024),
    sections: z
      .array(z.object({ title: z.string().min(1).max(24), retailerIds: z.array(z.string()).min(1) }))
      .min(1),
  }),
  z.object({
    type: z.literal("catalog"),
    conversationId: z.string().uuid(),
    body: z.string().min(1).max(1024),
    thumbnailRetailerId: z.string().optional(),
  }),
]);

commerceRouter.post(
  "/send",
  validateBody(sendSchema),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const body = req.body as z.infer<typeof sendSchema>;

    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id, session_expires_at, contacts(wa_id)")
      .eq("organization_id", orgId)
      .eq("id", body.conversationId)
      .maybeSingle();

    if (!conversation) throw notFound("Conversation");

    const contact = Array.isArray(conversation.contacts)
      ? conversation.contacts[0]
      : (conversation.contacts as { wa_id: string } | null);
    if (!contact) throw notFound("Contact");

    // Interactive product messages are free-form, so the window must be open.
    const open =
      conversation.session_expires_at &&
      new Date(conversation.session_expires_at).getTime() > Date.now();
    if (!open) {
      throw badRequest(
        "The 24-hour window has closed for this contact. Send an approved template first.",
      );
    }

    const { data: catalog } = await supabaseAdmin
      .from("catalogs")
      .select("meta_catalog_id")
      .eq("organization_id", orgId)
      .eq("is_default", true)
      .maybeSingle();

    if (!catalog?.meta_catalog_id) throw badRequest("Link a Meta Commerce catalog first");

    const credentials = await getWabaCredentials(orgId);
    const catalogId = catalog.meta_catalog_id;

    let result: { messages: { id: string }[] };
    let content: Record<string, unknown>;

    if (body.type === "product") {
      result = await sendProductMessage(
        credentials.phoneNumberId,
        credentials.accessToken,
        contact.wa_id,
        catalogId,
        body.retailerId,
        body.body,
      );
      content = { text: body.body ?? "Product", retailerId: body.retailerId };
    } else if (body.type === "product_list") {
      result = await sendMultiProductMessage(
        credentials.phoneNumberId,
        credentials.accessToken,
        contact.wa_id,
        catalogId,
        body.sections,
        body.header,
        body.body,
      );
      content = { text: body.body, sections: body.sections };
    } else {
      result = await sendCatalogMessage(
        credentials.phoneNumberId,
        credentials.accessToken,
        contact.wa_id,
        body.body,
        body.thumbnailRetailerId,
      );
      content = { text: body.body };
    }

    const { data: message, error } = await supabaseAdmin
      .from("messages")
      .insert({
        organization_id: orgId,
        conversation_id: conversation.id,
        direction: "outbound",
        type: "interactive",
        content: { ...content, interactiveType: body.type },
        wamid: result.messages?.[0]?.id ?? null,
        status: "sent",
        sent_by: req.auth!.userId,
      })
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json({ id: message.id });
  }),
);

// ---------------------------------------------------------------- orders
commerceRouter.get(
  "/orders",
  validateQuery(paginationSchema.extend({ status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; status?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, items, total, currency, status, note, created_at, contacts(wa_id, name)",
        { count: "exact" },
      )
      .eq("organization_id", req.auth!.organizationId);

    if (q.status) query = query.eq("status", q.status);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + q.pageSize - 1);

    if (error) throw error;

    res.json({
      data: data ?? [],
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / q.pageSize),
    });
  }),
);

commerceRouter.patch(
  "/orders/:id",
  validateBody(
    z.object({
      status: z.enum([
        "placed",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ]),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { error, count } = await supabaseAdmin
      .from("orders")
      .update({ status: (req.body as { status: string }).status }, { count: "exact" })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    if (count === 0) throw notFound("Order");
    res.sendStatus(204);
  }),
);

/** Revenue summary for the orders page header. */
commerceRouter.get(
  "/orders/summary",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("total, currency, status")
      .eq("organization_id", req.auth!.organizationId);

    if (error) throw error;

    const orders = data ?? [];
    // Cancelled orders are excluded from revenue but still counted as orders.
    const active = orders.filter((o) => o.status !== "cancelled");

    res.json({
      totalOrders: orders.length,
      openOrders: orders.filter((o) => ["placed", "confirmed", "processing"].includes(o.status))
        .length,
      revenue: active.reduce((sum, o) => sum + Number(o.total), 0),
      currency: orders[0]?.currency ?? "INR",
    });
  }),
);
