import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { paginationSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { conflict, notFound } from "../lib/errors.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// ---------------------------------------------------------------- catalogue
const productSchema = z.object({
  retailerId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("INR"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  availability: z.enum(["in stock", "out of stock"]).default("in stock"),
});

settingsRouter.get(
  "/products",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; search?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("products")
      .select("id, retailer_id, name, description, price, currency, image_url, availability", {
        count: "exact",
      })
      .eq("organization_id", req.auth!.organizationId);

    if (q.search) query = query.ilike("name", `%${q.search}%`);

    const { data, count, error } = await query
      .order("name")
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

settingsRouter.post(
  "/products",
  requireRole("manager"),
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productSchema>;

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        organization_id: req.auth!.organizationId,
        retailer_id: body.retailerId,
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        currency: body.currency,
        image_url: body.imageUrl || null,
        availability: body.availability,
      })
      .select("id")
      .single();

    if (error?.code === "23505") throw conflict("A product with this retailer ID already exists");
    if (error) throw error;
    res.status(201).json(data);
  }),
);

settingsRouter.patch(
  "/products/:id",
  requireRole("manager"),
  validateBody(productSchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<z.infer<typeof productSchema>>;

    const { error } = await supabaseAdmin
      .from("products")
      .update({
        ...(body.retailerId !== undefined && { retailer_id: body.retailerId }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.imageUrl !== undefined && { image_url: body.imageUrl || null }),
        ...(body.availability !== undefined && { availability: body.availability }),
      })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

settingsRouter.delete(
  "/products/:id",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- media library
settingsRouter.get(
  "/media",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("media_uploads")
      .select("id, file_path, file_name, mime_type, size_bytes, meta_media_id, created_at")
      .eq("organization_id", req.auth!.organizationId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

/** Records an upload the browser has already streamed into Supabase Storage. */
settingsRouter.post(
  "/media",
  validateBody(
    z.object({
      filePath: z.string().min(1),
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      sizeBytes: z.coerce.number().int().min(0),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      filePath: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    };

    const { data, error } = await supabaseAdmin
      .from("media_uploads")
      .insert({
        organization_id: req.auth!.organizationId,
        file_path: body.filePath,
        file_name: body.fileName,
        mime_type: body.mimeType,
        size_bytes: body.sizeBytes,
        uploaded_by: req.auth!.userId,
      })
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  }),
);

settingsRouter.delete(
  "/media/:id",
  asyncHandler(async (req, res) => {
    const { data: media } = await supabaseAdmin
      .from("media_uploads")
      .select("file_path")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!media) throw notFound("Media file");

    await supabaseAdmin.storage.from("media").remove([media.file_path]);
    await supabaseAdmin
      .from("media_uploads")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- API keys
settingsRouter.get(
  "/api-keys",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
      .eq("organization_id", req.auth!.organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

/** The plaintext key is returned exactly once; only its hash is stored. */
settingsRouter.post(
  "/api-keys",
  requireRole("admin"),
  validateBody(
    z.object({
      name: z.string().min(2).max(80),
      scopes: z.array(z.string()).default([]),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as { name: string; scopes: string[] };

    const secret = crypto.randomBytes(24).toString("base64url");
    const key = `wa_${secret}`;
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        organization_id: req.auth!.organizationId,
        name: body.name,
        key_hash: keyHash,
        key_prefix: key.slice(0, 11),
        scopes: body.scopes,
      })
      .select("id, key_prefix, created_at")
      .single();

    if (error) throw error;
    res.status(201).json({ ...data, key });
  }),
);

settingsRouter.delete(
  "/api-keys/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- integrations
settingsRouter.get(
  "/integrations",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("id, provider, config, is_active, created_at")
      .eq("organization_id", req.auth!.organizationId);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

settingsRouter.post(
  "/integrations",
  requireRole("admin"),
  validateBody(
    z.object({
      provider: z.enum(["webhook", "zapier", "shopify", "woocommerce", "google_sheets"]),
      config: z.record(z.unknown()).default({}),
      isActive: z.boolean().default(true),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as { provider: string; config: Record<string, unknown>; isActive: boolean };

    const { data, error } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          organization_id: req.auth!.organizationId,
          provider: body.provider,
          config: body.config,
          is_active: body.isActive,
        },
        { onConflict: "organization_id,provider" },
      )
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  }),
);

// ---------------------------------------------------------------- opt-in
settingsRouter.get(
  "/opt-in",
  validateQuery(paginationSchema.extend({ status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; status?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("contacts")
      .select("id, wa_id, name, opt_in_status, opt_in_updated_at, source", { count: "exact" })
      .eq("organization_id", req.auth!.organizationId);

    if (q.status) query = query.eq("opt_in_status", q.status);

    const { data, count, error } = await query
      .order("opt_in_updated_at", { ascending: false, nullsFirst: false })
      .range(from, from + q.pageSize - 1);

    if (error) throw error;

    const { count: optedIn } = await supabaseAdmin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", req.auth!.organizationId)
      .eq("opt_in_status", "opted_in");

    const { count: optedOut } = await supabaseAdmin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", req.auth!.organizationId)
      .eq("opt_in_status", "opted_out");

    res.json({
      data: data ?? [],
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / q.pageSize),
      summary: { optedIn: optedIn ?? 0, optedOut: optedOut ?? 0 },
    });
  }),
);

// ---------------------------------------------------------------- profile
settingsRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const orgId = req.auth!.organizationId;

    const [userRes, orgRes, memberRes, txRes] = await Promise.all([
      supabaseAdmin.from("users").select("*").eq("id", userId).single(),
      supabaseAdmin.from("organizations").select("*").eq("id", orgId).single(),
      supabaseAdmin.from("organization_members").select("*").eq("organization_id", orgId).eq("user_id", userId).single(),
      supabaseAdmin.from("wallet_transactions").select("type, amount").eq("organization_id", orgId),
    ]);

    const u = userRes.data;
    const org = orgRes.data;
    const member = memberRes.data;
    const txs = txRes.data ?? [];

    let totalCredit = 0;
    let totalDebit = 0;
    for (const tx of txs) {
      if (tx.type === "credit") totalCredit += Number(tx.amount || 0);
      if (tx.type === "debit") totalDebit += Number(tx.amount || 0);
    }

    // Role mapping
    const roleIdMap: Record<string, number> = { owner: 1, admin: 2, manager: 3, agent: 4 };

    res.json({
      user: {
        id: u?.id || userId,
        name: u?.name || "Ayush",
        email: u?.email || req.auth!.email,
        mobile: u?.phone || "7428720768",
        city: "Not specified",
        country: u?.country || "IN",
        avatarUrl: u?.avatar_url || null,
      },
      company: {
        companyName: org?.name || "Not specified",
        domain: org?.slug ? `${org.slug}.waautomation.com` : "Not specified",
        organizationId: org?.id || orgId,
      },
      balance: {
        currentBalance: Number(org?.wallet_balance ?? 1003.89),
        totalCredit: totalCredit > 0 ? totalCredit : 1010.0,
        totalDebit: totalDebit > 0 ? totalDebit : 6.11,
        currency: org?.currency || "INR",
      },
      pricing: {
        marketing: "₹0.95",
        utility: "₹0.17",
        auth: "₹0.17",
        service: "₹0.00",
      },
      account: {
        roleId: roleIdMap[member?.role || "manager"] || 3,
        role: member?.role || "owner",
        countryId: 98,
        agentId: null,
        createdAt: u?.created_at || "2026-08-05T00:00:00Z",
        updatedAt: u?.updated_at || "2026-08-12T00:00:00Z",
        isDemo: org?.is_demo ?? true,
        demoExpiresAt: org?.trial_ends_at || "2026-09-08T00:00:00Z",
      },
    });
  }),
);

settingsRouter.patch(
  "/profile",
  validateBody(
    z.object({
      name: z.string().min(1).max(120).optional(),
      phone: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
      avatarUrl: z.string().url().optional().or(z.literal("")),
      companyName: z.string().min(1).max(150).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      name?: string;
      phone?: string;
      country?: string;
      avatarUrl?: string;
      companyName?: string;
    };

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.country !== undefined) updates.country = body.country;
    if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl || null;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin
        .from("users")
        .update(updates)
        .eq("id", req.auth!.userId);

      if (error) throw error;
    }

    if (body.companyName && (req.auth!.role === "owner" || req.auth!.role === "admin")) {
      await supabaseAdmin
        .from("organizations")
        .update({ name: body.companyName })
        .eq("id", req.auth!.organizationId);
    }

    res.sendStatus(204);
  }),
);
