import { Router } from "express";
import { z } from "zod";
import { paginationSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { recordPlatformAction, requireSuperAdmin } from "../middleware/super-admin.js";
import { asyncHandler, getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { badRequest, notFound } from "../lib/errors.js";

/** Platform-wide administration. Every route crosses tenant boundaries. */
export const platformRouter = Router();

platformRouter.use(requireAuth, requireSuperAdmin);

/** Whether the caller is a super admin — used by the web app to show the nav. */
export const platformStatusRouter = Router();

platformStatusRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data } = await supabaseAdmin
      .from("users")
      .select("is_super_admin")
      .eq("id", req.auth!.userId)
      .maybeSingle();

    res.json({ isSuperAdmin: data?.is_super_admin ?? false });
  }),
);

// ---------------------------------------------------------------- overview
platformRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const countOf = (table: string) =>
      supabaseAdmin.from(table).select("id", { count: "exact", head: true });

    const [orgs, suspended, users, contacts, campaigns, messagesToday, wabas, openTickets] =
      await Promise.all([
        countOf("organizations"),
        supabaseAdmin
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("is_suspended", true),
        countOf("users"),
        countOf("contacts"),
        countOf("campaigns"),
        supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .gte("sent_at", startOfDay.toISOString()),
        supabaseAdmin
          .from("waba_accounts")
          .select("id", { count: "exact", head: true })
          .eq("status", "connected"),
        supabaseAdmin
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          // Values must exist in the ticket_status enum, or the whole count errors out to 0.
          .in("status", ["open", "in_progress", "waiting"]),
      ]);

    // Wallet balances summed across every tenant.
    const { data: balances } = await supabaseAdmin
      .from("organizations")
      .select("wallet_balance");

    const totalBalance = (balances ?? []).reduce(
      (sum, o) => sum + Number(o.wallet_balance ?? 0),
      0,
    );

    res.json({
      organizations: orgs.count ?? 0,
      suspendedOrganizations: suspended.count ?? 0,
      users: users.count ?? 0,
      contacts: contacts.count ?? 0,
      campaigns: campaigns.count ?? 0,
      messagesToday: messagesToday.count ?? 0,
      connectedNumbers: wabas.count ?? 0,
      totalWalletBalance: totalBalance,
      openTickets: openTickets.count ?? 0,
    });
  }),
);

