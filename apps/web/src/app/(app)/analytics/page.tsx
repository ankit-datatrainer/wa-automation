"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  CheckCheck,
  CreditCard,
  Eye,
  History,
  Inbox,
  MessageSquare,
  PieChart as PieIcon,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import {
  AnimatedNumber,
  FadeIn,
  HoverLift,
  SegmentedTabs,
  Spotlight,
  Stagger,
  StaggerItem,
  ease,
  motion,
} from "@/components/motion";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { KpiTile } from "./_components/kpi-tile";
import {
  CHART,
  ChartTooltip,
  LegendDot,
  SERIES_COLORS,
  axisProps,
  formatShortDate,
} from "./_components/chart-kit";

/* ── Types ── */

interface DayBucket {
  date: string;
  inbound: number;
  outbound: number;
  delivered: number;
  read: number;
  failed: number;
}

interface OverviewResponse {
  series: DayBucket[];
  totals: {
    inbound: number;
    outbound: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
  };
}

interface CategoryRow {
  category: string;
  count: number;
  totalCost: number;
}

interface AgentRow {
  agentId: string;
  name: string;
  conversations: number;
  resolved: number;
}

type Period = "7" | "30" | "90";
type ActivityView = "volume" | "delivery";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
];

const CATEGORY_COLORS: Record<string, string> = {
  marketing: CHART.purple,
  utility: CHART.magenta,
  authentication: CHART.pink,
  service: CHART.orange,
};

const LINKS = [
  {
    href: "/analytics/credits",
    icon: CreditCard,
    label: "Credit History",
    desc: "Every conversation charge",
  },
  { href: "/analytics/wallet", icon: Wallet, label: "Wallet History", desc: "Top-ups and balance" },
  {
    href: "/analytics/subscriptions",
    icon: History,
    label: "Subscription History",
    desc: "Plans and invoices",
  },
  {
    href: "/analytics/chats",
    icon: MessageSquare,
    label: "Chat History",
    desc: "Conversation-level detail",
  },
] as const;

const percent = (n: number) => `${n.toFixed(1)}%`;

/** The API only returns days that had traffic; pad the range so the chart is continuous. */
function fillSeries(series: DayBucket[], days: number): DayBucket[] {
  const byDate = new Map(series.map((b) => [b.date, b]));
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push(
      byDate.get(date) ?? { date, inbound: 0, outbound: 0, delivered: 0, read: 0, failed: 0 },
    );
  }
  return out;
}

