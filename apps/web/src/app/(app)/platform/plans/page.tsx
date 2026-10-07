"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, MessageSquare, Pencil, Plus, Trash2, Users, UserSquare2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, HoverLift, SegmentedTabs, Spotlight, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { ConfirmDialog } from "../_components/overlay";
import { PlanEditor, type Plan } from "./plan-editor";

type Cycle = "monthly" | "yearly";

export default function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<{ data: Plan[] }>("/platform/plans"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ deactivated: boolean }>(`/platform/plans/${id}`),
    onSuccess: (result) => {
      toast.success(
        result?.deactivated ? "Plan is in use, so it was deactivated instead of deleted" : "Plan deleted",
      );
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete the plan"),
  });

  const rows = plans.data?.data ?? [];

  // Group monthly/yearly variants of the same plan into one card.
  const grouped = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const plan of rows) {
      const list = map.get(plan.name) ?? [];
      list.push(plan);
      map.set(plan.name, list);
    }
    return [...map.entries()];
  }, [rows]);

  // The most expensive active group is highlighted as the flagship tier.
  const featuredName = useMemo(() => {
    let best: { name: string; price: number } | null = null;
    for (const [name, variants] of grouped) {
      const v = variants.find((p) => p.billing_cycle === cycle && p.is_active);
      if (v && (!best || Number(v.price) > best.price)) best = { name, price: Number(v.price) };
    }
    return grouped.length > 1 ? best?.name : undefined;
  }, [grouped, cycle]);

  return (
    <>
      <PageHeader
        title="Subscription Plans"
        description="The pricing tiers you can assign to organizations, billed monthly or yearly."
        onRefresh={() => void plans.refetch()}
        refreshing={plans.isFetching}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} />
            New plan
          </Button>
        }
      />

      {rows.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs<Cycle>
            layoutId="plans-cycle"
            value={cycle}
            onChange={setCycle}
            tabs={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{rows.length}</span> plan variants ·{" "}
            <span className="font-semibold text-foreground">{rows.filter((p) => p.is_active).length}</span> active
          </p>
        </div>
      )}

      {plans.isError ? (
        <ErrorState message="Could not load plans." onRetry={() => void plans.refetch()} />
      ) : plans.isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="No plans yet"
            description="Create a plan so you can assign it to organizations."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus size={16} />
                Create your first plan
              </Button>
            }
          />
        </Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map(([name, variants]) => {
            const sorted = [...variants].sort((a, b) => a.billing_cycle.localeCompare(b.billing_cycle));
            const primary = sorted.find((p) => p.billing_cycle === cycle) ?? sorted[0]!;
            const anyActive = variants.some((v) => v.is_active);
            const featured = name === featuredName;
            return (
              <StaggerItem key={name} className="h-full">
                <HoverLift className="h-full">
                  <Spotlight
                    className={cn(
                      "flex h-full flex-col rounded-3xl border bg-white p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift",
                      featured && "border-transparent ring-2 ring-primary/70",
                      !anyActive && "opacity-75",
                    )}
                  >
                    {featured && (
                      <span className="absolute right-5 top-5 rounded-full bg-brand-gradient px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-glow">
                        Flagship
                      </span>
                    )}
                    <div className={cn("relative flex items-start gap-3", featured && "pr-20")}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                        <CreditCard size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-xl font-bold">{name}</h2>
                        {!anyActive && <Badge tone="neutral">Inactive</Badge>}
                      </div>
                    </div>

                    {primary.description && (
                      <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{primary.description}</p>
                    )}

                    <p className="relative mt-5 font-display text-4xl font-bold tracking-tight">
                      {primary.billing_cycle === cycle ? (
                        <>
                          {formatCurrency(Number(primary.price), primary.currency)}
                          <span className="text-sm font-medium text-muted-foreground">
                            /{cycle === "yearly" ? "year" : "month"}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-medium text-muted-foreground">
                          No {cycle} variant
                        </span>
                      )}
                    </p>

                    <ul className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                      <Limit icon={MessageSquare} label="Messages" value={primary.message_limit} />
                      <Limit icon={Users} label="Contacts" value={primary.contact_limit} />
                      <Limit icon={UserSquare2} label="Seats" value={primary.agent_limit} />
                    </ul>

                    {primary.features?.length > 0 && (
                      <ul className="relative mt-5 space-y-2 text-sm">
                        {primary.features.slice(0, 6).map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-gradient text-white">
                              <Check size={10} strokeWidth={3} />
                            </span>
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                        {primary.features.length > 6 && (
                          <li className="pl-6 text-xs text-muted-foreground">+{primary.features.length - 6} more</li>
                        )}
                      </ul>
                    )}

                    <div className="relative mt-auto pt-6">
                    <div className="space-y-2 border-t pt-4">
                      {sorted.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-brand-50/50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold capitalize">
                              {plan.billing_cycle}
                              {!plan.is_active && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">inactive</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(Number(plan.price), plan.currency)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setEditing(plan)}
                              aria-label={`Edit ${plan.name} ${plan.billing_cycle}`}
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-rose-50"
                              onClick={() => setDeleting(plan)}
                              aria-label={`Delete ${plan.name} ${plan.billing_cycle}`}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </Spotlight>
                </HoverLift>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <AnimatePresence>
        {editing && (
          <PlanEditor
            key={editing === "new" ? "new-plan" : editing.id}
            plan={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <ConfirmDialog
            key={`delete-${deleting.id}`}
            onClose={() => setDeleting(null)}
            onConfirm={() => remove.mutate(deleting.id)}
            loading={remove.isPending}
            icon={Trash2}
            tone="destructive"
            title="Delete plan?"
            confirmLabel="Delete plan"
            description={
              <>
                <span className="font-semibold text-foreground">
                  {deleting.name} ({deleting.billing_cycle})
                </span>{" "}
                will be removed. If any organization has been assigned this plan it is deactivated instead,
                so billing history stays intact.
              </>
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Limit({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
}) {
  return (
    <li className="rounded-xl border bg-white px-2 py-2.5">
      <Icon size={14} className="mx-auto text-primary" />
      <p className="mt-1 text-sm font-bold">{value ? value.toLocaleString() : "∞"}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </li>
  );
}
