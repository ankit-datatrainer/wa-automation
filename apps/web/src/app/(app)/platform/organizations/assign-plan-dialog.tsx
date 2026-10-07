"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, CreditCard, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence, ease } from "@/components/motion";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { ConfirmDialog, Sheet } from "../_components/overlay";
import type { Plan } from "../plans/plan-editor";

type PlanRelation = { name: string; price: number; currency: string; billing_cycle: string };

interface OrgSubscription {
  id: string;
  status: string;
  cycle_count: number;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  plans: PlanRelation | PlanRelation[] | null;
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
  const [confirmCancel, setConfirmCancel] = useState(false);

  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<{ data: Plan[] }>("/platform/plans"),
  });

  const history = useQuery({
    queryKey: ["platform", "organizations", organizationId, "subscriptions"],
    queryFn: () =>
      api.get<{ data: OrgSubscription[] }>(`/platform/organizations/${organizationId}/subscriptions`),
  });

  const activePlans = (plans.data?.data ?? []).filter((p) => p.is_active);
  const selectedPlan = activePlans.find((p) => p.id === planId);
  const active = history.data?.data.find((s) => s.status === "active");
  const cycles = Math.min(60, Math.max(1, Number(cycleCount) || 1));

  const assign = useMutation({
    mutationFn: () =>
      api.post(`/platform/organizations/${organizationId}/subscriptions`, {
        planId,
        cycleCount: cycles,
        ...(notes.trim() && { notes: notes.trim() }),
      }),
    onSuccess: () => {
      toast.success("Plan assigned");
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
      setPlanId("");
      setNotes("");
      setCycleCount("1");
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not assign the plan"),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/platform/organizations/${organizationId}/subscriptions/cancel`),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      setConfirmCancel(false);
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not cancel"),
  });

  return (
    <>
      <Sheet
        onClose={onClose}
        icon={CreditCard}
        title="Subscription"
        description={organizationName}
        size="lg"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button
              type="submit"
              form="assign-plan-form"
              className="flex-1"
              loading={assign.isPending}
              disabled={!planId}
            >
              {!assign.isPending && <Check size={16} />}
              {active ? "Replace plan" : "Assign plan"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Current plan */}
          {history.isLoading ? (
            <Skeleton className="h-28" />
          ) : active ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-glow"
            >
              <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Current plan</p>
                  <p className="mt-1 font-display text-xl font-bold">
                    {toOne(active.plans)?.name ?? "Active plan"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                    <CalendarClock size={14} />
                    Renews or expires {new Date(active.ends_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">Active</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="relative mt-4 border-white/40 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setConfirmCancel(true)}
              >
                <XCircle size={14} />
                Cancel subscription
              </Button>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-brand-50/40 p-5 text-sm text-muted-foreground">
              No active subscription — this organization is on a trial or lapsed plan.
            </div>
          )}

          {/* Assign */}
          <form
            id="assign-plan-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (planId) assign.mutate();
            }}
            className="space-y-4"
          >
            <p className="font-display text-base font-semibold">
              {active ? "Assign a new plan" : "Assign a plan"}
            </p>

            {plans.isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : activePlans.length === 0 ? (
              <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                No active plans. Create one under Plans first.
              </p>
            ) : (
              <div role="radiogroup" aria-label="Plan" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activePlans.map((p) => {
                  const selected = p.id === planId;
                  return (
                    <motion.button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPlanId(selected ? "" : p.id)}
                      className={cn(
                        "relative rounded-2xl border bg-white p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        selected
                          ? "border-primary shadow-glow ring-1 ring-primary"
                          : "hover:border-brand-200 hover:shadow-soft",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{p.name}</p>
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                            selected ? "border-transparent bg-brand-gradient text-white" : "border-border",
                          )}
                        >
                          {selected && <Check size={12} />}
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {formatCurrency(Number(p.price), p.currency)}
                        <span className="text-xs font-medium text-muted-foreground">
                          /{p.billing_cycle === "yearly" ? "yr" : "mo"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.message_limit ? `${p.message_limit.toLocaleString()} msgs` : "Unlimited msgs"} ·{" "}
                        {p.agent_limit ? `${p.agent_limit} seats` : "Unlimited seats"}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            )}

            <AnimatePresence initial={false}>
              {selectedPlan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="overflow-hidden"
                >
                  <Field
                    label={`Duration (${selectedPlan.billing_cycle === "yearly" ? "years" : "months"})`}
                    hint={`${cycles} × ${selectedPlan.billing_cycle === "yearly" ? "year" : "month"} = ${formatCurrency(
                      Number(selectedPlan.price) * cycles,
                      selectedPlan.currency,
                    )} total`}
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
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Notes">
              {({ id }) => (
                <Input
                  id={id}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional — e.g. invoice number"
                />
              )}
            </Field>
          </form>

          {/* History */}
          {history.data && history.data.data.length > 0 && (
            <div>
              <p className="mb-3 font-display text-base font-semibold">History</p>
              <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
                {history.data.data.map((sub, i) => (
                  <motion.li
                    key={sub.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease, delay: Math.min(i, 10) * 0.04 }}
                    className="relative"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-[27px] top-3 h-3 w-3 rounded-full ring-4 ring-white",
                        sub.status === "active" ? "bg-brand-gradient" : "bg-muted-foreground/40",
                      )}
                    />
                    <div className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{toOne(sub.plans)?.name ?? "Plan"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sub.starts_at).toLocaleDateString()} –{" "}
                          {new Date(sub.ends_at).toLocaleDateString()}
                          {sub.notes ? ` · ${sub.notes}` : ""}
                        </p>
                      </div>
                      <Badge tone={sub.status === "active" ? "success" : statusTone(sub.status)} className="capitalize">
                        {sub.status}
                      </Badge>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Sheet>

      <AnimatePresence>
        {confirmCancel && (
          <ConfirmDialog
            key="cancel-sub"
            onClose={() => setConfirmCancel(false)}
            onConfirm={() => cancel.mutate()}
            loading={cancel.isPending}
            icon={XCircle}
            tone="destructive"
            title="Cancel subscription?"
            confirmLabel="Cancel subscription"
            description={`The active subscription for ${organizationName} will be marked cancelled. Its history is kept.`}
          />
        )}
      </AnimatePresence>
    </>
  );
}
