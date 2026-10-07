"use client";

import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { formatCurrency } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_COLORS, useCategoryBreakdown } from "./use-overview";

const LABELS: Record<string, string> = {
  marketing: "Marketing",
  utility: "Utility",
  authentication: "Auth",
  service: "Service",
};

/** Billed messages per template category, from the credit ledger. */
export function CategorySpendChart({ days, currency = "INR" }: { days: number; currency?: string }) {
  const { data, isLoading, isError, refetch } = useCategoryBreakdown(days);

  const rows = (data?.breakdown ?? []).map((row) => ({
    ...row,
    label: LABELS[row.category] ?? row.category,
  }));
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.totalCost, 0);
  const costByLabel = new Map(rows.map((r) => [r.label, r.totalCost]));

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <Layers size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Spend by category</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Billed conversations, last {days} days</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold tabular-nums">{formatCurrency(totalCost, currency)}</p>
          <p className="text-xs text-muted-foreground">{totalCount.toLocaleString()} billed</p>
        </div>
      </div>

      <div className="flex-1 px-3 pb-3 sm:px-4">
        {isLoading ? (
          <Skeleton className="mx-2 h-[200px]" />
        ) : isError ? (
          <div className="px-2">
            <ErrorState message="Could not load category spend." onRetry={() => void refetch()} />
          </div>
        ) : totalCount === 0 ? (
          <div className="mx-2 grid h-[200px] place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 text-center">
            <p className="text-sm text-muted-foreground">No billed conversations in this period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="28%">
              <defs>
                <linearGradient id="dash-cat-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.violet} />
                  <stop offset="55%" stopColor={CHART_COLORS.purple} />
                  <stop offset="100%" stopColor={CHART_COLORS.pink} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "rgba(131,58,180,0.06)", radius: 10 }}
                content={
                  <ChartTooltip
                    valueFormatter={(value) => value.toLocaleString()}
                    labelFormatter={(label) =>
                      `${label} · ${formatCurrency(costByLabel.get(label) ?? 0, currency)}`
                    }
                  />
                }
              />
              <Bar
                dataKey="count"
                name="Messages"
                fill="url(#dash-cat-bar)"
                radius={[10, 10, 4, 4]}
                maxBarSize={44}
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <Link
        href="/analytics/credits"
        className="group mx-5 mb-5 flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:mx-6"
      >
        View credit history
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Card>
  );
}
