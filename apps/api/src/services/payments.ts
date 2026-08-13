import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { upstreamError } from "../lib/errors.js";

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

export function isPaymentsConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  const credentials = `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
}

/**
 * Creates a Razorpay order for a wallet top-up.
 *
 * Razorpay works in the currency's smallest unit, so rupees are converted to
 * paise here and back again on the way out — keeping that conversion in one
 * place avoids hundred-fold billing mistakes.
 */
export async function createTopUpOrder(
  amountInRupees: number,
  organizationId: string,
  currency = "INR",
): Promise<RazorpayOrder> {
  const response = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountInRupees * 100),
      currency,
      // Ties the payment back to the tenant when the webhook arrives.
      receipt: `wallet_${organizationId}_${Date.now()}`,
      notes: { organizationId, purpose: "wallet_topup" },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as RazorpayOrder & {
    error?: { description?: string };
  };

  if (!response.ok || body.error) {
    logger.error({ status: response.status, error: body.error }, "Razorpay order creation failed");
    throw upstreamError(body.error?.description ?? "Could not create the payment order");
  }

  return body;
}

/**
 * Verifies the signature Razorpay returns to the browser after checkout.
 * Signed over `order_id|payment_id` with the API secret.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return timingSafeEqualHex(expected, signature);
}

/**
 * Verifies a Razorpay webhook against the raw request body.
 * Uses the webhook secret, which is distinct from the API secret.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(expected, signature);
}

/** Constant-time comparison that tolerates malformed input without throwing. */
function timingSafeEqualHex(expected: string, received: string): boolean {
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Razorpay reports amounts in paise; the wallet ledger stores rupees. */
export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}
