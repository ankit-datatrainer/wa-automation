"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Lock, Plus, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { AnimatedNumber, FadeIn, motion } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";

interface BillingConfig {
  configured: boolean;
  keyId: string | null;
  presets: number[];
  minimum: number;
}

interface Balance {
  balance: number;
  currency: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Minimal surface of the Razorpay checkout script we actually use. */
interface RazorpayConstructor {
  new (options: Record<string, unknown>): { open: () => void };
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Loads the gateway script once, reusing it on subsequent top-ups. */
function loadCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function WalletTopUp() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const config = useQuery({
    queryKey: ["billing", "config"],
    queryFn: () => api.get<BillingConfig>("/billing/config"),
  });

  const balance = useQuery({
    queryKey: ["billing", "balance"],
    queryFn: () => api.get<Balance>("/billing/balance"),
  });

  const topUp = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value < (config.data?.minimum ?? 100)) {
        throw new Error(`Minimum top-up is ${config.data?.minimum ?? 100}`);
      }

      const loaded = await loadCheckoutScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Could not load the payment gateway. Check your connection.");
      }

      const order = await api.post<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>("/billing/topup", { amount: value });

      // Checkout is callback-based, so bridge it into the mutation's promise.
      return new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: "WA Automation",
          description: "Wallet top-up",
          order_id: order.orderId,
          handler: async (response: RazorpayResponse) => {
            try {
              await api.post("/billing/topup/verify", {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            // Closing the window is a cancellation, not a failure.
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
          theme: { color: "#833AB4" },
        });

        checkout.open();
      });
    },
    onSuccess: () => {
      toast.success("Wallet topped up");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics", "wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      if (error.message === "Payment cancelled") return;
      toast.error(
        error instanceof ApiClientError ? error.message : (error.message ?? "Top-up failed"),
      );
    },
  });

  if (config.isLoading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    );
  }

  const currency = balance.data?.currency ?? "INR";
  const minimum = config.data?.minimum ?? 100;
  const numeric = Number(amount);
  const belowMinimum = amount !== "" && (!Number.isFinite(numeric) || numeric < minimum);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Balance hero */}
      <FadeIn>
        <div className="relative h-full overflow-hidden rounded-2xl bg-brand-gradient bg-[length:200%_200%] p-6 text-white shadow-glow animate-gradient-x">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-brand-yellow/25 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-grid opacity-[0.07]"
          />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
                <Wallet size={14} />
                Messaging wallet
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                {currency}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/75">
                Current balance
              </p>
              <p className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                {balance.isError ? (
                  "—"
                ) : balance.data ? (
                  <AnimatedNumber
                    value={balance.data.balance}
                    format={(n) => formatCurrency(n, currency)}
                  />
                ) : (
                  <span className="inline-block h-10 w-40 animate-pulse rounded-lg bg-white/20 align-middle" />
                )}
              </p>
              <p className="mt-2 text-sm text-white/80">
                Conversation charges are deducted from this balance as messages are sent.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Top-up form */}
      <FadeIn delay={0.08}>
        <Card className="h-full p-6">
          {config.isError ? (
            <div className="flex h-full items-center gap-3 text-sm text-muted-foreground">
              <Info size={18} className="shrink-0 text-primary" />
              <p>
                Could not load payment settings.{" "}
                <button
                  type="button"
                  onClick={() => void config.refetch()}
                  className="font-semibold text-primary hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : config.data?.configured ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                topUp.mutate();
              }}
              className="flex h-full flex-col gap-5"
            >
              <div>
                <h2 className="font-display text-lg font-semibold">Add funds</h2>
                <p className="text-sm text-muted-foreground">
                  Pick an amount or enter your own. Minimum {formatCurrency(minimum, currency)}.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Quick amounts"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {config.data.presets.map((preset) => {
                  const selected = amount === String(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAmount(String(preset))}
                      className={cn(
                        "relative h-12 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        selected
                          ? "border-transparent text-white"
                          : "border-border bg-white hover:border-brand-200 hover:bg-brand-50/60",
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="topup-preset"
                          className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 tabular-nums">
                        {formatCurrency(preset, currency)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <label htmlFor="topup-amount" className="sr-only">
                    Custom amount
                  </label>
                  <Input
                    id="topup-amount"
                    type="number"
                    inputMode="numeric"
                    min={minimum}
                    step="1"
                    placeholder={`Custom amount (min ${minimum})`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-invalid={belowMinimum || undefined}
                    required
                  />
                  {belowMinimum && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                      Minimum top-up is {formatCurrency(minimum, currency)}
                    </p>
                  )}
                </div>
                <Button type="submit" loading={topUp.isPending} className="sm:min-w-[150px]">
                  {!topUp.isPending && <Plus size={16} />}
                  {amount && !belowMinimum ? `Pay ${formatCurrency(numeric, currency)}` : "Top up"}
                </Button>
              </div>

              <p className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="text-emerald-600" />
                Payments are processed securely by Razorpay. Your balance updates as soon as the
                payment is verified.
              </p>
            </form>
          ) : (
            <div className="flex h-full flex-col justify-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-brand-100">
                <Lock size={19} />
              </span>
              <h2 className="font-display text-lg font-semibold">Self-service top-ups are off</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Payments are not configured. Add{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">RAZORPAY_KEY_ID</code> and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">RAZORPAY_KEY_SECRET</code> to
                the API environment to enable self-service top-ups.
              </p>
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
