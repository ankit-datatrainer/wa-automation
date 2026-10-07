"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SegmentedTabs } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { Modal } from "../_components/overlay";

export interface WalletTarget {
  id: string;
  name: string;
  wallet_balance: number;
  currency: string;
}

/** Credits or debits a tenant wallet via POST /platform/organizations/:id/wallet. */
export function WalletDialog({ org, onClose }: { org: WalletTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const current = Number(org.wallet_balance);
  const parsed = Number(amount);
  const signed = Number.isFinite(parsed) && parsed > 0 ? (direction === "credit" ? parsed : -parsed) : 0;
  const after = current + signed;
  const invalid = signed === 0 || after < 0;

  const adjust = useMutation({
    mutationFn: () =>
      api.post(`/platform/organizations/${org.id}/wallet`, {
        amount: signed,
        description: note.trim().length >= 2 ? note.trim() : "Platform adjustment",
      }),
    onSuccess: () => {
      toast.success(direction === "credit" ? "Wallet credited" : "Wallet debited");
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Adjustment failed"),
  });

  return (
    <Modal
      onClose={onClose}
      icon={Wallet}
      title="Adjust wallet"
      description={org.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="wallet-adjust-form"
            loading={adjust.isPending}
            disabled={invalid}
          >
            {direction === "credit" ? "Credit wallet" : "Debit wallet"}
          </Button>
        </>
      }
    >
      <form
        id="wallet-adjust-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) adjust.mutate();
        }}
        className="space-y-5"
      >
        <div className="rounded-2xl border bg-brand-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current balance
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{formatCurrency(current, org.currency)}</p>
        </div>

        <SegmentedTabs
          layoutId="wallet-direction"
          className="w-full [&>button]:flex-1"
          value={direction}
          onChange={setDirection}
          tabs={[
            {
              value: "credit",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <ArrowDownLeft size={14} /> Credit
                </span>
              ),
            },
            {
              value: "debit",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUpRight size={14} /> Debit
                </span>
              ),
            },
          ]}
        />

        <Field label={`Amount (${org.currency})`} required>
          {({ id }) => (
            <Input
              id={id}
              required
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              autoFocus
            />
          )}
        </Field>

        <Field label="Reason" hint="Recorded in the tenant's ledger and the platform audit log.">
          {({ id }) => (
            <Input
              id={id}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={direction === "credit" ? "Goodwill credit" : "Chargeback correction"}
            />
          )}
        </Field>

        {signed !== 0 && (
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
              after < 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "bg-white",
            )}
          >
            <span className="text-muted-foreground">Balance after</span>
            <span className="font-bold">
              {after < 0 ? "Cannot go below zero" : formatCurrency(after, org.currency)}
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}
