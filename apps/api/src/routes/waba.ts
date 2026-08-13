import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { businessProfileSchema, wabaCredentialsSchema } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";
import { decrypt, encrypt } from "../lib/crypto.js";
import { meta, normalizeQualityRating } from "../lib/meta.js";
import { badRequest, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { demoData, isDemoMode } from "../lib/demo.js";
import { env } from "../config/env.js";

export const wabaRouter = Router();

wabaRouter.use(requireAuth);

/**
 * Tells the frontend whether Embedded Signup is available and, if so, the
 * public config it needs to load the Facebook SDK and open the popup. None of
 * this is secret — the app id and config id are meant to be public.
 */
wabaRouter.get(
  "/embedded-signup/config",
  asyncHandler(async (_req, res) => {
    res.json({
      available: Boolean(env.META_APP_ID && env.META_CONFIG_ID),
      appId: env.META_APP_ID ?? null,
      configId: env.META_CONFIG_ID ?? null,
      graphApiVersion: env.META_GRAPH_API_VERSION,
    });
  }),
);

/** Loads and decrypts the org's WABA credentials. Throws if not connected. */
export async function getWabaCredentials(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("waba_accounts")
    .select("id, waba_id, phone_number_id, access_token_encrypted, display_phone")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound("WhatsApp connection");

  return {
    id: data.id,
    wabaId: data.waba_id,
    phoneNumberId: data.phone_number_id,
    displayPhone: data.display_phone,
    accessToken: decrypt(data.access_token_encrypted),
  };
}

/** Never returns the token itself — only whether one is stored. */
wabaRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isDemoMode) return res.json({ data: demoData.waba });

    const { data, error } = await supabaseAdmin
      .from("waba_accounts")
      .select(
        "id, waba_id, phone_number_id, display_phone, verified_name, quality_rating, messaging_tier, status, verify_token, last_synced_at",
      )
      .eq("organization_id", req.auth!.organizationId)
      .maybeSingle();

    if (error) throw error;
    res.json({ data: data ?? null });
  }),
);

/**
 * Saves credentials and immediately validates them against the Graph API, so a
 * typo surfaces here rather than at the first campaign send.
 */
wabaRouter.post(
  "/",
  requireRole("admin"),
  validateBody(wabaCredentialsSchema),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const body = req.body as import("@wa/types").WabaCredentialsInput;

    let phoneNumber;
    try {
      phoneNumber = await meta.getPhoneNumber(body.phoneNumberId, body.accessToken);
    } catch (error) {
      throw badRequest(
        "Could not reach WhatsApp with these credentials. Check the phone number ID and access token.",
        error instanceof Error ? error.message : undefined,
      );
    }

    const { error } = await supabaseAdmin.from("waba_accounts").upsert(
      {
        organization_id: orgId,
        waba_id: body.wabaId,
        phone_number_id: body.phoneNumberId,
        display_phone: phoneNumber.display_phone_number,
        verified_name: phoneNumber.verified_name,
        access_token_encrypted: encrypt(body.accessToken),
        app_secret_encrypted: body.appSecret ? encrypt(body.appSecret) : null,
        verify_token: body.verifyToken,
        quality_rating: normalizeQualityRating(phoneNumber.quality_rating),
        messaging_tier: phoneNumber.messaging_limit_tier ?? "TIER_250",
        status: "connected",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      organization_id: orgId,
      actor_id: req.auth!.userId,
      action: "waba.connected",
      resource_type: "waba_account",
      resource_id: body.phoneNumberId,
    });

    res.status(201).json({
      displayPhone: phoneNumber.display_phone_number,
      verifiedName: phoneNumber.verified_name,
      qualityRating: normalizeQualityRating(phoneNumber.quality_rating),
    });
  }),
);

/**
 * Completes the WhatsApp Embedded Signup flow: the browser hands us the
 * authorization code the Facebook SDK returned, plus the WABA and phone
 * number ids the popup reported via postMessage. From here it's entirely
 * server-to-server — the user never sees or handles a token.
 */
