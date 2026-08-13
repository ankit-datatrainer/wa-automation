"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type { Plan } from "../plans/plan-editor";

interface OrgSubscription {
  id: string;
  status: string;
  cycle_count: number;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  plans: { name: string; price: number; currency: string; billing_cycle: string } | { name: string; price: number; currency: string; billing_cycle: string }[] | null;
}

function toOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function AssignPlanDialog({
  organizationId,
  organizationName,
  onClose,
}: {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState("");
  const [cycleCount, setCycleCount] = useState("1");
  const [notes, setNotes] = useState("");

  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<{ data: Plan[] }>("/platform/plans"),
  });

  const history = useQuery({
    queryKey: ["platform", "organizations", organizationId, "subscriptions"],
    queryFn: () =>
      api.get<{ data: OrgSubscription[] }>(`/platform/organizations/${organizationId}/subscriptions`),
  });

  const selectedPlan = plans.data?.data.find((p) => p.id === planId);
  const active = history.data?.data.find((s) => s.status === "active");

  const assign = useMutation({
    mutationFn: () =>
      api.post(`/platform/organizations/${organizationId}/subscriptions`, {
        planId,
        cycleCount: Number(cycleCount),
        ...(notes.trim() && { notes: notes.trim() }),
      }),
    onSuccess: () => {
      toast.success("Plan assigned");
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
      void history.refetch();
      setPlanId("");
      setNotes("");
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not assign the plan"),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/platform/organizations/${organizationId}/subscriptions/cancel`),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
      void history.refetch();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not cancel"),
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1 bg-black/40" />

      <aside className="flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">Subscription</h2>
            <p className="text-sm text-muted-foreground">{organizationName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {active && (
            <div className="rounded-lg border border-primary/30 bg-accent p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold">{toOne(active.plans)?.name ?? "Active plan"}</p>
                <Badge tone="success">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Renews or expires {new Date(active.ends_at).toLocaleDateString()}
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="mt-3"
                loading={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Cancel subscription
              </Button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              assign.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold">
              {active ? "Assign a new plan" : "Assign a plan"}
            </p>

            <Field label="Plan" required>
              {({ id }) =>
                plans.isLoading ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <Select id={id} required value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    <option value="">Select a plan...</option>
                    {plans.data?.data
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(Number(p.price), p.currency)}/
                          {p.billing_cycle === "yearly" ? "yr" : "mo"}
                        </option>
                      ))}
                  </Select>
                )
              }
            </Field>

            {planId && (
              <Field
                label={`Duration (${selectedPlan?.billing_cycle === "yearly" ? "years" : "months"})`}
                hint={
                  selectedPlan
                    ? `${cycleCount} × ${selectedPlan.billing_cycle === "yearly" ? "year" : "month"} = ${formatCurrency(Number(selectedPlan.price) * Number(cycleCount || 1), selectedPlan.currency)} total`
                    : undefined
                }
              >
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    max={60}
                    value={cycleCount}
                    onChange={(e) => setCycleCount(e.target.value)}
                  />
                )}
              </Field>
            )}

            <Field label="Notes">
              {({ id }) => (
                <Input id={id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
              )}
            </Field>

            <Button type="submit" className="w-full" loading={assign.isPending} disabled={!planId}>
              Assign plan
            </Button>
          </form>

          {history.data && history.data.data.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">History</p>
              <ul className="space-y-2">
                {history.data.data.map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{toOne(sub.plans)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.starts_at).toLocaleDateString()} –{" "}
                        {new Date(sub.ends_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge tone={statusTone(sub.status)}>{sub.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
