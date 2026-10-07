"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatedNumber, motion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_COLORS, useOverview } from "./use-overview";

export function DeliveryRateChart({ days }: { days: number }) {
  const { data, isLoading, isError, refetch } = useOverview(days);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totals = data?.totals;
  const segments = totals
    ? [
        { name: "Read", value: totals.read, color: CHART_COLORS.purple },
        { name: "Delivered", value: Math.max(0, totals.delivered - totals.read), color: CHART_COLORS.lilac },
        {
          name: "Sent (undelivered)",
          value: Math.max(0, totals.outbound - totals.delivered - totals.failed),
          color: CHART_COLORS.lavender,
        },
        { name: "Failed", value: totals.failed, color: CHART_COLORS.rose },
      ]
    : [];
  const pie = segments.filter((s) => s.value > 0);
  const total = pie.reduce((sum, s) => sum + s.value, 0);
  const rate = (totals?.deliveryRate ?? 0) * 100;
  const active = activeIndex !== null ? pie[activeIndex] : undefined;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <CheckCheck size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Delivery rate</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Outbound outcome, last {days} days</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        {isLoading ? (
          <Skeleton className="h-[260px]" />
        ) : isError ? (
          <ErrorState message="Could not load delivery stats." onRetry={() => void refetch()} />
        ) : pie.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 py-12 text-center">
            <div>
              <p className="font-display text-base font-semibold">Nothing sent yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your delivery breakdown appears once outbound messages go out.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mx-auto h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={94}
                    paddingAngle={3}
                    cornerRadius={8}
                    strokeWidth={0}
                    animationDuration={700}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {pie.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                        style={{ transition: "opacity 200ms ease", outline: "none" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <motion.div
                  key={active?.name ?? "rate"}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {active ? (
                    <>
                      <p className="font-display text-2xl font-bold tabular-nums">
                        {((active.value / total) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">{active.name}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-3xl font-bold text-gradient">
                        <AnimatedNumber value={rate} format={(n) => `${n.toFixed(1)}%`} />
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">delivered</p>
                    </>
                  )}
                </motion.div>
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-2">
              {segments.map((segment) => {
                const index = pie.findIndex((p) => p.name === segment.name);
                return (
                  <li
                    key={segment.name}
                    onMouseEnter={() => index >= 0 && setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-xs transition-colors",
                      index >= 0 && activeIndex === index && "border-brand-100 bg-brand-50/60",
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: segment.color }} />
                    <span className="truncate text-muted-foreground">{segment.name}</span>
                    <span className="ml-auto font-semibold tabular-nums">{segment.value.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
