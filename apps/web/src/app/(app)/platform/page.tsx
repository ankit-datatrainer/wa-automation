"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Phone,
  ScrollText,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  UserSquare2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, HoverLift, Spotlight, Stagger, StaggerItem, AnimatedNumber, motion, ease } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { Avatar, KpiTile, SectionTitle, humanizeAction, relation, timeAgo } from "./_components/ui";

interface PlatformStats {
  organizations: number;
  suspendedOrganizations: number;
  users: number;
  contacts: number;
  campaigns: number;
  messagesToday: number;
  connectedNumbers: number;
  totalWalletBalance: number;
  openTickets?: number;
}

/** Shape returned by GET /platform/audit-logs — the actor is the embedded `users` relation. */
interface AuditLogRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  users: unknown;
}

const MODULES: {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/platform/organizations",
    title: "Organizations",
    description: "Inspect tenants, suspend bad actors, adjust wallet credits and assign plans.",
    cta: "Manage tenants",
    icon: Building2,
  },
  {
    href: "/platform/plans",
    title: "Subscription plans",
    description: "Configure pricing tiers, contact limits, seats and message caps.",
    cta: "Manage plans",
    icon: CreditCard,
  },
  {
    href: "/platform/waba",
    title: "WhatsApp numbers",
    description: "Monitor every connected number, quality rating, tier and health.",
    cta: "Monitor numbers",
    icon: Phone,
  },
  {
    href: "/platform/support",
    title: "Support desk",
    description: "Triage tenant tickets, set priorities and reply from one place.",
    cta: "Open support desk",
    icon: LifeBuoy,
  },
  {
    href: "/platform/users",
    title: "All users",
    description: "Browse every user and grant or revoke platform administrator rights.",
    cta: "Manage users",
    icon: Users,
  },
  {
    href: "/platform/audit",
    title: "Audit log",
    description: "A forensic trail of every administrative action across tenants.",
    cta: "View audit log",
    icon: ScrollText,
  },
];

