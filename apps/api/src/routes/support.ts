import { Router } from "express";
import { z } from "zod";
import { paginationSchema, supportTicketSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { notFound } from "../lib/errors.js";

export const supportRouter = Router();

supportRouter.use(requireAuth);

supportRouter.get(
  "/tickets",
  validateQuery(paginationSchema.extend({ status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; status?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("support_tickets")
      .select("id, subject, status, priority, created_at, resolved_at, users!support_tickets_created_by_fkey(name, email)", {
        count: "exact",
      })
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

supportRouter.get(
  "/tickets/:id",
  asyncHandler(async (req, res) => {
    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (error) throw error;
    if (!ticket) throw notFound("Ticket");

    const { data: messages } = await supabaseAdmin
      .from("ticket_messages")
      .select("id, body, is_internal, created_at, users(name, email)")
      .eq("ticket_id", ticket.id)
      .order("created_at");

    res.json({ ...ticket, messages: messages ?? [] });
  }),
);

/** Creates the ticket and its opening message in one step. */
supportRouter.post(
  "/tickets",
  validateBody(supportTicketSchema),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const body = req.body as import("zod").infer<typeof supportTicketSchema>;

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        organization_id: orgId,
        subject: body.subject,
        priority: body.priority,
        status: "open",
        created_by: req.auth!.userId,
      })
      .select("id")
      .single();

    if (error) throw error;

    const { error: messageError } = await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: req.auth!.userId,
      body: body.message,
    });

    if (messageError) throw messageError;
    res.status(201).json({ id: ticket.id });
  }),
);

supportRouter.post(
  "/tickets/:id/reply",
  validateBody(z.object({ body: z.string().min(1).max(5000), isInternal: z.boolean().default(false) })),
  asyncHandler(async (req, res) => {
    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("id")
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!ticket) throw notFound("Ticket");

    const payload = req.body as { body: string; isInternal: boolean };

    const { error } = await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: req.auth!.userId,
      body: payload.body,
      is_internal: payload.isInternal,
    });

    if (error) throw error;
    res.sendStatus(204);
  }),
);

supportRouter.patch(
  "/tickets/:id",
  validateBody(
    z.object({
      status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.string().uuid().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as { status?: string; priority?: string; assignedTo?: string | null };
    const resolving = body.status === "resolved" || body.status === "closed";

    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update({
        ...(body.status && { status: body.status }),
        ...(body.priority && { priority: body.priority }),
        ...(body.assignedTo !== undefined && { assigned_to: body.assignedTo }),
        ...(resolving && { resolved_at: new Date().toISOString() }),
      })
      .eq("organization_id", req.auth!.organizationId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** Volume and resolution-time summary for the Support Reports page. */
supportRouter.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .select("status, priority, created_at, resolved_at")
      .eq("organization_id", req.auth!.organizationId);

    if (error) throw error;

    const tickets = data ?? [];
    const resolved = tickets.filter((t) => t.resolved_at);

    const totalResolutionMs = resolved.reduce(
      (sum, t) => sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()),
      0,
    );

    const countBy = (key: "status" | "priority") =>
      tickets.reduce<Record<string, number>>((acc, ticket) => {
        const value = ticket[key];
        acc[value] = (acc[value] ?? 0) + 1;
        return acc;
      }, {});

    res.json({
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      resolved: resolved.length,
      byStatus: countBy("status"),
      byPriority: countBy("priority"),
      averageResolutionHours:
        resolved.length > 0 ? totalResolutionMs / resolved.length / 3_600_000 : 0,
    });
  }),
);
