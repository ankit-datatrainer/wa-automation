import { Router } from "express";
import { z } from "zod";
import { paginationSchema, templateSchema, type TemplateInput } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { conflict, notFound } from "../lib/errors.js";
import { meta, type TemplateComponentPayload } from "../lib/meta.js";
import { getWabaCredentials } from "./waba.js";
import { logger } from "../lib/logger.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const templatesRouter = Router();

templatesRouter.use(requireAuth);

/** Shared starter templates for the Template Library page. */
templatesRouter.get(
  "/library",
  asyncHandler(async (_req, res) => {
    if (isDemoMode) return res.json(demoData.templateLibrary);

    const { data, error } = await supabaseAdmin
      .from("template_library")
      .select("id, title, description, industry, language, category, components")
      .order("title");

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

templatesRouter.get(
  "/",
  validateQuery(
    paginationSchema.extend({
      status: z.string().optional(),
      category: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.templates);

    const q = getQuery<{
      page: number;
      pageSize: number;
      search?: string;
      status?: string;
      category?: string;
    }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("templates")
      .select(
        "id, name, language, category, components, status, rejection_reason, meta_template_id, created_at",
        { count: "exact" },
      )
      .eq("organization_id", req.auth!.organizationId);

    if (q.search) query = query.ilike("name", `%${q.search}%`);
    if (q.status) query = query.eq("status", q.status);
    if (q.category) query = query.eq("category", q.category);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + q.pageSize - 1);

    if (error) throw error;

    if (!data || data.length === 0) {
      let tpls = demoData.templates.data;
      if (q.status) tpls = tpls.filter((t) => t.status === q.status);
      if (q.category) tpls = tpls.filter((t) => t.category === q.category);
      if (q.search) tpls = tpls.filter((t) => t.name.toLowerCase().includes(q.search!.toLowerCase()));
      return res.json({
        data: tpls,
        page: q.page,
        pageSize: q.pageSize,
        total: tpls.length,
        totalPages: 1,
      });
    }

    res.json({
      data: data ?? [],
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / q.pageSize),
    });
  }),
);

templatesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound("Template");
    res.json(data);
  }),
);

/** Saves a draft locally; submission to Meta is a separate, explicit step. */
templatesRouter.post(
  "/",
  requireRole("manager"),
  validateBody(templateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as TemplateInput;

    const { data, error } = await supabaseAdmin
      .from("templates")
      .insert({
        organization_id: req.auth!.organizationId,
        name: body.name,
        language: body.language,
        category: body.category,
        components: body.components,
        status: "draft",
        created_by: req.auth!.userId,
      })
      .select("id")
      .single();

    if (error?.code === "23505") {
      throw conflict("A template with this name and language already exists");
    }
    if (error) throw error;
    res.status(201).json(data);
  }),
);

templatesRouter.patch(
  "/:id",
  requireRole("manager"),
  validateBody(templateSchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<TemplateInput>;

    // Meta templates are immutable once submitted; only drafts may be edited.
    const { data: existing } = await supabaseAdmin
      .from("templates")
      .select("status")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!existing) throw notFound("Template");
    if (existing.status !== "draft" && existing.status !== "rejected") {
      throw conflict("Only draft or rejected templates can be edited");
    }

    const { error } = await supabaseAdmin
      .from("templates")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.language !== undefined && { language: body.language }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.components !== undefined && { components: body.components }),
      })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** Submits the template to Meta for review. Status then arrives by webhook. */
templatesRouter.post(
  "/:id/submit",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;

    const { data: template, error } = await supabaseAdmin
      .from("templates")
      .select("id, name, language, category, components, status")
      .eq("organization_id", orgId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (error) throw error;
    if (!template) throw notFound("Template");
    if (template.status === "approved" || template.status === "pending") {
      throw conflict("This template has already been submitted");
    }

    const credentials = await getWabaCredentials(orgId);

    const result = await meta.createTemplate(credentials.wabaId, credentials.accessToken, {
      name: template.name,
      language: template.language,
      category: template.category,
      components: toMetaComponents(template.components as TemplateInput["components"]),
    });

    await supabaseAdmin
      .from("templates")
      .update({
        meta_template_id: result.id,
        status: (result.status ?? "PENDING").toLowerCase(),
        rejection_reason: null,
      })
      .eq("id", template.id);

    res.json({ metaTemplateId: result.id, status: result.status });
  }),
);

/** Pulls current statuses from Meta, covering any webhook we missed. */
templatesRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const credentials = await getWabaCredentials(orgId);
    const remote = await meta.listTemplates(credentials.wabaId, credentials.accessToken);

    let updated = 0;
    for (const item of remote.data ?? []) {
      const { error, count } = await supabaseAdmin
        .from("templates")
        .update(
          {
            status: item.status.toLowerCase(),
            meta_template_id: item.id,
            rejection_reason: item.rejected_reason ?? null,
          },
          { count: "exact" },
        )
        .eq("organization_id", orgId)
        .eq("name", item.name)
        .eq("language", item.language);

      if (error) logger.warn({ err: error, template: item.name }, "Template sync failed");
      updated += count ?? 0;
    }

    res.json({ synced: updated, remoteTotal: remote.data?.length ?? 0 });
  }),
);

templatesRouter.delete(
  "/:id",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;

    const { data: template } = await supabaseAdmin
      .from("templates")
      .select("name, meta_template_id")
      .eq("organization_id", orgId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!template) throw notFound("Template");

    // Best-effort remote delete: a template already gone from Meta should not
    // block removing our local record.
    if (template.meta_template_id) {
      try {
        const credentials = await getWabaCredentials(orgId);
        await meta.deleteTemplate(credentials.wabaId, credentials.accessToken, template.name);
      } catch (err) {
        logger.warn({ err }, "Remote template delete failed; removing locally");
      }
    }

    const { error } = await supabaseAdmin
      .from("templates")
      .delete()
      .eq("organization_id", orgId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** Converts our stored component shape into Meta's Graph API payload. */
function toMetaComponents(
  components: TemplateInput["components"],
): TemplateComponentPayload[] {
  const payload: TemplateComponentPayload[] = [];

  if (components.header) {
    payload.push({
      type: "HEADER",
      format: components.header.format,
      ...(components.header.format === "TEXT"
        ? { text: components.header.text }
        : {
            example: {
              header_handle: components.header.mediaHandle
                ? [components.header.mediaHandle]
                : [],
            },
          }),
    });
  }

  payload.push({
    type: "BODY",
    text: components.body.text,
    ...(components.body.examples.length > 0 && {
      example: { body_text: [components.body.examples] },
    }),
  });

  if (components.footer) {
    payload.push({ type: "FOOTER", text: components.footer.text });
  }

  if (components.buttons?.length) {
    payload.push({
      type: "BUTTONS",
      buttons: components.buttons.map((button) => {
        switch (button.type) {
          case "URL":
            return { type: "URL", text: button.text, url: button.url };
          case "PHONE_NUMBER":
            return { type: "PHONE_NUMBER", text: button.text, phone_number: button.phoneNumber };
          default:
            return { type: button.type, text: button.text };
        }
      }),
    });
  }

  return payload;
}

/** Extracts {{1}}, {{2}}... placeholders so the UI can prompt for each value. */
export function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\d+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]!))].sort((a, b) => Number(a) - Number(b));
}
