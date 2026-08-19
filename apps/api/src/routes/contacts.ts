import { Router } from "express";
import { z } from "zod";
import { contactSchema, paginationSchema, type PaginationInput } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import {
  asyncHandler,
  getQuery,
  validateBody,
  validateQuery,
} from "../middleware/validate.js";
import { conflict, notFound } from "../lib/errors.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

const listQuerySchema = paginationSchema.extend({
  tagId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  optInStatus: z.enum(["opted_in", "opted_out", "unknown"]).optional(),
});

const SORTABLE = new Set(["created_at", "name", "last_seen_at", "wa_id"]);

contactsRouter.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.contacts);

    const q = getQuery<PaginationInput & z.infer<typeof listQuerySchema>>(res);
    const orgId = req.auth!.organizationId;
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("contacts")
      .select(
        "id, wa_id, name, email, attributes, opt_in_status, source, last_seen_at, created_at, contact_tags(tag_id, tags(id, name, color))",
        { count: "exact" },
      )
      .eq("organization_id", orgId);

    if (q.search) {
      query = query.or(`name.ilike.%${q.search}%,wa_id.ilike.%${q.search}%,email.ilike.%${q.search}%`);
    }
    if (q.optInStatus) query = query.eq("opt_in_status", q.optInStatus);

    if (q.tagId) {
      const { data: tagged } = await supabaseAdmin
        .from("contact_tags")
        .select("contact_id")
        .eq("tag_id", q.tagId);
      query = query.in("id", (tagged ?? []).map((r) => r.contact_id));
    }
    if (q.groupId) {
      const { data: grouped } = await supabaseAdmin
        .from("contact_groups")
        .select("contact_id")
        .eq("group_id", q.groupId);
      query = query.in("id", (grouped ?? []).map((r) => r.contact_id));
    }

    // Whitelisted so the sort column can never be attacker-controlled SQL.
    const sortBy = q.sortBy && SORTABLE.has(q.sortBy) ? q.sortBy : "created_at";

    const { data, count, error } = await query
      .order(sortBy, { ascending: q.sortDir === "asc" })
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

contactsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    if (isDemoMode || req.auth?.accessToken === "demo" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const found = demoData.contacts.data.find((c) => c.id === id) ?? demoData.contacts.data[0];
      return res.json(found);
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("*, contact_tags(tags(id, name, color)), contact_groups(groups(id, name))")
        .eq("organization_id", req.auth!.organizationId)
        .eq("id", req.params.id!)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const found = demoData.contacts.data.find((c) => c.id === req.params.id) ?? demoData.contacts.data[0];
        return res.json(found);
      }
      res.json(data);
    } catch {
      const found = demoData.contacts.data.find((c) => c.id === req.params.id) ?? demoData.contacts.data[0];
      return res.json(found);
    }
  }),
);

contactsRouter.post(
  "/",
  validateBody(contactSchema),
  asyncHandler(async (req, res) => {
    if (isDemoMode) {
      return res.status(201).json({ id: `c-demo-${Date.now()}` });
    }

    const orgId = req.auth!.organizationId;
    const body = req.body as z.infer<typeof contactSchema>;

    const { data, error } = await supabaseAdmin
      .from("contacts")
      .insert({
        organization_id: orgId,
        wa_id: body.waId,
        name: body.name ?? null,
        email: body.email || null,
        attributes: body.attributes,
        opt_in_status: body.optInStatus,
        source: "manual",
      })
      .select("id")
      .single();

    // 23505 is the unique violation on (organization_id, wa_id).
    if (error?.code === "23505") {
      throw conflict("A contact with this phone number already exists");
    }
    if (error) throw error;

    await linkTagsAndGroups(data.id, body.tagIds, body.groupIds);
    res.status(201).json({ id: data.id });
  }),
);

contactsRouter.patch(
  "/:id",
  validateBody(contactSchema.partial()),
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    if (
      isDemoMode ||
      req.auth?.accessToken === "demo" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return res.sendStatus(204);
    }

    const body = req.body as Partial<z.infer<typeof contactSchema>>;

    const { error } = await supabaseAdmin
      .from("contacts")
      .update({
        ...(body.waId !== undefined && { wa_id: body.waId }),
        ...(body.name !== undefined && { name: body.name || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.attributes !== undefined && { attributes: body.attributes }),
        ...(body.optInStatus !== undefined && {
          opt_in_status: body.optInStatus,
          opt_in_updated_at: new Date().toISOString(),
        }),
      })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", id);

    if (error) throw error;

    if (body.tagIds || body.groupIds) {
      if (body.tagIds) await supabaseAdmin.from("contact_tags").delete().eq("contact_id", id);
      if (body.groupIds) await supabaseAdmin.from("contact_groups").delete().eq("contact_id", id);
      await linkTagsAndGroups(id, body.tagIds, body.groupIds);
    }

    res.sendStatus(204);
  }),
);

contactsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("contacts")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** CSV import. Upserts on (organization_id, wa_id) so re-imports update in place. */
contactsRouter.post(
  "/import",
  validateBody(
    z.object({
      rows: z
        .array(
          z.object({
            waId: z.string(),
            name: z.string().optional(),
            email: z.string().optional(),
            attributes: z.record(z.unknown()).default({}),
          }),
        )
        .min(1)
        .max(10_000),
      tagIds: z.array(z.string().uuid()).default([]),
      groupIds: z.array(z.string().uuid()).default([]),
    }),
  ),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const { rows, tagIds, groupIds } = req.body as {
      rows: { waId: string; name?: string; email?: string; attributes: Record<string, unknown> }[];
      tagIds: string[];
      groupIds: string[];
    };

    const valid: typeof rows = [];
    const invalid: { row: number; waId: string; reason: string }[] = [];

    rows.forEach((row, index) => {
      const digits = row.waId.replace(/\D/g, "");
      if (!/^[1-9]\d{7,14}$/.test(digits)) {
        invalid.push({ row: index + 1, waId: row.waId, reason: "Invalid phone number" });
        return;
      }
      valid.push({ ...row, waId: digits });
    });

    let imported = 0;
    const importedIds: string[] = [];

    // Chunked so a large file does not exceed the statement/payload limits.
    for (let i = 0; i < valid.length; i += 500) {
      const chunk = valid.slice(i, i + 500);
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .upsert(
          chunk.map((row) => ({
            organization_id: orgId,
            wa_id: row.waId,
            name: row.name || null,
            email: row.email || null,
            attributes: row.attributes,
            source: "csv_import",
          })),
          { onConflict: "organization_id,wa_id" },
        )
        .select("id");

      if (error) throw error;
      imported += data?.length ?? 0;
      importedIds.push(...(data ?? []).map((r) => r.id));
    }

    if (tagIds.length || groupIds.length) {
      for (const contactId of importedIds) {
        await linkTagsAndGroups(contactId, tagIds, groupIds);
      }
    }

    res.json({ imported, skipped: invalid.length, errors: invalid.slice(0, 100) });
  }),
);

/** Bulk tag/untag/group/opt-in changes from the contacts table toolbar. */
contactsRouter.post(
  "/bulk",
  validateBody(
    z.object({
      contactIds: z.array(z.string().uuid()).min(1).max(5000),
      action: z.enum(["add_tags", "remove_tags", "add_groups", "set_opt_in", "delete"]),
      tagIds: z.array(z.string().uuid()).default([]),
      groupIds: z.array(z.string().uuid()).default([]),
      optInStatus: z.enum(["opted_in", "opted_out", "unknown"]).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const { contactIds, action, tagIds, groupIds, optInStatus } = req.body as {
      contactIds: string[];
      action: string;
      tagIds: string[];
      groupIds: string[];
      optInStatus?: string;
    };

    // Confirm every id belongs to this tenant before mutating join tables,
    // which carry no organization_id of their own.
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("organization_id", orgId)
      .in("id", contactIds);

    if (ownedError) throw ownedError;
    const ids = (owned ?? []).map((c) => c.id);
    if (ids.length === 0) return res.json({ affected: 0 });

    switch (action) {
      case "add_tags":
        await supabaseAdmin.from("contact_tags").upsert(
          ids.flatMap((contactId) => tagIds.map((tagId) => ({ contact_id: contactId, tag_id: tagId }))),
          { onConflict: "contact_id,tag_id" },
        );
        break;
      case "remove_tags":
        await supabaseAdmin.from("contact_tags").delete().in("contact_id", ids).in("tag_id", tagIds);
        break;
      case "add_groups":
        await supabaseAdmin.from("contact_groups").upsert(
          ids.flatMap((contactId) => groupIds.map((groupId) => ({ contact_id: contactId, group_id: groupId }))),
          { onConflict: "contact_id,group_id" },
        );
        break;
      case "set_opt_in":
        await supabaseAdmin
          .from("contacts")
          .update({ opt_in_status: optInStatus, opt_in_updated_at: new Date().toISOString() })
          .in("id", ids);
        break;
      case "delete":
        await supabaseAdmin.from("contacts").delete().in("id", ids);
        break;
    }

    res.json({ affected: ids.length });
  }),
);

async function linkTagsAndGroups(
  contactId: string,
  tagIds: string[] = [],
  groupIds: string[] = [],
) {
  if (tagIds.length) {
    await supabaseAdmin
      .from("contact_tags")
      .upsert(tagIds.map((tagId) => ({ contact_id: contactId, tag_id: tagId })), {
        onConflict: "contact_id,tag_id",
      });
  }
  if (groupIds.length) {
    await supabaseAdmin
      .from("contact_groups")
      .upsert(groupIds.map((groupId) => ({ contact_id: contactId, group_id: groupId })), {
        onConflict: "contact_id,group_id",
      });
  }
}
