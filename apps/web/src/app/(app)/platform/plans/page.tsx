"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { PlanEditor, type Plan } from "./plan-editor";

export default function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Plan | "new" | null>(null);

  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<{ data: Plan[] }>("/platform/plans"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ deactivated: boolean }>(`/platform/plans/${id}`),
    onSuccess: (result) => {
      toast.success(
        result.deactivated
          ? "Plan is in use, so it was deactivated instead of deleted"
          : "Plan deleted",
      );
      void queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete the plan"),
  });

  const rows = plans.data?.data ?? [];
  // Group monthly/yearly variants of the same plan side by side.
  const grouped = new Map<string, Plan[]>();
  for (const plan of rows) {
    const list = grouped.get(plan.name) ?? [];
    list.push(plan);
    grouped.set(plan.name, list);
  }

  return (
    <>
      <PageHeader
        title="Subscription Plans"
        description="The pricing tiers you can assign to organizations, billed monthly or yearly."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} />
            New plan
          </Button>
        }
      />

      {plans.isError ? (
        <ErrorState message="Could not load plans." onRetry={() => void plans.refetch()} />
      ) : plans.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="No plans yet"
            description="Create a plan so you can assign it to organizations."
            action={<Button onClick={() => setEditing("new")}>Create your first plan</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...grouped.entries()].map(([name, variants]) => (
            <Card key={name} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">{name}</h2>
                {!variants.some((v) => v.is_active) && <Badge tone="neutral">Inactive</Badge>}
              </div>
              {variants[0]?.description && (
                <p className="text-sm text-muted-foreground">{variants[0].description}</p>
              )}

              <div className="space-y-2">
                {variants
                  .sort((a, b) => a.billing_cycle.localeCompare(b.billing_cycle))
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-bold">
                          {formatCurrency(Number(plan.price), plan.currency)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {" "}
                            /{plan.billing_cycle === "yearly" ? "year" : "month"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {plan.message_limit ? `${plan.message_limit.toLocaleString()} msgs` : "Unlimited msgs"}
                          {" · "}
                          {plan.agent_limit ? `${plan.agent_limit} seats` : "Unlimited seats"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(plan)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove.mutate(plan.id)}
                          aria-label={`Delete ${plan.name} ${plan.billing_cycle}`}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>

              {variants[0]?.features?.length > 0 && (
                <ul className="space-y-1 border-t pt-3 text-sm text-muted-foreground">
                  {variants[0].features.slice(0, 5).map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <PlanEditor
          plan={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
          }}
        />
      )}
    </>
  );
}
