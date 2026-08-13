import { Router } from "express";
import { z } from "zod";
import { chatbotSchema, flowDefinitionSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";
import { notFound } from "../lib/errors.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const chatbotsRouter = Router();

chatbotsRouter.use(requireAuth);

/** The 21 prebuilt templates behind "Try this Template". Shared across tenants. */
chatbotsRouter.get(
  "/library",
  asyncHandler(async (_req, res) => {
    if (isDemoMode) return res.json(demoData.chatbotLibrary);

    const { data, error } = await supabaseAdmin
      .from("chatbot_library")
      .select("id, title, description, industry, sort_order")
      .order("sort_order");

    if (error) throw error;
    res.json({ data: data ?? [], total: data?.length ?? 0 });
  }),
);

/** Clones a library template into the org as a draft flow plus an inactive bot. */
chatbotsRouter.post(
  "/library/:id/clone",
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;

    const { data: template, error } = await supabaseAdmin
      .from("chatbot_library")
      .select("title, description, definition")
      .eq("id", req.params.id!)
      .maybeSingle();

    if (error) throw error;
    if (!template) throw notFound("Chatbot template");

    const { data: flow, error: flowError } = await supabaseAdmin
      .from("flows")
      .insert({
        organization_id: orgId,
        name: template.title,
        definition: template.definition,
        status: "draft",
      })
      .select("id")
      .single();

    if (flowError) throw flowError;

    const { data: chatbot, error: chatbotError } = await supabaseAdmin
      .from("chatbots")
      .insert({
        organization_id: orgId,
        name: template.title,
        description: template.description,
        trigger_type: "keyword",
        trigger_config: { keywords: [] },
        flow_id: flow.id,
        // Starts off so the owner can review the flow before it answers customers.
        is_active: false,
      })
      .select("id")
      .single();

    if (chatbotError) throw chatbotError;
    res.status(201).json({ chatbotId: chatbot.id, flowId: flow.id });
  }),
);

// ---------------------------------------------------------------- chatbots
chatbotsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.chatbots);

    const { data, error } = await supabaseAdmin
      .from("chatbots")
      .select("id, name, description, trigger_type, trigger_config, flow_id, is_active, created_at")
      .eq("organization_id", req.auth!.organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

chatbotsRouter.post(
  "/",
  validateBody(chatbotSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as import("@wa/types").ChatbotInput;

    const { data, error } = await supabaseAdmin
      .from("chatbots")
      .insert({
        organization_id: req.auth!.organizationId,
        name: body.name,
        description: body.description ?? null,
        trigger_type: body.triggerType,
        trigger_config: body.triggerConfig,
        flow_id: body.flowId,
        is_active: body.isActive,
      })
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  }),
);

chatbotsRouter.patch(
  "/:id",
  validateBody(chatbotSchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<import("@wa/types").ChatbotInput>;

    const { error } = await supabaseAdmin
      .from("chatbots")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.triggerType !== undefined && { trigger_type: body.triggerType }),
        ...(body.triggerConfig !== undefined && { trigger_config: body.triggerConfig }),
        ...(body.flowId !== undefined && { flow_id: body.flowId }),
        ...(body.isActive !== undefined && { is_active: body.isActive }),
      })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

chatbotsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("chatbots")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** Execution log for the Chatbot History page. */
chatbotsRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("chatbot_executions")
      .select("id, current_node, status, started_at, ended_at, chatbots(name), contacts(wa_id, name)")
      .eq("organization_id", req.auth!.organizationId)
      .order("started_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

// ---------------------------------------------------------------- flows
export const flowsRouter = Router();

flowsRouter.use(requireAuth);

flowsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("flows")
      .select("id, name, status, meta_flow_id, created_at, updated_at")
      .eq("organization_id", req.auth!.organizationId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

flowsRouter.get(
  "/submissions",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("flow_submissions")
      .select("id, data, submitted_at, flows(name), contacts(wa_id, name)")
      .eq("organization_id", req.auth!.organizationId)
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

flowsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("flows")
      .select("id, name, definition, status, meta_flow_id")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound("Flow");
    res.json(data);
  }),
);

flowsRouter.post(
  "/",
  validateBody(
    z.object({
      name: z.string().min(2).max(120),
      definition: flowDefinitionSchema.default({ nodes: [], edges: [] }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("flows")
      .insert({ organization_id: req.auth!.organizationId, ...(req.body as object) })
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  }),
);

flowsRouter.patch(
  "/:id",
  validateBody(
    z.object({
      name: z.string().min(2).max(120).optional(),
      definition: flowDefinitionSchema.optional(),
      status: z.enum(["draft", "published"]).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("flows")
      .update(req.body as Record<string, unknown>)
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

flowsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("flows")
      .delete()
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);