// ---------------------------------------------------------------- organizations
platformRouter.get(
  "/organizations",
  validateQuery(paginationSchema.extend({ suspended: z.enum(["true", "false"]).optional() })),
  asyncHandler(async (_req, res) => {
    const q = getQuery<{ page: number; pageSize: number; search?: string; suspended?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("organizations")
      .select(
        "id, name, slug, plan, wallet_balance, currency, trial_ends_at, is_demo, is_suspended, suspended_reason, created_at",
        { count: "exact" },
      );

    if (q.search) query = query.ilike("name", `%${q.search}%`);
    if (q.suspended) query = query.eq("is_suspended", q.suspended === "true");

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + q.pageSize - 1);

    if (error) throw error;

    // Member and contact counts per org, for the table.
    const orgIds = (data ?? []).map((o) => o.id);
    const [{ data: members }, { data: contacts }] = await Promise.all([
      supabaseAdmin.from("organization_members").select("organization_id").in("organization_id", orgIds),
      supabaseAdmin.from("contacts").select("organization_id").in("organization_id", orgIds),
    ]);

    const tally = (rows: { organization_id: string }[] | null) => {
      const map = new Map<string, number>();
      for (const row of rows ?? []) {
        map.set(row.organization_id, (map.get(row.organization_id) ?? 0) + 1);
      }
      return map;
    };

    const memberCounts = tally(members);
    const contactCounts = tally(contacts);

    res.json({
      data: (data ?? []).map((org) => ({
        ...org,
        memberCount: memberCounts.get(org.id) ?? 0,
        contactCount: contactCounts.get(org.id) ?? 0,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / q.pageSize),
    });
  }),
);

platformRouter.get(
  "/organizations/:id",
  asyncHandler(async (req, res) => {
    const orgId = req.params.id!;

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (error) throw error;
    if (!org) throw notFound("Organization");

    const [members, contacts, campaigns, templates, waba] = await Promise.all([
      supabaseAdmin
        .from("organization_members")
        .select("id, role, is_online, users(id, name, email)")
        .eq("organization_id", orgId),
      supabaseAdmin.from("contacts").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabaseAdmin.from("templates").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabaseAdmin
        .from("waba_accounts")
        .select("display_phone, status, quality_rating, messaging_tier")
        .eq("organization_id", orgId)
        .maybeSingle(),
    ]);

    res.json({
      organization: org,
      members: members.data ?? [],
      counts: {
        contacts: contacts.count ?? 0,
        campaigns: campaigns.count ?? 0,
        templates: templates.count ?? 0,
      },
      waba: waba.data ?? null,
    });
  }),
);

/** Suspends or restores an organization platform-wide. */
platformRouter.post(
  "/organizations/:id/suspend",
  validateBody(
    z.object({
      suspended: z.boolean(),
      reason: z.string().max(500).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const orgId = req.params.id!;
    const { suspended, reason } = req.body as { suspended: boolean; reason?: string };

    const { error } = await supabaseAdmin
      .from("organizations")
      .update({
        is_suspended: suspended,
        suspended_reason: suspended ? (reason ?? null) : null,
        suspended_at: suspended ? new Date().toISOString() : null,
      })
      .eq("id", orgId);

    if (error) throw error;

    await recordPlatformAction(
      req.auth!.userId,
      suspended ? "organization.suspended" : "organization.restored",
      { type: "organization", id: orgId },
      { reason },
    );

    res.json({ suspended });
  }),
);

/** Adjusts an organization's wallet balance and writes a matching ledger row. */
platformRouter.post(
  "/organizations/:id/wallet",
  validateBody(
    z.object({
      amount: z.coerce.number().refine((n) => n !== 0, "Amount cannot be zero"),
      description: z.string().min(2).max(200),
    }),
  ),
  asyncHandler(async (req, res) => {
    const orgId = req.params.id!;
    const { amount, description } = req.body as { amount: number; description: string };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("wallet_balance")
      .eq("id", orgId)
      .maybeSingle();

    if (!org) throw notFound("Organization");

    const balanceAfter = Number(org.wallet_balance) + amount;
    if (balanceAfter < 0) throw badRequest("This would take the balance below zero");

    await supabaseAdmin.from("wallet_transactions").insert({
      organization_id: orgId,
      type: amount > 0 ? "credit" : "debit",
      amount: Math.abs(amount),
      balance_after: balanceAfter,
      description,
      reference: `platform:${req.auth!.userId}`,
    });

    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ wallet_balance: balanceAfter })
      .eq("id", orgId);

    if (error) throw error;

    await recordPlatformAction(
      req.auth!.userId,
      "organization.wallet_adjusted",
      { type: "organization", id: orgId },
      { amount, description, balanceAfter },
    );

    res.json({ balanceAfter });
  }),
);

platformRouter.patch(
  "/organizations/:id",
  validateBody(
    z.object({
      name: z.string().min(2).max(120).optional(),
      plan: z.string().max(40).optional(),
      trialEndsAt: z.string().datetime().nullable().optional(),
      isDemo: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      name?: string;
      plan?: string;
      trialEndsAt?: string | null;
      isDemo?: boolean;
    };

    const { error } = await supabaseAdmin
      .from("organizations")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.plan !== undefined && { plan: body.plan }),
        ...(body.trialEndsAt !== undefined && { trial_ends_at: body.trialEndsAt }),
        ...(body.isDemo !== undefined && { is_demo: body.isDemo }),
      })
      .eq("id", req.params.id!);

    if (error) throw error;

    await recordPlatformAction(req.auth!.userId, "organization.updated", {
      type: "organization",
      id: req.params.id!,
    });

    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- users
platformRouter.get(
  "/users",
  validateQuery(paginationSchema),
  asyncHandler(async (_req, res) => {
    const q = getQuery<{ page: number; pageSize: number; search?: string }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("users")
      .select("id, email, name, phone, country, is_super_admin, created_at", { count: "exact" });

    if (q.search) query = query.or(`email.ilike.%${q.search}%,name.ilike.%${q.search}%`);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + q.pageSize - 1);

    if (error) throw error;

    const userIds = (data ?? []).map((u) => u.id);
    const { data: memberships } = await supabaseAdmin
      .from("organization_members")
      .select("user_id, role, organizations(id, name)")
      .in("user_id", userIds);

    const byUser = new Map<string, { role: string; organization: unknown }[]>();
    for (const m of memberships ?? []) {
      const list = byUser.get(m.user_id) ?? [];
      list.push({ role: m.role, organization: m.organizations });
      byUser.set(m.user_id, list);
    }

    res.json({
      data: (data ?? []).map((user) => ({
        ...user,
        memberships: byUser.get(user.id) ?? [],
      })),
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / q.pageSize),
    });
  }),
);