/* ── Page ── */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30");
  const [view, setView] = useState<ActivityView>("volume");
  const days = Number(period);

  const overview = useQuery({
    queryKey: ["analytics", "overview", { days }],
    queryFn: () => api.get<OverviewResponse>("/analytics/overview", { days }),
    // Keep the current window on screen while another period loads.
    placeholderData: keepPreviousData,
  });

  const categories = useQuery({
    queryKey: ["analytics", "category-breakdown", { days }],
    queryFn: () => api.get<{ breakdown: CategoryRow[] }>("/analytics/category-breakdown", { days }),
    // Keep the current window on screen while another period loads.
    placeholderData: keepPreviousData,
  });

  const agents = useQuery({
    queryKey: ["analytics", "agent-performance", { days }],
    queryFn: () => api.get<{ agents: AgentRow[] }>("/analytics/agent-performance", { days }),
    // Keep the current window on screen while another period loads.
    placeholderData: keepPreviousData,
  });

  const balance = useQuery({
    queryKey: ["billing", "balance"],
    queryFn: () => api.get<{ balance: number; currency: string }>("/billing/balance"),
  });

  const totals = overview.data?.totals;
  const series = useMemo(
    () => fillSeries(overview.data?.series ?? [], days),
    [overview.data, days],
  );
  const breakdown = categories.data?.breakdown ?? [];
  const agentList = agents.data?.agents ?? [];
  const currency = balance.data?.currency ?? "INR";

  const readRate = totals && totals.outbound > 0 ? (totals.read / totals.outbound) * 100 : 0;
  const hasTraffic = series.some((d) => d.inbound > 0 || d.outbound > 0);

  const refreshing = overview.isFetching || categories.isFetching || agents.isFetching;
  const refetchAll = () => {
    void overview.refetch();
    void categories.refetch();
    void agents.refetch();
    void balance.refetch();
  };

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Message volume, delivery performance, spend and agent activity across your account."
        actions={
          <SegmentedTabs
            tabs={PERIODS}
            value={period}
            onChange={setPeriod}
            layoutId="analytics-period"
          />
        }
        onRefresh={refetchAll}
        refreshing={refreshing}
      />

      {/* ── KPIs ── */}
      {overview.isError ? (
        <ErrorState message="Could not load analytics." onRetry={() => void overview.refetch()} />
      ) : !totals ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StaggerItem>
            <KpiTile
              featured
              icon={Send}
              label="Messages sent"
              value={totals.outbound}
              hint={`Outbound in the last ${days} days`}
            />
          </StaggerItem>
          <StaggerItem>
            <KpiTile
              icon={Inbox}
              label="Messages received"
              value={totals.inbound}
              hint="Inbound replies and new chats"
            />
          </StaggerItem>
          <StaggerItem>
            <KpiTile
              icon={CheckCheck}
              label="Delivery rate"
              value={totals.deliveryRate * 100}
              format={percent}
              hint={`${totals.delivered.toLocaleString()} delivered · ${totals.failed.toLocaleString()} failed`}
            />
          </StaggerItem>
          <StaggerItem>
            <KpiTile
              icon={Eye}
              label="Read rate"
              value={readRate}
              format={percent}
              hint={`${totals.read.toLocaleString()} messages read`}
            />
          </StaggerItem>
        </Stagger>
      )}

      {/* ── Activity + funnel ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <FadeIn delay={0.1} className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Message activity</CardTitle>
                <CardDescription>
                  {view === "volume"
                    ? `Daily inbound and outbound messages — last ${days} days`
                    : `Delivered, read and failed messages per day — last ${days} days`}
                </CardDescription>
              </div>
              <SegmentedTabs
                tabs={[
                  { value: "volume", label: "Volume" },
                  { value: "delivery", label: "Delivery" },
                ]}
                value={view}
                onChange={setView}
                layoutId="analytics-activity-view"
              />
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : !hasTraffic ? (
                <ChartEmpty
                  icon={BarChart3}
                  title="No messages in this period"
                  description="Send a campaign or reply from the inbox and your activity will chart here."
                />
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
                    {view === "volume" ? (
                      <>
                        <LegendDot
                          color={CHART.purple}
                          label="Outbound"
                          value={totals?.outbound.toLocaleString()}
                        />
                        <LegendDot
                          color={CHART.pink}
                          label="Inbound"
                          value={totals?.inbound.toLocaleString()}
                        />
                      </>
                    ) : (
                      <>
                        <LegendDot
                          color={CHART.purple}
                          label="Delivered"
                          value={totals?.delivered.toLocaleString()}
                        />
                        <LegendDot
                          color={CHART.magenta}
                          label="Read"
                          value={totals?.read.toLocaleString()}
                        />
                        <LegendDot
                          color={CHART.orange}
                          label="Failed"
                          value={totals?.failed.toLocaleString()}
                        />
                      </>
                    )}
                  </div>
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease }}
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                        <defs>
                          <linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.purple} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CHART.purple} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gPink" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.pink} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={CHART.pink} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gMagenta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.magenta} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={CHART.magenta} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gOrange" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.orange} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={CHART.orange} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          minTickGap={24}
                          {...axisProps}
                        />
                        <YAxis allowDecimals={false} width={44} {...axisProps} />
                        <Tooltip
                          cursor={{ stroke: CHART.purple, strokeOpacity: 0.25, strokeWidth: 1.5 }}
                          content={<ChartTooltip labelFormatter={formatShortDate} />}
                        />
                        {view === "volume" ? (
                          <>
                            <Area
                              type="monotone"
                              dataKey="outbound"
                              name="Outbound"
                              stroke={CHART.purple}
                              strokeWidth={2.5}
                              fill="url(#gPurple)"
                              dot={false}
                              activeDot={{
                                r: 5,
                                strokeWidth: 3,
                                stroke: "#fff",
                                fill: CHART.purple,
                              }}
                              animationDuration={700}
                            />
                            <Area
                              type="monotone"
                              dataKey="inbound"
                              name="Inbound"
                              stroke={CHART.pink}
                              strokeWidth={2}
                              fill="url(#gPink)"
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 3, stroke: "#fff", fill: CHART.pink }}
                              animationDuration={700}
                            />
                          </>
                        ) : (
                          <>
                            <Area
                              type="monotone"
                              dataKey="delivered"
                              name="Delivered"
                              stroke={CHART.purple}
                              strokeWidth={2.5}
                              fill="url(#gPurple)"
                              dot={false}
                              activeDot={{
                                r: 5,
                                strokeWidth: 3,
                                stroke: "#fff",
                                fill: CHART.purple,
                              }}
                              animationDuration={700}
                            />
                            <Area
                              type="monotone"
                              dataKey="read"
                              name="Read"
                              stroke={CHART.magenta}
                              strokeWidth={2}
                              fill="url(#gMagenta)"
                              dot={false}
                              activeDot={{
                                r: 5,
                                strokeWidth: 3,
                                stroke: "#fff",
                                fill: CHART.magenta,
                              }}
                              animationDuration={700}
                            />
                            <Area
                              type="monotone"
                              dataKey="failed"
                              name="Failed"
                              stroke={CHART.orange}
                              strokeWidth={2}
                              fill="url(#gOrange)"
                              dot={false}
                              activeDot={{
                                r: 5,
                                strokeWidth: 3,
                                stroke: "#fff",
                                fill: CHART.orange,
                              }}
                              animationDuration={700}
                            />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.18}>
          <DeliveryFunnel totals={totals} loading={overview.isLoading} />
        </FadeIn>
      </div>

      {/* ── Category + agents ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn inView>
          <Card className="h-full">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Messages by category</CardTitle>
                <CardDescription>Template categories billed — last {days} days</CardDescription>
              </div>
              {breakdown.length > 0 && (
                <div className="rounded-xl bg-brand-50 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-700/80">
                    Spend
                  </p>
                  <p className="font-display text-sm font-bold text-brand-700">
                    {formatCurrency(
                      breakdown.reduce((sum, b) => sum + b.totalCost, 0),
                      currency,
                    )}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {categories.isError ? (
                <ErrorState
                  message="Could not load the category breakdown."
                  onRetry={() => void categories.refetch()}
                />
              ) : categories.isLoading ? (
                <Skeleton className="h-60" />
              ) : breakdown.every((b) => b.count === 0) ? (
                <ChartEmpty
                  icon={PieIcon}
                  title="No billed conversations yet"
                  description="Marketing, utility, authentication and service charges will break down here."
                />
              ) : (
                <CategoryDonut breakdown={breakdown} currency={currency} />
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn inView delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Agent performance</CardTitle>
              <CardDescription>Conversations handled per agent — last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              {agents.isError ? (
                <ErrorState
                  message="Could not load agent performance."
                  onRetry={() => void agents.refetch()}
                />
              ) : agents.isLoading ? (
                <Skeleton className="h-60" />
              ) : agentList.length === 0 ? (
                <ChartEmpty
                  icon={Users}
                  title="No agent activity yet"
                  description="Assign conversations to teammates from the inbox to compare performance."
                  action={{ href: "/inbox", label: "Open inbox" }}
                />
              ) : (
                <AgentBars agents={agentList} />
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* ── Quick links ── */}
      <Stagger inView className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LINKS.map((link) => (
          <StaggerItem key={link.href}>
            <HoverLift>
              <Link
                href={link.href}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Spotlight className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-shadow hover:shadow-lift">
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-brand-100 transition-all duration-300 group-hover:bg-brand-gradient group-hover:text-white group-hover:ring-transparent">
                    <link.icon size={19} />
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <p className="text-sm font-semibold">{link.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="relative shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary"
                  />
                </Spotlight>
              </Link>
            </HoverLift>
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}

/* ── Delivery funnel ── */

function DeliveryFunnel({
  totals,
  loading,
}: {
  totals: OverviewResponse["totals"] | undefined;
  loading: boolean;
}) {
  const sent = totals?.outbound ?? 0;
  const steps = [
    { label: "Sent", value: sent, color: "from-[#6a2ff0] to-brand-600" },
    { label: "Delivered", value: totals?.delivered ?? 0, color: "from-brand-600 to-brand-magenta" },
    { label: "Read", value: totals?.read ?? 0, color: "from-brand-magenta to-brand-pink" },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Delivery funnel</CardTitle>
        <CardDescription>How far your outbound messages get</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !totals ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {steps.map((step, i) => {
              const pct = sent > 0 ? (step.value / sent) * 100 : 0;
              return (
                <div key={step.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{step.label}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        <AnimatedNumber value={step.value} />
                      </span>
                      {i > 0 && <span className="ml-1.5 text-xs">({pct.toFixed(1)}%)</span>}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-brand-50">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${step.color}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${sent > 0 ? Math.max(pct, step.value > 0 ? 2 : 0) : 0}%`,
                      }}
                      transition={{ duration: 0.6, ease, delay: 0.15 + i * 0.1 }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="mt-2 grid grid-cols-2 gap-3 border-t pt-5">
              <div className="rounded-xl bg-brand-50/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Failed
                </p>
                <p className="mt-1 font-display text-lg font-bold text-rose-600">
                  <AnimatedNumber value={totals.failed} />
                </p>
              </div>
              <div className="rounded-xl bg-brand-50/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Failure rate
                </p>
                <p className="mt-1 font-display text-lg font-bold">
                  {sent > 0 ? `${((totals.failed / sent) * 100).toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Category donut ── */

function CategoryDonut({ breakdown, currency }: { breakdown: CategoryRow[]; currency: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);
  const active = activeIndex !== null ? breakdown[activeIndex] : undefined;

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[220px_1fr]">
      <div className="relative mx-auto h-[220px] w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={breakdown}
              dataKey="count"
              nameKey="category"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
              animationDuration={800}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {breakdown.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={
                    CATEGORY_COLORS[entry.category] ?? SERIES_COLORS[index % SERIES_COLORS.length]
                  }
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                  style={{ transition: "opacity 200ms" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {active ? active.category : "Total"}
            </p>
            <p className="font-display text-2xl font-bold">
              {(active ? active.count : total).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {breakdown.map((b, index) => {
          const share = total > 0 ? (b.count / total) * 100 : 0;
          const color = CATEGORY_COLORS[b.category] ?? SERIES_COLORS[index % SERIES_COLORS.length];
          return (
            <li
              key={b.category}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className="rounded-xl border border-transparent p-2.5 transition-colors hover:border-brand-100 hover:bg-brand-50/50"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium capitalize">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  {b.category}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{b.count.toLocaleString()}</span>
                  <span className="ml-2 text-xs">{formatCurrency(b.totalCost, currency)}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${share}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease, delay: index * 0.06 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Agent bars ── */

function AgentBars({ agents }: { agents: AgentRow[] }) {
  const top = agents.slice(0, 8);
  const height = Math.max(180, top.length * 44);

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gAgent" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6a2ff0" />
              <stop offset="55%" stopColor={CHART.purple} />
              <stop offset="100%" stopColor={CHART.pink} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis
            dataKey="name"
            type="category"
            width={96}
            {...axisProps}
            tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(260 15% 30%)" }}
          />
          <Tooltip cursor={{ fill: "rgba(131,58,180,0.06)" }} content={<ChartTooltip />} />
          <Bar
            dataKey="conversations"
            name="Conversations"
            fill="url(#gAgent)"
            radius={[0, 8, 8, 0]}
            barSize={20}
            animationDuration={800}
          />
          <Bar
            dataKey="resolved"
            name="Resolved"
            fill={CHART.yellow}
            radius={[0, 8, 8, 0]}
            barSize={8}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        <LegendDot color={CHART.purple} label="Conversations" />
        <LegendDot color={CHART.yellow} label="Resolved" />
      </div>
    </>
  );
}

/* ── Empty chart placeholder ── */

function ChartEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof BarChart3;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-brand-200 bg-gradient-to-b from-brand-50/60 to-white p-6 text-center">
      <div className="max-w-xs space-y-3">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary shadow-soft ring-1 ring-brand-100">
          <Icon size={22} />
        </span>
        <p className="font-display font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {action.label}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
