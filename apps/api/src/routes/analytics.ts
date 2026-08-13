import { Router } from "express";
import { z } from "zod";
import { paginationSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, getQuery, validateQuery } from "../middleware/validate.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

/** Shared paginated reader for the four ledger pages. */
function ledger(
  table: "credit_history" | "wallet_transactions" | "subscriptions",
  columns: string,
  orderColumn = "created_at",
) {
  return asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number }>(res);
    const from = (q.page - 1) * q.pageSize;

    const { data, count, error } = await supabaseAdmin
      .from(table)
      .select(columns, { count: "exact" })
      .eq("organization_id", req.auth!.organizationId)
      .order(orderColumn, { ascending: false })
      .range(from, from + q.pageSize - 1);

    if (error) throw error;

    res.json({
      data: data ?? [],
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / q.pageSize),
    });
  });
}

analyticsRouter.get(
  "/credits",
  validateQuery(paginationSchema),
  ledger("credit_history", "id, category, cost, currency, created_at, conversation_id"),
);

analyticsRouter.get(
  "/wallet",
  validateQuery(paginationSchema),
  ledger(
    "wallet_transactions",
    "id, type, amount, balance_after, reference, description, created_at",
  ),
);

analyticsRouter.get(
  "/subscriptions",
  validateQuery(paginationSchema),
  ledger(
    "subscriptions",
    "id, plan, amount, currency, period_start, period_end, status, invoice_url",
    "period_start",
  ),
);

/** Conversation-level analytics for the Chat History page under Analytics. */
analyticsRouter.get(
  "/chats",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; search?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("conversations")
      .select(
        "id, status, unread_count, last_message_at, last_message_preview, session_expires_at, contacts(wa_id, name)",
        { count: "exact" },
      )
      .eq("organization_id", req.auth!.organizationId);

    if (q.search) query = query.ilike("last_message_preview", `%${q.search}%`);

    const { data, count, error } = await query
      .order("last_message_at", { ascending: false, nullsFirst: false })
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

/** Messages broken down by template category for the bar chart. */
analyticsRouter.get(
  "/category-breakdown",
  validateQuery(z.object({ days: z.coerce.number().int().min(1).max(90).default(30) })),
  asyncHandler(async (req, res) => {
    const { days } = getQuery<{ days: number }>(res);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("credit_history")
      .select("category, cost")
      .eq("organization_id", req.auth!.organizationId)
      .gte("created_at", since);

    if (error) throw error;

    const categories: Record<string, { category: string; count: number; totalCost: number }> = {};
    for (const row of data ?? []) {
      const cat = row.category ?? "service";
      const bucket = categories[cat] ?? { category: cat, count: 0, totalCost: 0 };
      bucket.count++;
      bucket.totalCost += Number(row.cost ?? 0);
      categories[cat] = bucket;
    }

    const order = ["marketing", "utility", "authentication", "service"];
    const breakdown = order.map(
      (cat) => categories[cat] ?? { category: cat, count: 0, totalCost: 0 },
    );

    res.json({ breakdown });
  }),
);

/** Messages handled per assigned agent for the performance bar chart. */
analyticsRouter.get(
  "/agent-performance",
  validateQuery(z.object({ days: z.coerce.number().int().min(1).max(90).default(30) })),
  asyncHandler(async (req, res) => {
    const { days } = getQuery<{ days: number }>(res);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("assigned_to, unread_count, status, users!conversations_assigned_to_fkey(name)")
      .eq("organization_id", req.auth!.organizationId)
      .not("assigned_to", "is", null)
      .gte("last_message_at", since);

    if (error) throw error;

    const agents: Record<string, { agentId: string; name: string; conversations: number; resolved: number }> = {};
    for (const row of data ?? []) {
      const id = row.assigned_to as string;
      const userRelation = row.users as unknown as { name: string | null } | null;
      const agentName = userRelation?.name ?? "Agent";
      const bucket = agents[id] ?? { agentId: id, name: agentName, conversations: 0, resolved: 0 };
      bucket.conversations++;
      if (row.status === "closed") bucket.resolved++;
      agents[id] = bucket;
    }

    res.json({
      agents: Object.values(agents).sort((a, b) => b.conversations - a.conversations),
    });
  }),
);

/** Per-campaign funnel stats for the campaign history chart. */
analyticsRouter.get(
  "/campaign-funnel",
  validateQuery(z.object({ campaignId: z.string().uuid().optional() })),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const q = getQuery<{ campaignId?: string }>(res);

    let query = supabaseAdmin
      .from("campaigns")
      .select("id, name, stats, status")
      .eq("organization_id", orgId)
      .in("status", ["completed", "running"]);

    if (q.campaignId) query = query.eq("id", q.campaignId);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(10);

    if (error) throw error;

    const funnels = (data ?? []).map((c) => {
      const s = (c.stats ?? {}) as Record<string, number>;
      return {
        id: c.id,
        name: c.name,
        total: s.total ?? 0,
        sent: s.sent ?? 0,
        delivered: s.delivered ?? 0,
        read: s.read ?? 0,
        replied: s.replied ?? 0,
        failed: s.failed ?? 0,
      };
    });

    res.json({ funnels });
  }),
);

/** Daily message volume and delivery rate for the dashboard charts. */
analyticsRouter.get(
  "/overview",
  validateQuery(z.object({ days: z.coerce.number().int().min(1).max(90).default(30) })),
  asyncHandler(async (req, res) => {
    const { days } = getQuery<{ days: number }>(res);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("direction, status, sent_at")
      .eq("organization_id", req.auth!.organizationId)
      .gte("sent_at", since);

    if (error) throw error;

    const buckets = new Map<
      string,
      { date: string; inbound: number; outbound: number; delivered: number; read: number; failed: number }
    >();

    for (const message of data ?? []) {
      const date = message.sent_at.slice(0, 10);
      const bucket = buckets.get(date) ?? {
        date,
        inbound: 0,
        outbound: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      };

      if (message.direction === "inbound") bucket.inbound++;
      else bucket.outbound++;

      // read implies delivered, so count it in both for a truthful rate.
      if (message.status === "delivered" || message.status === "read") bucket.delivered++;
      if (message.status === "read") bucket.read++;
      if (message.status === "failed") bucket.failed++;

      buckets.set(date, bucket);
    }

    const series = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
    const totalOutbound = series.reduce((sum, b) => sum + b.outbound, 0);
    const totalDelivered = series.reduce((sum, b) => sum + b.delivered, 0);

    res.json({
      series,
      totals: {
        inbound: series.reduce((sum, b) => sum + b.inbound, 0),
        outbound: totalOutbound,
        delivered: totalDelivered,
        read: series.reduce((sum, b) => sum + b.read, 0),
        failed: series.reduce((sum, b) => sum + b.failed, 0),
        deliveryRate: totalOutbound > 0 ? totalDelivered / totalOutbound : 0,
      },
    });
  }),
);