/** Grants or revokes platform-administrator rights. */
platformRouter.post(
  "/users/:id/super-admin",
  validateBody(z.object({ isSuperAdmin: z.boolean() })),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id!;
    const { isSuperAdmin } = req.body as { isSuperAdmin: boolean };

    // Refuse to remove the last super admin, which would lock everyone out.
    if (!isSuperAdmin) {
      const { count } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("is_super_admin", true);

      if ((count ?? 0) <= 1) {
        throw badRequest("Cannot remove the only remaining platform administrator");
      }
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_super_admin: isSuperAdmin })
      .eq("id", targetId);

    if (error) throw error;

    await recordPlatformAction(
      req.auth!.userId,
      isSuperAdmin ? "user.super_admin_granted" : "user.super_admin_revoked",
      { type: "user", id: targetId },
    );

    res.json({ isSuperAdmin });
  }),
);

// ---------------------------------------------------------------- audit
platformRouter.get(
  "/audit-logs",
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("platform_audit_logs")
      .select("id, action, target_type, target_id, metadata, created_at, users(name, email)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

// ---------------------------------------------------------------- plans
const planSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("INR"),
  billingCycle: z.enum(["monthly", "yearly"]),
  messageLimit: z.coerce.number().int().positive().nullable().optional(),
  contactLimit: z.coerce.number().int().positive().nullable().optional(),
  agentLimit: z.coerce.number().int().positive().nullable().optional(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

/** The full plan catalog, including inactive plans — the platform admin view. */
platformRouter.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .order("sort_order")
      .order("billing_cycle");

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

platformRouter.post(
  "/plans",
  validateBody(planSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof planSchema>;

    const { data, error } = await supabaseAdmin
      .from("plans")
      .insert({
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        currency: body.currency,
        billing_cycle: body.billingCycle,
        message_limit: body.messageLimit ?? null,
        contact_limit: body.contactLimit ?? null,
        agent_limit: body.agentLimit ?? null,
        features: body.features,
        is_active: body.isActive,
        sort_order: body.sortOrder,
      })
      .select("id")
      .single();

    if (error) throw error;

    await recordPlatformAction(req.auth!.userId, "plan.created", { type: "plan", id: data.id }, {
      name: body.name,
      billingCycle: body.billingCycle,
    });

    res.status(201).json(data);
  }),
);

platformRouter.patch(
  "/plans/:id",
  validateBody(planSchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<z.infer<typeof planSchema>>;

    const { error, count } = await supabaseAdmin
      .from("plans")
      .update(
        {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.price !== undefined && { price: body.price }),
          ...(body.currency !== undefined && { currency: body.currency }),
          ...(body.billingCycle !== undefined && { billing_cycle: body.billingCycle }),
          ...(body.messageLimit !== undefined && { message_limit: body.messageLimit }),
          ...(body.contactLimit !== undefined && { contact_limit: body.contactLimit }),
          ...(body.agentLimit !== undefined && { agent_limit: body.agentLimit }),
          ...(body.features !== undefined && { features: body.features }),
          ...(body.isActive !== undefined && { is_active: body.isActive }),
          ...(body.sortOrder !== undefined && { sort_order: body.sortOrder }),
        },
        { count: "exact" },
      )
      .eq("id", req.params.id!);

    if (error) throw error;
    if (count === 0) throw notFound("Plan");

    await recordPlatformAction(req.auth!.userId, "plan.updated", { type: "plan", id: req.params.id! });
    res.sendStatus(204);
  }),
);

