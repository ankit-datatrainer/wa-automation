import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/validate.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { notFound } from "../lib/errors.js";
import { authRouter } from "./auth.js";
import { contactsRouter } from "./contacts.js";
import { dashboardRouter } from "./dashboard.js";
import { taxonomyRouter } from "./taxonomy.js";
import { conversationsRouter } from "./conversations.js";
import { wabaRouter } from "./waba.js";
import { adminRouter } from "./admin.js";
import { analyticsRouter } from "./analytics.js";
import { campaignsRouter } from "./campaigns.js";
import { settingsRouter } from "./settings.js";
import { supportRouter } from "./support.js";
import { platformRouter, platformStatusRouter } from "./platform.js";
import { billingRouter } from "./billing.js";
import { commerceRouter } from "./commerce.js";
import { chatbotsRouter, flowsRouter } from "./chatbots.js";
import { templatesRouter } from "./templates.js";
import { demoData, isDemoMode } from "../lib/demo.js";

export const routes = Router();

routes.use("/admin", adminRouter);
routes.use("/analytics", analyticsRouter);
routes.use("/auth", authRouter);
routes.use("/billing", billingRouter);
routes.use("/campaigns", campaignsRouter);
routes.use("/commerce", commerceRouter);
// The status probe must be mounted first: platformRouter guards everything
// beneath it with requireSuperAdmin, which would otherwise reject the very
// call the web app makes to find out whether to show the platform nav.
routes.use("/platform", platformStatusRouter);
routes.use("/platform", platformRouter);
routes.use("/settings", settingsRouter);
routes.use("/support", supportRouter);
routes.use("/chatbots", chatbotsRouter);
routes.use("/contacts", contactsRouter);
routes.use("/conversations", conversationsRouter);
routes.use("/dashboard", dashboardRouter);
routes.use("/flows", flowsRouter);
routes.use("/templates", templatesRouter);
routes.use("/waba", wabaRouter);
routes.use("/", taxonomyRouter);

/**
 * Bootstrap payload for the web app shell: the signed-in user, their active
 * organization, and the WABA connection state that drives the "Live" pill and
 * the "WhatsApp Connected" chip in the topbar.
 */
routes.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json(demoData.me);

    const auth = req.auth!;

    const [{ data: profile }, { data: org }, { data: waba }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, email, name, phone, country, avatar_url, is_super_admin")
        .eq("id", auth.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("organizations")
        .select("id, name, slug, plan, wallet_balance, currency, trial_ends_at, is_demo")
        .eq("id", auth.organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("waba_accounts")
        .select("id, waba_id, phone_number_id, display_phone, verified_name, quality_rating, messaging_tier, status, last_synced_at")
        .eq("organization_id", auth.organizationId)
        .maybeSingle(),
    ]);

    if (!org) throw notFound("Organization");

    res.json({
      user: {
        id: auth.userId,
        email: auth.email,
        name: profile?.name ?? null,
        phone: profile?.phone ?? null,
        country: profile?.country ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        walletBalance: Number(org.wallet_balance),
        currency: org.currency,
        trialEndsAt: org.trial_ends_at,
        isDemo: org.is_demo,
      },
      membership: { role: auth.role, permissions: auth.permissions },
      isSuperAdmin: profile?.is_super_admin ?? false,
      waba: waba
        ? {
            id: waba.id,
            wabaId: waba.waba_id,
            phoneNumberId: waba.phone_number_id,
            displayPhone: waba.display_phone,
            verifiedName: waba.verified_name,
            qualityRating: waba.quality_rating,
            messagingTier: waba.messaging_tier,
            status: waba.status,
            lastSyncedAt: waba.last_synced_at,
          }
        : null,
    });
  }),
);

/** Every organization the signed-in user belongs to, for the org switcher. */
routes.get(
  "/organizations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("organization_members")
      .select("role, organizations(id, name, slug, plan, is_demo)")
      .eq("user_id", req.auth!.userId);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);