export default function PlatformOverviewPage() {
  const stats = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => api.get<PlatformStats>("/platform/stats"),
  });

  const recentAudit = useQuery({
    queryKey: ["platform", "audit-recent"],
    queryFn: () => api.get<{ data: AuditLogRow[] }>("/platform/audit-logs"),
  });

  const s = stats.data;
  const activeOrgs = s ? Math.max(0, s.organizations - s.suspendedOrganizations) : 0;
  const healthPct = s && s.organizations > 0 ? (activeOrgs / s.organizations) * 100 : 100;
  const recent = (recentAudit.data?.data ?? []).slice(0, 6);

  return (
    <>
      <LoadingScreen isSuperAdmin isLoading={stats.isLoading} minDurationMs={700} />
      <PageHeader
        title="Platform Overview"
        description="Live telemetry for every tenant, number and wallet on the platform."
        onRefresh={() => {
          void stats.refetch();
          void recentAudit.refetch();
        }}
        refreshing={stats.isFetching || recentAudit.isFetching}
      />

      {stats.isError ? (
        <ErrorState
          message="Could not load platform statistics. This area is restricted to platform administrators."
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <div className="space-y-8">
          {/* Hero */}
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl bg-brand-gradient [contain:paint] p-6 text-white shadow-glow sm:p-8">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12]" />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl"
                animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <Sparkles size={13} />
                    Platform command center
                  </span>
                  <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {s ? (
                      <>
                        <AnimatedNumber value={s.organizations} /> tenants ·{" "}
                        <AnimatedNumber value={s.messagesToday} /> messages today
                      </>
                    ) : (
                      "Loading platform telemetry…"
                    )}
                  </h2>
                  <p className="max-w-xl text-sm text-white/80">
                    Everything you need to operate WA Automation — tenants, billing, WhatsApp
                    numbers and support — in one place.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href="/platform/organizations"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "border-white/30 bg-white text-brand-700 hover:bg-white/90",
                      )}
                    >
                      <Building2 size={16} />
                      Manage organizations
                    </Link>
                    <Link
                      href="/platform/support"
                      className={cn(buttonVariants({ variant: "ghost" }), "text-white hover:bg-white/15")}
                    >
                      <LifeBuoy size={16} />
                      Support desk
                      {s?.openTickets ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-brand-700">
                          {s.openTickets}
                        </span>
                      ) : null}
                    </Link>
                  </div>
                </div>

                <HealthRing pct={healthPct} active={activeOrgs} suspended={s?.suspendedOrganizations ?? 0} ready={!!s} />
              </div>
            </div>
          </FadeIn>

          {/* KPIs */}
          <section>
            <SectionTitle>Key metrics</SectionTitle>
            {!s ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
            ) : (
              <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiTile icon={Building2} label="Organizations" value={s.organizations} sublabel="All tenants" href="/platform/organizations" />
                <KpiTile
                  icon={ShieldAlert}
                  label="Suspended orgs"
                  value={s.suspendedOrganizations}
                  sublabel="Access blocked"
                  tone={s.suspendedOrganizations > 0 ? "danger" : "neutral"}
                  href="/platform/organizations"
                  badge={s.suspendedOrganizations > 0 ? <Badge tone="danger">Review</Badge> : undefined}
                />
                <KpiTile icon={UserSquare2} label="Platform users" value={s.users} sublabel="Across all orgs" href="/platform/users" />
                <KpiTile icon={Phone} label="Connected numbers" value={s.connectedNumbers} sublabel="Meta Cloud API" tone="success" href="/platform/waba" />
                <KpiTile icon={Users} label="Total contacts" value={s.contacts} sublabel="Tenant audiences" />
                <KpiTile icon={Send} label="Total campaigns" value={s.campaigns} sublabel="Broadcasts created" />
                <KpiTile icon={MessageSquare} label="Messages today" value={s.messagesToday} sublabel="Sent since midnight" />
                <KpiTile
                  icon={Wallet}
                  label="Wallet balance"
                  value={s.totalWalletBalance}
                  format={(n) => formatCurrency(n)}
                  sublabel="Held across tenants"
                />
              </Stagger>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            {/* Modules */}
            <section>
              <SectionTitle>Management modules</SectionTitle>
              <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" delay={0.1}>
                {MODULES.map((m) => (
                  <StaggerItem key={m.href}>
                    <HoverLift className="h-full">
                      <Link
                        href={m.href}
                        className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Spotlight className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-5 shadow-soft transition-all duration-300 group-hover:border-brand-200 group-hover:shadow-lift">
                          <div className="relative space-y-3">
                            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-primary ring-1 ring-inset ring-brand-100 transition-all duration-300 group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-glow">
                              <m.icon size={20} />
                            </span>
                            <div>
                              <h3 className="font-display text-base font-semibold">{m.title}</h3>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                            </div>
                          </div>
                          <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                            {m.cta}
                            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                        </Spotlight>
                      </Link>
                    </HoverLift>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>

            {/* Recent activity */}
            <section>
              <SectionTitle
                action={
                  <Link href="/platform/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    View all
                    <ArrowUpRight size={14} />
                  </Link>
                }
              >
                Recent platform actions
              </SectionTitle>
              <Card className="p-2">
                {recentAudit.isLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14" />
                    ))}
                  </div>
                ) : recentAudit.isError ? (
                  <div className="p-3">
                    <ErrorState message="Could not load recent actions." onRetry={() => void recentAudit.refetch()} />
                  </div>
                ) : recent.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-primary">
                      <Activity size={20} />
                    </span>
                    <p className="text-sm font-semibold">No administrative actions yet</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Suspensions, wallet adjustments, plan changes and admin grants will appear here.
                    </p>
                  </div>
                ) : (
                  <ol className="relative">
                    {recent.map((log, i) => {
                      const actor = relation<{ name: string | null; email: string }>(log.users);
                      return (
                        <motion.li
                          key={log.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, ease, delay: 0.15 + i * 0.05 }}
                          className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-brand-50/60"
                        >
                          <Avatar name={actor?.name ?? actor?.email ?? "System"} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{humanizeAction(log.action)}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {actor?.name ?? actor?.email ?? "System"}
                              {log.target_type ? ` · ${log.target_type}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                            {timeAgo(log.created_at)}
                          </span>
                        </motion.li>
                      );
                    })}
                  </ol>
                )}
              </Card>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

/** Radial gauge of active vs suspended tenants. */
function HealthRing({
  pct,
  active,
  suspended,
  ready,
}: {
  pct: number;
  active: number;
  suspended: number;
  ready: boolean;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20 sm:gap-5 sm:p-5">
      <div className="relative h-24 w-24 shrink-0 sm:h-32 sm:w-32">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="12" />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: ready ? circumference * (1 - pct / 100) : circumference }}
            transition={{ duration: 1.2, ease }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-xl font-bold sm:text-2xl">
              {ready ? <AnimatedNumber value={pct} format={(n) => `${Math.round(n)}%`} /> : "—"}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">healthy</p>
          </div>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <p className="font-semibold">Tenant health</p>
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-white/90" />
          <span className="text-white/85">
            <span className="font-bold text-white">{active.toLocaleString()}</span> active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-white/90" />
          <span className="text-white/85">
            <span className="font-bold text-white">{suspended.toLocaleString()}</span> suspended
          </span>
        </div>
      </div>
    </div>
  );
}
