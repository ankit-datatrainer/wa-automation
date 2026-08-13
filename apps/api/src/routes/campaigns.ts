import { Router } from "express";
import { z } from "zod";
import { campaignSchema, paginationSchema, type CampaignInput } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { enqueueCampaign } from "../queues/campaign-queue.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

campaignsRouter.get(
  "/",
  validateQuery(paginationSchema.extend({ status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.campaigns);

    const q = getQuery<{ page: number; pageSize: number; search?: string; status?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("campaigns")
      .select(
        "id, name, audience_type, status, scheduled_at, started_at, completed_at, stats, created_at, templates(name, category)",
        { count: "exact" },
      )
      .eq("organization_id", req.auth!.organizationId);

    if (q.search) query = query.ilike("name", `%${q.search}%`);
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

campaignsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .select("*, templates(name, language, category, components)")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound("Campaign");
    res.json(data);
  }),
);

/** Per-recipient delivery detail for the Campaign History drill-down. */
campaignsRouter.get(
  "/:id/recipients",
  validateQuery(paginationSchema.extend({ status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; status?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    // Confirm the campaign is ours before exposing its recipients, since
    // campaign_recipients carries no organization_id of its own.
    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("id")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!campaign) throw notFound("Campaign");

    let query = supabaseAdmin
      .from("campaign_recipients")
      .select("id, status, wamid, error, sent_at, variables, contacts(wa_id, name)", {
        count: "exact",
      })
      .eq("campaign_id", campaign.id);

    if (q.status) query = query.eq("status", q.status);

    const { data, count, error } = await query
      .order("sent_at", { ascending: false, nullsFirst: false })
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

/**
 * Creates a campaign and materializes its recipient list immediately, so the
 * audience is a snapshot at creation time rather than at send time.
 */
campaignsRouter.post(
  "/",
  requireRole("manager"),
  validateBody(campaignSchema),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const body = req.body as CampaignInput;

    const { data: template } = await supabaseAdmin
      .from("templates")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("id", body.templateId)
      .maybeSingle();

    if (!template) throw notFound("Template");
    if (template.status !== "approved") {
      throw badRequest("Only approved templates can be used in a campaign");
    }

    const contactIds = await resolveAudience(orgId, body.audienceType, body.audienceConfig);
    if (contactIds.length === 0) {
      throw badRequest("This audience contains no contacts");
    }

    const { data: campaign, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        organization_id: orgId,
        name: body.name,
        template_id: body.templateId,
        audience_type: body.audienceType,
        audience_config: body.audienceConfig,
        variable_mapping: body.variableMapping,
        status: body.scheduledAt ? "scheduled" : "draft",
        scheduled_at: body.scheduledAt,
        stats: {
          total: contactIds.length,
          sent: 0,
          delivered: 0,
          read: 0,
          replied: 0,
          failed: 0,
        },
        created_by: req.auth!.userId,
      })
      .select("id")
      .single();

    if (error) throw error;

    for (let i = 0; i < contactIds.length; i += 1000) {
      const { error: recipientError } = await supabaseAdmin.from("campaign_recipients").insert(
        contactIds.slice(i, i + 1000).map((contactId) => ({
          campaign_id: campaign.id,
          contact_id: contactId,
          status: "queued" as const,
        })),
      );
      if (recipientError) throw recipientError;
    }

    res.status(201).json({ id: campaign.id, recipientCount: contactIds.length });
  }),
);

/** Starts sending now, regardless of any schedule. */
campaignsRouter.post(
  "/:id/send",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;

    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!campaign) throw notFound("Campaign");
    if (campaign.status === "running" || campaign.status === "completed") {
      throw conflict(`This campaign is already ${campaign.status}`);
    }

    await supabaseAdmin
      .from("campaigns")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", campaign.id);

    await enqueueCampaign(campaign.id, orgId);
    res.json({ status: "running" });
  }),
);

campaignsRouter.post(
  "/:id/pause",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("campaigns")
      .update({ status: "paused" })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .eq("status", "running");

    if (error) throw error;
    res.json({ status: "paused" });
  }),
);

campaignsRouter.post(
  "/:id/cancel",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("campaigns")
      .update({ status: "cancelled" })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .in("status", ["draft", "scheduled", "paused", "running"]);

    if (error) throw error;
    res.json({ status: "cancelled" });
  }),
);

campaignsRouter.delete(
  "/:id",
  requireRole("manager"),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/**
 * Turns an audience selection into a concrete contact id list.
 * Marketing sends exclude opted-out contacts at the source.
 */
async function resolveAudience(
  organizationId: string,
  audienceType: string,
  config: Record<string, unknown>,
): Promise<string[]> {
  const excludeOptedOut = (ids: string[]) => ids;

  switch (audienceType) {
    case "contacts": {
      const ids = (config.contactIds as string[]) ?? [];
      const { data } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .neq("opt_in_status", "opted_out")
        .in("id", ids);
      return (data ?? []).map((c) => c.id);
    }

    case "tags": {
      const tagIds = (config.tagIds as string[]) ?? [];
      const { data: tagged } = await supabaseAdmin
        .from("contact_tags")
        .select("contact_id")
        .in("tag_id", tagIds);
      const candidateIds = [...new Set((tagged ?? []).map((t) => t.contact_id))];
      if (candidateIds.length === 0) return [];
      const { data } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .neq("opt_in_status", "opted_out")
        .in("id", candidateIds);
      return (data ?? []).map((c) => c.id);
    }

    case "groups": {
      const groupIds = (config.groupIds as string[]) ?? [];
      const { data: grouped } = await supabaseAdmin
        .from("contact_groups")
        .select("contact_id")
        .in("group_id", groupIds);
      const candidateIds = [...new Set((grouped ?? []).map((g) => g.contact_id))];
      if (candidateIds.length === 0) return [];
      const { data } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .neq("opt_in_status", "opted_out")
        .in("id", candidateIds);
      return (data ?? []).map((c) => c.id);
    }

    case "csv": {
      // The upload step imports the rows first, then passes the resulting ids.
      return excludeOptedOut((config.contactIds as string[]) ?? []);
    }

    case "broadcast":
    default: {
      const { data } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .neq("opt_in_status", "opted_out");
      return (data ?? []).map((c) => c.id);
    }
  }
}
