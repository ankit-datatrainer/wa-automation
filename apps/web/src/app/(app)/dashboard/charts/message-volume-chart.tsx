"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatedNumber, SegmentedTabs } from "@/components/motion";
import { cn } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";
import {
  CHART_COLORS,
  PERIOD_TABS,
  fillSeries,
  formatDay,
  useOverview,
  type PeriodValue,
} from "./use-overview";

type SeriesKey = "outbound" | "inbound";

const SERIES: { key: SeriesKey; label: string; color: string; icon: typeof ArrowUpRight }[] = [
  { key: "outbound", label: "Outbound", color: CHART_COLORS.purple, icon: ArrowUpRight },
  { key: "inbound", label: "Inbound", color: CHART_COLORS.pink, icon: ArrowDownLeft },
];

export function MessageVolumeChart({
  period,
  onPeriodChange,
}: {
  period: PeriodValue;
  onPeriodChange: (period: PeriodValue) => void;
}) {
  const days = Number(period);
  const { data, isLoading, isError, refetch, isFetching } = useOverview(days);
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  const series = useMemo(() => fillSeries(data?.series, days), [data?.series, days]);
  const hasTraffic = (data?.totals.inbound ?? 0) + (data?.totals.outbound ?? 0) > 0;

  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < SERIES.length - 1) next.add(key);
      return next;
    });

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <Activity size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Message volume</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Inbound vs outbound messages over the last {days} days
          </p>
        </div>
        <SegmentedTabs
          tabs={PERIOD_TABS}
          value={period}
          onChange={onPeriodChange}
          layoutId="dashboard-volume-period"
        />
      </div>

      <div className="flex flex-wrap gap-2 px-5 sm:px-6">
        {SERIES.map((s) => {
          const off = hidden.has(s.key);
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={!off}
              aria-label={`${off ? "Show" : "Hide"} ${s.label.toLowerCase()} series`}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                off
                  ? "border-dashed border-border bg-white opacity-60"
                  : "border-border/80 bg-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift",
              )}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-lg text-white"
                style={{ background: s.color }}
              >
                <Icon size={14} />
              </span>
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </span>
                <span className="block font-display text-base font-bold leading-tight">
                  {data ? <AnimatedNumber value={data.totals[s.key]} /> : "—"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={cn("relative flex-1 px-2 pb-4 pt-4 transition-opacity sm:px-4", isFetching && !isLoading && "opacity-70")}>
        {isLoading ? (
          <Skeleton className="mx-3 h-[260px]" />
        ) : isError ? (
          <div className="px-3">
            <ErrorState message="Could not load message volume." onRetry={() => void refetch()} />
          </div>
        ) : !hasTraffic ? (
          <div className="mx-3 grid h-[260px] place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 text-center">
            <div>
              <p className="font-display text-base font-semibold">No messages in this period</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send a campaign or reply in the inbox to see your volume trend here.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`dash-vol-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={44}
              />
              <Tooltip
                cursor={{ stroke: CHART_COLORS.lilac, strokeWidth: 1, strokeDasharray: "4 4" }}
                content={<ChartTooltip labelFormatter={formatDay} />}
              />
              {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill={`url(#dash-vol-${s.key})`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 3, stroke: "#fff", fill: s.color }}
                  animationDuration={700}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
