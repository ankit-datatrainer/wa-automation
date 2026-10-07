import { Router } from "express";
import { MESSAGING_TIERS, type MessagingTier } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/validate.js";
import { notFound } from "../lib/errors.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

/** Backs the six KPI cards and the two panels beneath them. */
dashboardRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.dashboardStats);

    const orgId = req.auth!.organizationId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [org, waba, templates, campaigns, messagesToday] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("wallet_balance, currency, trial_ends_at, plan, is_demo")
        .eq("id", orgId)
        .maybeSingle(),
      supabaseAdmin
        .from("waba_accounts")
        .select("quality_rating, messaging_tier, display_phone, status")
        .eq("organization_id", orgId)
        .maybeSingle(),
      supabaseAdmin
        .from("templates")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabaseAdmin
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("direction", "outbound")
        .gte("sent_at", startOfDay.toISOString()),
    ]);

    if (!org.data) throw notFound("Organization");

    const trialEndsAt = org.data.trial_ends_at ? new Date(org.data.trial_ends_at) : null;
    const daysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : 0;

    const tier = (waba.data?.messaging_tier ?? "TIER_250") as MessagingTier;
    const perDayLimit = MESSAGING_TIERS[tier] ?? 250;

    res.json({
      accountDaysLeft: daysLeft,
      accountStatus: daysLeft > 0 ? "active" : "expired",
      totalTemplates: templates.count ?? 0,
      totalReports: campaigns.count ?? 0,
      balance: Number(org.data.wallet_balance),
      currency: org.data.currency,
      qualityRating: waba.data?.quality_rating ?? "unknown",
      perDayMessageLimit: perDayLimit,
      messagesUsedToday: messagesToday.count ?? 0,
      isDemo: org.data.is_demo,
      plan: org.data.plan,
    });
  }),
);

/** "Account Information" panel. */
dashboardRouter.get(
  "/account",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.dashboardAccount);

    const [user, org] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("email, phone, country, name, created_at")
        .eq("id", req.auth!.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("organizations")
        .select("name, plan, is_demo, trial_ends_at, created_at")
        .eq("id", req.auth!.organizationId)
        .maybeSingle(),
    ]);

    // Missing values are returned as null so the UI can show an honest empty
    // state instead of placeholder account details.
    const trialEndsAt = org.data?.trial_ends_at ? new Date(org.data.trial_ends_at) : null;
    const daysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

    const dateFormat: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
    const memberSinceSource = user.data?.created_at ?? org.data?.created_at ?? null;
    const formattedMemberSince = memberSinceSource
      ? new Date(memberSinceSource).toLocaleDateString("en-US", dateFormat)
      : null;
    const formattedDemoExpires = trialEndsAt
      ? trialEndsAt.toLocaleDateString("en-US", dateFormat)
      : null;

    res.json({
      email: user.data?.email ?? req.auth!.email ?? null,
      mobile: user.data?.phone ?? null,
      country: user.data?.country ?? null,
      name: user.data?.name ?? null,
      organizationName: org.data?.name ?? null,
      isDemo: org.data?.is_demo ?? false,
      plan: org.data?.plan ?? "trial",
      demoExpires: formattedDemoExpires,
      memberSince: formattedMemberSince,
      daysRemaining,
    });
  }),
);

/**
 * "Message Charges by Category" panel. Prices are per-conversation and vary by
 * country, so they come from the pricing table keyed on the account's country;
 * IN is the fallback until a country is set.
 */
dashboardRouter.get(
  "/message-charges",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.messageCharges);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("country")
      .eq("id", req.auth!.userId)
      .maybeSingle();

    const country = user?.country ?? "IN";

    const { data, error } = await supabaseAdmin
      .from("message_pricing")
      .select("category, price, currency")
      .eq("country", country);

    if (error) throw error;

    res.json({
      country,
      charges: data ?? [],
    });
  }),
);
