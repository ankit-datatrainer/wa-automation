"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CreditCard,
  History,
  MessageSquare,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

/* ── Types ── */

interface DayBucket {
  date: string;
  inbound: number;
  outbound: number;
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

/* ── Helpers ── */

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "hsl(262, 60%, 55%)",
  utility: "hsl(142, 71%, 40%)",
  authentication: "hsl(199, 89%, 48%)",
  service: "hsl(215, 16%, 55%)",
};

const AGENT_COLORS = [
  "hsl(142, 71%, 40%)",
  "hsl(199, 89%, 48%)",
  "hsl(262, 60%, 55%)",
  "hsl(30, 100%, 50%)",
  "hsl(340, 75%, 55%)",
];

/* ── Quick Link Cards ── */

const LINKS = [
  { href: "/analytics/credits", icon: CreditCard, label: "Credit History", desc: "Message credit ledger" },
  { href: "/analytics/wallet", icon: Wallet, label: "Wallet History", desc: "Top-ups and balance" },
  { href: "/analytics/subscriptions", icon: History, label: "Subscription History", desc: "Plan changes and invoices" },
  { href: "/analytics/chats", icon: MessageSquare, label: "Chat History", desc: "Conversation-level analytics" },
] as const;

/* ── Page ── */

export default function AnalyticsPage() {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<OverviewResponse>("/analytics/overview", { days: 30 }),
  });

  const categories = useQuery({
    queryKey: ["analytics", "category-breakdown"],
    queryFn: () => api.get<{ breakdown: CategoryRow[] }>("/analytics/category-breakdown", { days: 30 }),
  });

  const agents = useQuery({
    queryKey: ["analytics", "agent-performance"],
    queryFn: () => api.get<{ agents: AgentRow[] }>("/analytics/agent-performance", { days: 30 }),
  });

  const series = overview.data?.series ?? [];
  const totals = overview.data?.totals;
  const breakdown = categories.data?.breakdown ?? [];
  const agentList = agents.data?.agents ?? [];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Message volume, delivery performance, and agent activity across your account."
      />

      {/* ── Summary KPIs ── */}
      {totals && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpi icon={TrendingUp} label="Total Outbound" value={totals.outbound.toLocaleString()} />
          <MiniKpi icon={MessageSquare} label="Total Inbound" value={totals.inbound.toLocaleString()} />
          <MiniKpi icon={BarChart3} label="Delivery Rate" value={`${(totals.deliveryRate * 100).toFixed(1)}%`} />
          <MiniKpi icon={Users} label="Active Agents" value={String(agentList.length)} />
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Message Volume Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Message Volume Trend</CardTitle>
            <CardDescription>Daily inbound and outbound messages — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <Skeleton className="h-64" />
            ) : series.length === 0 ? (
              <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                No message data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="aOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 40%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 40%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(0 0% 100%)", border: "1px solid hsl(214, 20%, 91%)", borderRadius: "0.5rem", fontSize: 13 }}
                    labelFormatter={formatDate}
                  />
                  <Area type="monotone" dataKey="outbound" name="Outbound" stroke="hsl(142, 71%, 40%)" strokeWidth={2} fill="url(#aOut)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="inbound" name="Inbound" stroke="hsl(199, 89%, 48%)" strokeWidth={2} fill="url(#aIn)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. Messages by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages by Category</CardTitle>
            <CardDescription>Breakdown by template category — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.isLoading ? (
              <Skeleton className="h-56" />
            ) : breakdown.every((b) => b.count === 0) ? (
              <div className="grid h-56 place-items-center text-sm text-muted-foreground">
                No categorized messages yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={breakdown} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} stroke="hsl(215, 16%, 47%)" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(0 0% 100%)", border: "1px solid hsl(214, 20%, 91%)", borderRadius: "0.5rem", fontSize: 13 }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Bar dataKey="count" name="Messages" radius={[6, 6, 0, 0]} barSize={40}>
                      {breakdown.map((entry) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "hsl(215, 16%, 55%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  {breakdown.map((b) => (
                    <span key={b.category} className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[b.category] ?? "hsl(215,16%,55%)" }} />
                      <span className="capitalize text-muted-foreground">{b.category}</span>
                      <span className="font-semibold tabular-nums">{b.count.toLocaleString()}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Performance</CardTitle>
            <CardDescription>Conversations handled per agent — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {agents.isLoading ? (
              <Skeleton className="h-56" />
            ) : agentList.length === 0 ? (
              <div className="grid h-56 place-items-center text-sm text-muted-foreground">
                No agent activity yet. Assign conversations to agents to see performance.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={agentList.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 4, right: 30, bottom: 0, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(215, 16%, 47%)" tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(214 20% 91% / 0.4)" }}
                      contentStyle={{ backgroundColor: "hsl(0 0% 100%)", border: "1px solid hsl(214, 20%, 91%)", borderRadius: "0.5rem", fontSize: 13 }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Bar dataKey="conversations" name="Conversations" radius={[0, 6, 6, 0]} barSize={24}>
                      {agentList.slice(0, 8).map((_, index) => (
                        <Cell key={index} fill={AGENT_COLORS[index % AGENT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  {agentList.slice(0, 8).map((agent, i) => (
                    <span key={agent.agentId} className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: AGENT_COLORS[i % AGENT_COLORS.length] }} />
                      <span className="text-muted-foreground">{agent.name}</span>
                      <span className="font-semibold tabular-nums">{agent.conversations}</span>
                      <span className="text-muted-foreground/70">({agent.resolved} resolved)</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Links ── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group flex items-center gap-4 p-4 transition-colors hover:border-primary/40 hover:bg-accent/50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <link.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

/* ── Mini KPI Card ── */

function MiniKpi({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tracking-tight">{value}</p>
      </div>
    </Card>
  );
}