platformRouter.delete(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    // A plan already assigned to an org must not vanish out from under it —
    // deactivate instead of deleting so history and the FK stay intact.
    const { count: assignedCount } = await supabaseAdmin
      .from("org_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", req.params.id!);

    if ((assignedCount ?? 0) > 0) {
      const { error } = await supabaseAdmin
        .from("plans")
        .update({ is_active: false })
        .eq("id", req.params.id!);
      if (error) throw error;
      return res.json({ deactivated: true });
    }

    const { error } = await supabaseAdmin.from("plans").delete().eq("id", req.params.id!);
    if (error) throw error;

    await recordPlatformAction(req.auth!.userId, "plan.deleted", { type: "plan", id: req.params.id! });
    res.json({ deactivated: false });
  }),
);

// ---------------------------------------------------------------- subscriptions
/**
 * Assigns a plan to an organization for N billing cycles (e.g. a monthly plan
 * for 3 cycles = 3 months, a yearly plan for 1 cycle = 1 year). Any existing
 * active subscription is marked cancelled first — history is kept, not erased.
 */
const assignSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  cycleCount: z.coerce.number().int().min(1).max(60).default(1),
  notes: z.string().max(500).optional(),
});

platformRouter.get(
  "/organizations/:id/subscriptions",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("org_subscriptions")
      .select(
        "id, status, cycle_count, starts_at, ends_at, cancelled_at, notes, created_at, plans(name, price, currency, billing_cycle)",
      )
      .eq("organization_id", req.params.id!)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

platformRouter.post(
  "/organizations/:id/subscriptions",
  validateBody(assignSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const orgId = req.params.id!;
    const { planId, cycleCount, notes } = req.body as z.infer<typeof assignSubscriptionSchema>;

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .maybeSingle();
    if (!org) throw notFound("Organization");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, name, billing_cycle")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) throw notFound("Plan");

    // One cycle = one month or one year, depending on the plan's own cadence.
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    if (plan.billing_cycle === "yearly") {
      endsAt.setFullYear(endsAt.getFullYear() + cycleCount);
    } else {
      endsAt.setMonth(endsAt.getMonth() + cycleCount);
    }

    // Superseding the previous subscription and inserting the new one happen
    // together conceptually; if the insert fails the old row is left active
    // rather than silently leaving the tenant with no subscription at all.
    await supabaseAdmin
      .from("org_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("status", "active");

    const { data: subscription, error } = await supabaseAdmin
      .from("org_subscriptions")
      .insert({
        organization_id: orgId,
        plan_id: planId,
        status: "active",
        cycle_count: cycleCount,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        assigned_by: req.auth!.userId,
        notes: notes ?? null,
      })
      .select("id, ends_at")
      .single();

    if (error) throw error;

    // Keep the org's own plan label and trial_ends_at in step, since the
    // dashboard's "days left" card reads trial_ends_at directly.
    await supabaseAdmin
      .from("organizations")
      .update({ plan: plan.name.toLowerCase(), trial_ends_at: endsAt.toISOString(), is_demo: false })
      .eq("id", orgId);

    await recordPlatformAction(
      req.auth!.userId,
      "subscription.assigned",
      { type: "organization", id: orgId },
      { planId, planName: plan.name, cycleCount, endsAt: endsAt.toISOString() },
    );

    res.status(201).json(subscription);
  }),
);

platformRouter.post(
  "/organizations/:id/subscriptions/cancel",
  asyncHandler(async (req, res) => {
    const { error, count } = await supabaseAdmin
      .from("org_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() }, { count: "exact" })
      .eq("organization_id", req.params.id!)
      .eq("status", "active");

    if (error) throw error;
    if (count === 0) throw badRequest("This organization has no active subscription");

    await recordPlatformAction(req.auth!.userId, "subscription.cancelled", {
      type: "organization",
      id: req.params.id!,
    });

    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- create org + user
/**
 * Creates a brand-new organization and its owner user in one step — the
 * super-admin equivalent of someone signing up themselves, minus needing the
 * customer to do it. Optionally assigns a plan immediately.
 */
const createOrgUserSchema = z.object({
  organizationName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  planId: z.string().uuid().optional(),
  cycleCount: z.coerce.number().int().min(1).max(60).default(1),
});

platformRouter.post(
  "/organizations",
  validateBody(createOrgUserSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createOrgUserSchema>;

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name },
    });

    if (authError || !created.user) {
      throw badRequest(authError?.message ?? "Could not create the user account");
    }

    // The DB trigger mirrors new auth users into public.users, but that race
    // isn't guaranteed to have completed by the time we insert below, so it's
    // upserted explicitly rather than trusted to already exist.
    await supabaseAdmin
      .from("users")
      .upsert(
        { id: created.user.id, email: body.email, name: body.name },
        { onConflict: "id", ignoreDuplicates: true },
      );

    const slug = `${body.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)}-${Math.random().toString(36).slice(2, 7)}`;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: body.organizationName,
        slug,
        plan: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        is_demo: false,
      })
      .select("id")
      .single();

    if (orgError || !org) throw badRequest("Could not create the organization", orgError);

    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: created.user.id, role: "owner" });

    if (memberError) {
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      throw badRequest("Could not create the membership", memberError);
    }

    if (body.planId) {
      const { data: plan } = await supabaseAdmin
        .from("plans")
        .select("id, name, billing_cycle")
        .eq("id", body.planId)
        .maybeSingle();

      if (plan) {
        const endsAt = new Date();
        if (plan.billing_cycle === "yearly") endsAt.setFullYear(endsAt.getFullYear() + body.cycleCount);
        else endsAt.setMonth(endsAt.getMonth() + body.cycleCount);

        await supabaseAdmin.from("org_subscriptions").insert({
          organization_id: org.id,
          plan_id: plan.id,
          status: "active",
          cycle_count: body.cycleCount,
          ends_at: endsAt.toISOString(),
          assigned_by: req.auth!.userId,
        });

        await supabaseAdmin
          .from("organizations")
          .update({ plan: plan.name.toLowerCase(), trial_ends_at: endsAt.toISOString() })
          .eq("id", org.id);
      }
    }

    await recordPlatformAction(
      req.auth!.userId,
      "organization.created_by_admin",
      { type: "organization", id: org.id },
      { email: body.email, planId: body.planId },
    );

    res.status(201).json({ organizationId: org.id, userId: created.user.id });
  }),
);

