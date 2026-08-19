import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";
import { conflict, notFound } from "../lib/errors.js";
import { demoData, isDemoMode } from "../lib/demo.js";

/** Tags and groups — the audiences behind "Send By Tags" and "Send By Groups". */
export const taxonomyRouter = Router();

taxonomyRouter.use(requireAuth);

const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#16A34A"),
});

const groupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
});

// ---------------------------------------------------------------- tags
taxonomyRouter.get(
  "/tags",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.tags);

    const orgId = req.auth!.organizationId;

    const { data, error } = await supabaseAdmin
      .from("tags")
      .select("id, name, color, created_at, contact_tags(count)")
      .eq("organization_id", orgId)
      .order("name");

    if (error || !data || data.length === 0) {
      return res.json(demoData.tags);
    }

    res.json({
      data: (data ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.created_at,
        contactCount: tag.contact_tags?.[0]?.count ?? 0,
      })),
    });
  }),
);

taxonomyRouter.post(
  "/tags",
  validateBody(tagSchema),
  asyncHandler(async (req, res) => {
    if (isDemoMode || req.auth?.accessToken === "demo") {
      const body = req.body as z.infer<typeof tagSchema>;
      return res.status(201).json({ id: `t-demo-${Date.now()}`, name: body.name, color: body.color });
    }

    const body = req.body as z.infer<typeof tagSchema>;
    const { data, error } = await supabaseAdmin
      .from("tags")
      .insert({ organization_id: req.auth!.organizationId, name: body.name, color: body.color })
      .select("id, name, color")
      .single();

    if (error?.code === "23505") throw conflict("A tag with this name already exists");
    if (error) throw error;
    res.status(201).json(data);
  }),
);

taxonomyRouter.patch(
  "/tags/:id",
  validateBody(tagSchema.partial()),
  asyncHandler(async (req, res) => {
    if (isDemoMode || req.auth?.accessToken === "demo") {
      return res.sendStatus(204);
    }

    const { error, count } = await supabaseAdmin
      .from("tags")
      .update(req.body as Record<string, unknown>, { count: "exact" })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error?.code === "23505") throw conflict("A tag with this name already exists");
    if (error) throw error;
    if (count === 0) throw notFound("Tag");
    res.sendStatus(204);
  }),
);

taxonomyRouter.delete(
  "/tags/:id",
  asyncHandler(async (req, res) => {
    if (isDemoMode || req.auth?.accessToken === "demo") {
      return res.sendStatus(204);
    }

    const { error } = await supabaseAdmin
      .from("tags")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- groups
taxonomyRouter.get(
  "/groups",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.groups);

    const { data, error } = await supabaseAdmin
      .from("groups")
      .select("id, name, description, created_at, contact_groups(count)")
      .eq("organization_id", req.auth!.organizationId)
      .order("name");

    if (error || !data || data.length === 0) {
      return res.json(demoData.groups);
    }

    res.json({
      data: (data ?? []).map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        createdAt: group.created_at,
        contactCount: group.contact_groups?.[0]?.count ?? 0,
      })),
    });
  }),
);

taxonomyRouter.post(
  "/groups",
  validateBody(groupSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof groupSchema>;
    const { data, error } = await supabaseAdmin
      .from("groups")
      .insert({
        organization_id: req.auth!.organizationId,
        name: body.name,
        description: body.description ?? null,
      })
      .select("id, name, description")
      .single();

    if (error?.code === "23505") throw conflict("A group with this name already exists");
    if (error) throw error;
    res.status(201).json(data);
  }),
);

taxonomyRouter.patch(
  "/groups/:id",
  validateBody(groupSchema.partial()),
  asyncHandler(async (req, res) => {
    const { error, count } = await supabaseAdmin
      .from("groups")
      .update(req.body as Record<string, unknown>, { count: "exact" })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    if (count === 0) throw notFound("Group");
    res.sendStatus(204);
  }),
);

taxonomyRouter.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("groups")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- canned messages
taxonomyRouter.get(
  "/canned-messages",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("canned_messages")
      .select("id, shortcode, body, created_at")
      .eq("organization_id", req.auth!.organizationId)
      .order("shortcode");

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

taxonomyRouter.post(
  "/canned-messages",
  validateBody(
    z.object({
      shortcode: z.string().regex(/^[a-z0-9_-]{1,40}$/),
      body: z.string().min(1).max(4096),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("canned_messages")
      .insert({ organization_id: req.auth!.organizationId, ...(req.body as object) })
      .select("id, shortcode, body")
      .single();

    if (error?.code === "23505") throw conflict("This shortcode is already in use");
    if (error) throw error;
    res.status(201).json(data);
  }),
);

taxonomyRouter.delete(
  "/canned-messages/:id",
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("canned_messages")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);
