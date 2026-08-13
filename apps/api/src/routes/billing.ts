import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";
import { badRequest, notFound } from "../lib/errors.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import {
  createTopUpOrder,
  isPaymentsConfigured,
  verifyCheckoutSignature,
} from "../services/payments.js";

export const billingRouter = Router();

billingRouter.use(requireAuth);

/** Lets the UI hide the top-up form when no gateway is configured. */
billingRouter.get(
  "/config",
  asyncHandler(async (_req, res) => {
    res.json({
      configured: isPaymentsConfigured(),
      provider: "razorpay",
      keyId: env.RAZORPAY_KEY_ID ?? null,
      // Presets shown as quick-select buttons in the top-up dialog.
      presets: [500, 1000, 2500, 5000],
      minimum: 100,
    });
  }),
);

billingRouter.get(
  "/balance",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("wallet_balance, currency")
      .eq("id", req.auth!.organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound("Organization");

    res.json({ balance: Number(data.wallet_balance), currency: data.currency });
  }),
);

/**
 * Step 1 of a top-up: create the gateway order and record it as pending.
 * No balance moves until the payment is confirmed.
 */
billingRouter.post(
  "/topup",
  requireRole("admin"),
  validateBody(
    z.object({
      amount: z.coerce.number().min(100, "Minimum top-up is 100").max(500_000),
    }),
  ),
  asyncHandler(async (req, res) => {
    if (!isPaymentsConfigured()) {
      throw badRequest(
        "Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable top-ups.",
      );
    }

    const orgId = req.auth!.organizationId;
    const { amount } = req.body as { amount: number };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("currency")
      .eq("id", orgId)
      .maybeSingle();

    const order = await createTopUpOrder(amount, orgId, org?.currency ?? "INR");

    const { error } = await supabaseAdmin.from("payment_orders").insert({
      organization_id: orgId,
      provider: "razorpay",
      provider_order_id: order.id,
      amount,
      currency: order.currency,
      status: "created",
      created_by: req.auth!.userId,
    });

    if (error) throw error;

    res.status(201).json({
      orderId: order.id,
      amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
    });
  }),
);

/**
 * Step 2: the browser reports a completed checkout.
 *
 * The signature is verified before any credit is applied, and the whole thing
 * is idempotent — the webhook may confirm the same payment concurrently, and
 * whichever arrives second must not double-credit the wallet.
 */
billingRouter.post(
  "/topup/verify",
  requireRole("admin"),
  validateBody(
    z.object({
      orderId: z.string().min(1),
      paymentId: z.string().min(1),
      signature: z.string().min(1),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { orderId, paymentId, signature } = req.body as {
      orderId: string;
      paymentId: string;
      signature: string;
    };

    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      logger.warn({ orderId, paymentId }, "Rejected top-up with an invalid signature");
      throw badRequest("Payment verification failed");
    }

    const credited = await creditWalletForOrder(orderId, paymentId);
    res.json(credited);
  }),
);

billingRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("payment_orders")
      .select("id, provider_order_id, amount, currency, status, created_at, paid_at")
      .eq("organization_id", req.auth!.organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

/**
 * Applies a successful payment to the wallet exactly once.
 *
 * Shared by the browser callback and the gateway webhook; the `status` guard on
 * the update is what makes a concurrent double-confirm safe.
 */
export async function creditWalletForOrder(
  providerOrderId: string,
  paymentId: string,
): Promise<{ credited: boolean; balance: number }> {
  const { data: order } = await supabaseAdmin
    .from("payment_orders")
    .select("id, organization_id, amount, status")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();

  if (!order) throw notFound("Payment order");

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("wallet_balance")
    .eq("id", order.organization_id)
    .maybeSingle();

  const currentBalance = Number(org?.wallet_balance ?? 0);

  // Already settled by the other confirmation path.
  if (order.status === "paid") {
    return { credited: false, balance: currentBalance };
  }

  // Only the caller that flips the row out of its unpaid state proceeds; a
  // concurrent confirmation matches zero rows and credits nothing.
  const { data: claimed } = await supabaseAdmin
    .from("payment_orders")
    .update({
      status: "paid",
      provider_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .neq("status", "paid")
    .select("id");

  if (!claimed?.length) {
    return { credited: false, balance: currentBalance };
  }

  const amount = Number(order.amount);
  const balanceAfter = currentBalance + amount;

  await supabaseAdmin.from("wallet_transactions").insert({
    organization_id: order.organization_id,
    type: "credit",
    amount,
    balance_after: balanceAfter,
    reference: paymentId,
    description: "Wallet top-up",
  });

  await supabaseAdmin
    .from("organizations")
    .update({ wallet_balance: balanceAfter })
    .eq("id", order.organization_id);

  logger.info(
    { organizationId: order.organization_id, amount, balanceAfter },
    "Wallet topped up",
  );

  return { credited: true, balance: balanceAfter };
}
