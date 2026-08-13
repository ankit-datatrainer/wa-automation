"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

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
          name: "WA Automations",
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
          theme: { color: "#16A34A" },
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

  if (config.isLoading) return <Skeleton className="mb-4 h-32" />;

  return (
    <Card className="mb-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current balance
            </p>
            <p className="text-2xl font-bold">
              {balance.data
                ? formatCurrency(balance.data.balance, balance.data.currency)
                : "—"}
            </p>
          </div>
        </div>

        {config.data?.configured ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              topUp.mutate();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex gap-1.5">
              {config.data.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={config.data.minimum}
              step="1"
              className="w-32"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Button type="submit" loading={topUp.isPending}>
              <Plus size={16} />
              Top up
            </Button>
          </form>
        ) : (
          <p className="max-w-sm text-sm text-muted-foreground">
            Payments are not configured. Add <code>RAZORPAY_KEY_ID</code> and{" "}
            <code>RAZORPAY_KEY_SECRET</code> to the API environment to enable self-service top-ups.
          </p>
        )}
      </div>
    </Card>
  );
}
