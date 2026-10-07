"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Inbox, LifeBuoy, Plus, Timer } from "lucide-react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { FadeIn, Stagger, StaggerItem, ease, motion } from "@/components/motion";
import { api } from "@/lib/api-client";
import { KpiTile } from "../../analytics/_components/kpi-tile";
import { CHART, ChartTooltip } from "../../analytics/_components/chart-kit";
import { STATUS_COLORS, PRIORITY_COLORS, labelize } from "../_components/ticket-meta";

interface Reports {
  total: number;
  open: number;
  resolved: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionHours: number;
}

const STATUS_ORDER = ["open", "in_progress", "waiting", "resolved", "closed"];
const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

function formatHours(hours: number) {
  if (hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

export default function SupportReportsPage() {
  const reports = useQuery({
    queryKey: ["support-reports"],
    queryFn: () => api.get<Reports>("/support/reports"),
  });

  const data = reports.data;
  const resolutionRate = data && data.total > 0 ? (data.resolved / data.total) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Support Reports"
        description="Ticket volume, breakdown and average time to resolution."
        actions={
          <Link href="/support/tickets" className={buttonVariants({ variant: "outline" })}>
            <LifeBuoy size={16} />
            View tickets
          </Link>
        }
        onRefresh={() => void reports.refetch()}
        refreshing={reports.isFetching}
      />

      {reports.isError ? (
        <ErrorState
          message="Could not load support reports."
          onRetry={() => void reports.refetch()}
        />
      ) : reports.isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-2xl" />
          ))}
        </div>
      ) : data.total === 0 ? (
        <Card>
          <EmptyState
            icon={LifeBuoy}
            title="No tickets raised yet"
            description="Once your team raises support tickets, volume and resolution times will be reported here."
            action={
              <Link href="/support/tickets?new=1" className={buttonVariants()}>
                <Plus size={16} />
                Raise a ticket
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <KpiTile
                featured
                icon={Inbox}
                label="Total tickets"
                value={data.total}
                hint="All time"
              />
            </StaggerItem>
            <StaggerItem>
              <KpiTile
                icon={Clock}
                label="Currently open"
                value={data.open}
                hint="Open or in progress"
              />
            </StaggerItem>
            <StaggerItem>
              <KpiTile
                icon={CheckCircle2}
                label="Resolved"
                value={data.resolved}
                hint={`${resolutionRate.toFixed(0)}% resolution rate`}
              />
            </StaggerItem>
            <StaggerItem>
              <KpiTile
                icon={Timer}
                label="Avg. resolution"
                value={formatHours(data.averageResolutionHours)}
                hint="From raised to resolved"
              />
            </StaggerItem>
          </Stagger>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FadeIn delay={0.1}>
              <StatusDonut counts={data.byStatus} total={data.total} />
            </FadeIn>
            <FadeIn delay={0.16}>
              <Breakdown
                title="By priority"
                description="How urgent incoming issues are"
                counts={data.byPriority}
                order={PRIORITY_ORDER}
                colors={PRIORITY_COLORS}
                total={data.total}
              />
            </FadeIn>
          </div>
        </>
      )}
    </>
  );
}

function sortEntries(counts: Record<string, number>, order: string[]) {
  return Object.entries(counts).sort((a, b) => {
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function StatusDonut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = sortEntries(counts, STATUS_ORDER).map(([key, value]) => ({
    name: labelize(key),
    key,
    value,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">By status</CardTitle>
        <CardDescription>Where every ticket currently sits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[200px_1fr]">
          <div className="relative mx-auto h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={entries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                  animationDuration={800}
                >
                  {entries.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? CHART.violet} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Tickets
                </p>
                <p className="font-display text-2xl font-bold">{total.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-brand-50/60"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: STATUS_COLORS[entry.key] ?? CHART.violet }}
                  />
                  {entry.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{entry.value}</span>
                  <span className="ml-2 text-xs">
                    {total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  description,
  counts,
  order,
  colors,
  total,
}: {
  title: string;
  description: string;
  counts: Record<string, number>;
  order: string[];
  colors: Record<string, string>;
  total: number;
}) {
  const entries = sortEntries(counts, order);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <ul className="space-y-5">
            {entries.map(([key, count], i) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <li key={key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{labelize(key)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{count}</span>
                      <span className="ml-2 text-xs">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-50">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: colors[key] ?? CHART.purple }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease, delay: 0.2 + i * 0.08 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