// ---------------------------------------------------------------- waba accounts (platform-wide)
platformRouter.get(
  "/waba-accounts",
  validateQuery(
    paginationSchema.extend({
      status: z.string().optional(),
      quality: z.string().optional(),
    }),
  ),
  asyncHandler(async (_req, res) => {
    const q = getQuery<{
      page: number;
      pageSize: number;
      search?: string;
      status?: string;
      quality?: string;
    }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("waba_accounts")
      .select(
        "id, organization_id, waba_id, phone_number_id, display_phone, verified_name, quality_rating, messaging_tier, status, last_synced_at, created_at, organizations(id, name, slug, plan, is_suspended)",
        { count: "exact" },
      );

    if (q.search) {
      query = query.or(
        `display_phone.ilike.%${q.search}%,verified_name.ilike.%${q.search}%`,
      );
    }
    if (q.status) query = query.eq("status", q.status);
    if (q.quality) query = query.eq("quality_rating", q.quality);

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

// ---------------------------------------------------------------- support tickets (platform-wide)
platformRouter.get(
  "/support-tickets",
  validateQuery(
    paginationSchema.extend({
      status: z.string().optional(),
      priority: z.string().optional(),
    }),
  ),
  asyncHandler(async (_req, res) => {
    const q = getQuery<{
      page: number;
      pageSize: number;
      search?: string;
      status?: string;
      priority?: string;
    }>(res);
    const from = (q.page - 1) * q.pageSize;

    let query = supabaseAdmin
      .from("support_tickets")
      .select(
        "id, organization_id, subject, status, priority, created_by, assigned_to, created_at, resolved_at, organizations(id, name, slug), users:created_by(id, name, email)",
        { count: "exact" },
      );

    if (q.search) query = query.ilike("subject", `%${q.search}%`);
    if (q.status) query = query.eq("status", q.status);
    if (q.priority) query = query.eq("priority", q.priority);

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

platformRouter.patch(
  "/support-tickets/:id",
  validateBody(
    z.object({
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.string().uuid().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const ticketId = req.params.id!;
    const body = req.body as {
      status?: "open" | "in_progress" | "resolved" | "closed";
      priority?: "low" | "medium" | "high" | "urgent";
      assignedTo?: string | null;
    };

    const resolvedAt =
      body.status === "resolved" || body.status === "closed"
        ? new Date().toISOString()
        : null;

    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update({
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.assignedTo !== undefined && { assigned_to: body.assignedTo }),
        ...(resolvedAt !== null && { resolved_at: resolvedAt }),
      })
      .eq("id", ticketId);

    if (error) throw error;

    await recordPlatformAction(
      req.auth!.userId,
      "support_ticket.updated",
      { type: "support_ticket", id: ticketId },
      body,
    );

    res.sendStatus(204);
  }),
);

/** The full thread for a ticket, internal notes included — read by the platform support desk. */
platformRouter.get(
  "/support-tickets/:id/messages",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("ticket_messages")
      .select("id, body, is_internal, created_at, users:author_id(id, name, email)")
      .eq("ticket_id", req.params.id!)
      .order("created_at");

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

platformRouter.post(
  "/support-tickets/:id/messages",
  validateBody(
    z.object({
      body: z.string().min(1).max(2000),
      isInternal: z.boolean().default(false),
    }),
  ),
  asyncHandler(async (req, res) => {
    const ticketId = req.params.id!;
    const { body, isInternal } = req.body as { body: string; isInternal: boolean };

    const { data: message, error } = await supabaseAdmin
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        author_id: req.auth!.userId,
        body,
        is_internal: isInternal,
      })
      .select("id, body, is_internal, created_at, users:author_id(id, name, email)")
      .single();

    if (error) throw error;

    res.status(201).json(message);
  }),
);

// ---------------------------------------------------------------- org full details
platformRouter.get(
  "/organizations/:id/details",
  asyncHandler(async (req, res) => {
    const orgId = req.params.id!;

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (error) throw error;
    if (!org) throw notFound("Organization");

    const [members, contacts, campaigns, templates, flows, chatbots, messages, waba, subscriptions, transactions] =
      await Promise.all([
        supabaseAdmin
          .from("organization_members")
          .select("id, role, is_online, created_at, users(id, name, email, phone, country)")
          .eq("organization_id", orgId),
        supabaseAdmin.from("contacts").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabaseAdmin.from("templates").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabaseAdmin.from("flows").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabaseAdmin.from("chatbots").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabaseAdmin.from("messages").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabaseAdmin
          .from("waba_accounts")
          .select("*")
          .eq("organization_id", orgId)
          .maybeSingle(),
        supabaseAdmin
          .from("org_subscriptions")
          .select("id, status, cycle_count, starts_at, ends_at, cancelled_at, notes, created_at, plans(id, name, price, currency, billing_cycle)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("wallet_transactions")
          .select("id, type, amount, balance_after, description, reference, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    res.json({
      organization: org,
      members: members.data ?? [],
      waba: waba.data ?? null,
      counts: {
        contacts: contacts.count ?? 0,
        campaigns: campaigns.count ?? 0,
        templates: templates.count ?? 0,
        flows: flows.count ?? 0,
        chatbots: chatbots.count ?? 0,
        messages: messages.count ?? 0,
      },
      subscriptions: subscriptions.data ?? [],
      walletTransactions: transactions.data ?? [],
    });
  }),
);