wabaRouter.post(
  "/embedded-signup",
  requireRole("admin"),
  validateBody(
    z.object({
      code: z.string().min(1),
      wabaId: z.string().min(1),
      phoneNumberId: z.string().min(1),
    }),
  ),
  asyncHandler(async (req, res) => {
    if (!env.META_APP_ID || !env.META_APP_SECRET) {
      throw badRequest("Embedded Signup is not configured on this server");
    }

    const orgId = req.auth!.organizationId;
    const { code, wabaId, phoneNumberId } = req.body as {
      code: string;
      wabaId: string;
      phoneNumberId: string;
    };

    let accessToken: string;
    try {
      const shortLived = await meta.exchangeCodeForToken(code, env.META_APP_ID, env.META_APP_SECRET);
      const longLived = await meta.exchangeForLongLivedToken(
        shortLived.access_token,
        env.META_APP_ID,
        env.META_APP_SECRET,
      );
      accessToken = longLived.access_token;
    } catch (err) {
      logger.error({ err, orgId }, "Embedded Signup token exchange failed");
      throw badRequest(
        "Could not complete the connection with Meta. The signup session may have expired — please try again.",
      );
    }

    // A fresh Embedded Signup number needs a PIN to finish registering. If it
    // was already registered (e.g. the admin re-ran the flow) Meta returns an
    // error we can safely ignore — the number is usable either way.
    const pin = crypto.randomInt(100_000, 999_999).toString();
    try {
      await meta.registerPhoneNumber(phoneNumberId, accessToken, pin);
    } catch (err) {
      logger.warn({ err, phoneNumberId }, "Phone number registration skipped (likely already registered)");
    }

    // Required so Meta actually sends webhook events for a business-owned WABA
    // to our app, rather than only to whichever app originally created it.
    try {
      await meta.subscribeAppToWaba(wabaId, accessToken);
    } catch (err) {
      logger.warn({ err, wabaId }, "Could not subscribe app to WABA webhooks");
    }

    let phoneNumber;
    try {
      phoneNumber = await meta.getPhoneNumber(phoneNumberId, accessToken);
    } catch (err) {
      throw badRequest(
        "Connected to Meta but could not read the phone number details.",
        err instanceof Error ? err.message : undefined,
      );
    }

    const { error } = await supabaseAdmin.from("waba_accounts").upsert(
      {
        organization_id: orgId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone: phoneNumber.display_phone_number,
        verified_name: phoneNumber.verified_name,
        access_token_encrypted: encrypt(accessToken),
        app_secret_encrypted: encrypt(env.META_APP_SECRET),
        // Embedded Signup shares one webhook app-wide; reuse the platform token
        // rather than asking the tenant to invent one.
        verify_token: env.META_WEBHOOK_VERIFY_TOKEN ?? crypto.randomBytes(16).toString("hex"),
        quality_rating: normalizeQualityRating(phoneNumber.quality_rating),
        messaging_tier: phoneNumber.messaging_limit_tier ?? "TIER_250",
        status: "connected",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      organization_id: orgId,
      actor_id: req.auth!.userId,
      action: "waba.connected_via_embedded_signup",
      resource_type: "waba_account",
      resource_id: phoneNumberId,
    });

    res.status(201).json({
      displayPhone: phoneNumber.display_phone_number,
      verifiedName: phoneNumber.verified_name,
      qualityRating: normalizeQualityRating(phoneNumber.quality_rating),
    });
  }),
);

/** Re-reads quality rating and tier from Meta; also the health check for "Live". */
wabaRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const credentials = await getWabaCredentials(orgId);

    try {
      const phoneNumber = await meta.getPhoneNumber(
        credentials.phoneNumberId,
        credentials.accessToken,
      );

      await supabaseAdmin
        .from("waba_accounts")
        .update({
          display_phone: phoneNumber.display_phone_number,
          verified_name: phoneNumber.verified_name,
          quality_rating: normalizeQualityRating(phoneNumber.quality_rating),
          messaging_tier: phoneNumber.messaging_limit_tier ?? "TIER_250",
          status: "connected",
          last_synced_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId);

      res.json({
        status: "connected",
        qualityRating: normalizeQualityRating(phoneNumber.quality_rating),
        messagingTier: phoneNumber.messaging_limit_tier ?? "TIER_250",
      });
    } catch (error) {
      logger.warn({ err: error, orgId }, "WABA sync failed");
      await supabaseAdmin
        .from("waba_accounts")
        .update({ status: "error", last_synced_at: new Date().toISOString() })
        .eq("organization_id", orgId);
      throw error;
    }
  }),
);

wabaRouter.delete(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
      .from("waba_accounts")
      .delete()
      .eq("organization_id", req.auth!.organizationId);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

// ---------------------------------------------------------------- business profile
wabaRouter.get(
  "/business-profile",
  asyncHandler(async (req, res) => {
    const credentials = await getWabaCredentials(req.auth!.organizationId);
    const profile = await meta.getBusinessProfile(
      credentials.phoneNumberId,
      credentials.accessToken,
    );
    res.json(profile.data?.[0] ?? {});
  }),
);

wabaRouter.patch(
  "/business-profile",
  requireRole("manager"),
  validateBody(businessProfileSchema),
  asyncHandler(async (req, res) => {
    const credentials = await getWabaCredentials(req.auth!.organizationId);
    await meta.updateBusinessProfile(
      credentials.phoneNumberId,
      credentials.accessToken,
      req.body as Record<string, unknown>,
    );
    res.sendStatus(204);
  }),
);
