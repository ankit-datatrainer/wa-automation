import express, { Router } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { verifyMetaSignature } from "../lib/crypto.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { processWebhookEvent } from "../services/webhook-processor.js";
import { verifyWebhookSignature } from "../services/payments.js";
import { creditWalletForOrder } from "./billing.js";

export const webhookRouter = Router();

// Raw body is required for HMAC verification.
webhookRouter.use(express.raw({ type: "application/json", limit: "5mb" }));

/** Meta's subscription handshake. */
webhookRouter.get("/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.META_WEBHOOK_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  logger.warn({ mode }, "WhatsApp webhook verification failed");
  res.sendStatus(403);
});

/**
 * Inbound events (messages, statuses, template approvals, quality updates).
 *
 * Meta retries on any non-200, so we acknowledge immediately and persist the
 * raw payload; workers process it out-of-band and dedupe on `wamid`.
 */
webhookRouter.post("/whatsapp", async (req, res) => {
  const rawBody = req.body as Buffer;

  if (env.META_APP_SECRET) {
    const valid = verifyMetaSignature(
      rawBody,
      req.headers["x-hub-signature-256"] as string | undefined,
      env.META_APP_SECRET,
    );
    if (!valid) {
      logger.warn("Rejected webhook with invalid signature");
      return res.sendStatus(401);
    }
  }

  res.sendStatus(200);

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    const { data, error } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        provider: "whatsapp",
        payload,
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    await processWebhookEvent(data.id, payload);
  } catch (err) {
    logger.error({ err }, "Failed to process webhook event");
  }
});

/**
 * Razorpay payment notifications.
 *
 * The gateway is the authoritative confirmation: a customer who closes the tab
 * before the browser callback fires still gets credited from here. Crediting is
 * idempotent, so both paths arriving is harmless.
 */
webhookRouter.post("/razorpay", async (req, res) => {
  const rawBody = req.body as Buffer;

  if (!verifyWebhookSignature(rawBody, req.headers["x-razorpay-signature"] as string | undefined)) {
    logger.warn("Rejected Razorpay webhook with an invalid signature");
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      payload?: { payment?: { entity?: { id: string; order_id: string } } };
    };

    if (payload.event !== "payment.captured") return;

    const payment = payload.payload?.payment?.entity;
    if (!payment?.order_id) return;

    await creditWalletForOrder(payment.order_id, payment.id);
  } catch (err) {
    logger.error({ err }, "Failed to process Razorpay webhook");
  }
});
