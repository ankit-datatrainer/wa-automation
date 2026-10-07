"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  LayoutTemplate,
  Megaphone,
  Search,
  Send,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  AnimatedNumber,
  HoverLift,
  SegmentedTabs,
  Spotlight,
  Stagger,
  StaggerItem,
} from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { CampaignTable, statsOf, useDebounced, type CampaignsResponse } from "./campaign-table";

type Filter = "all" | "running" | "scheduled" | "completed" | "draft" | "paused" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
];

const LAUNCHERS: { title: string; description: string; href: string; icon: LucideIcon }[] = [
  { title: "Send to contacts", description: "Hand-pick recipients", href: "/campaigns/send/contacts", icon: Send },
  { title: "Send by tags", description: "Target tagged segments", href: "/campaigns/send/tags", icon: Tags },
  { title: "Send by groups", description: "Reach contact groups", href: "/campaigns/send/groups", icon: Users },
  { title: "CSV campaign", description: "Upload a list and send", href: "/campaigns/send/csv", icon: FileSpreadsheet },
  { title: "Broadcast", description: "Everyone who opted in", href: "/campaigns/broadcast", icon: Megaphone },
  { title: "Template library", description: "Ready-made templates", href: "/campaigns/template-library", icon: LayoutTemplate },
];

export default function CampaignsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());

  // A wide page of recent campaigns powers the KPI tiles and the tab counts.
  const summary = useQuery({
    queryKey: ["campaigns", "summary"],
    queryFn: () => api.get<CampaignsResponse>("/campaigns", { page: 1, pageSize: 100 }),
  });

  const kpis = useMemo(() => {
    const rows = summary.data?.data ?? [];
    const totals = rows.reduce(
      (acc, c) => {
        const s = statsOf(c);
        acc.sent += s.sent;
        acc.delivered += s.delivered;
        acc.read += s.read;
        return acc;
      },
      { sent: 0, delivered: 0, read: 0 },
    );
    const counts = rows.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      campaigns: summary.data?.total ?? 0,
      // Counts are only exact when every campaign fits in the summary page.
      exactCounts: (summary.data?.total ?? 0) <= rows.length,
      counts,
      sent: totals.sent,
      deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
      readRate: totals.delivered > 0 ? (totals.read / totals.delivered) * 100 : 0,
    };
  }, [summary.data]);

  const tiles: {
    label: string;
    value: number;
    format?: (n: number) => string;
    hint: string;
    icon: LucideIcon;
    accent: string;
  }[] = [
    {
      label: "Total campaigns",
      value: kpis.campaigns,
      hint: `${kpis.counts.running ?? 0} running · ${kpis.counts.scheduled ?? 0} scheduled`,
      icon: Megaphone,
      accent: "from-brand-600 to-brand-magenta",
    },
    {
      label: "Messages sent",
      value: kpis.sent,
      hint: "Across recent campaigns",
      icon: Send,
      accent: "from-brand-500 to-brand-600",
    },
    {
      label: "Delivery rate",
      value: kpis.deliveryRate,
      format: (n) => `${n.toFixed(1)}%`,
      hint: "Delivered of sent",
      icon: CheckCheck,
      accent: "from-brand-magenta to-brand-pink",
    },
    {
      label: "Read rate",
      value: kpis.readRate,
      format: (n) => `${n.toFixed(1)}%`,
      hint: "Read of delivered",
      icon: Eye,
      accent: "from-brand-pink to-brand-orange",
    },
  ];

  const tabs = FILTERS.map((f) => {
    const count = f.value === "all" ? kpis.campaigns : kpis.counts[f.value] ?? 0;
    const showCount = summary.isSuccess && (f.value === "all" || kpis.exactCounts);
    return {
      value: f.value,
      label: (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {f.label}
          {showCount && (
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                filter === f.value ? "bg-brand-100 text-brand-700" : "bg-white text-muted-foreground",
              )}
            >
              {count}
            </span>
          )}
        </span>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Plan, send and track WhatsApp template campaigns — from a single tag to your entire audience."
        actions={
          <>
            <Link href="/campaigns/scheduled" className={buttonVariants({ variant: "outline" })}>
              <CalendarClock size={16} />
              Scheduled
            </Link>
            <Link href="/campaigns/new" className={buttonVariants()}>
              <Send size={16} />
              New campaign
            </Link>
          </>
        }
      />

      <div className="space-y-6 sm:space-y-8">
        {/* KPI tiles */}
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <StaggerItem key={tile.label}>
              <HoverLift className="h-full">
                <Spotlight className="h-full rounded-2xl border bg-white p-5 shadow-soft transition-shadow hover:shadow-lift">
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {tile.label}
                      </p>
                      {summary.isLoading ? (
                        <Skeleton className="h-9 w-24" />
                      ) : (
                        <p className="font-display text-3xl font-bold tracking-tight text-foreground">
                          <AnimatedNumber value={tile.value} format={tile.format} />
                        </p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">{tile.hint}</p>
                    </div>
                    <span
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-glow",
                        tile.accent,
                      )}
                    >
                      <tile.icon size={20} />
                    </span>
                  </div>
                </Spotlight>
              </HoverLift>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Quick launch */}
        <section aria-labelledby="launch-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="launch-heading" className="text-lg font-semibold">
                Start a campaign
              </h2>
              <p className="text-sm text-muted-foreground">Pick how you want to reach your audience.</p>
            </div>
            <Link
              href="/campaigns/templates"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              <FileText size={14} />
              Your templates
            </Link>
          </div>
          <Stagger
            className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
            delay={0.15}
            stagger={0.05}
          >
            {LAUNCHERS.map((item) => (
              <StaggerItem key={item.href}>
                <HoverLift className="h-full">
                  <Link
                    href={item.href}
                    className="group relative flex h-full items-center gap-3 overflow-hidden rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-inset ring-brand-100 transition-all duration-300 group-hover:bg-brand-gradient group-hover:text-white group-hover:ring-0 group-hover:shadow-glow">
                      <item.icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </Link>
                </HoverLift>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Campaign list */}
        <section aria-labelledby="list-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="list-heading" className="text-lg font-semibold">
                Your campaigns
              </h2>
              <p className="text-sm text-muted-foreground">
                Click a campaign to see per-recipient delivery details.
              </p>
            </div>
            <Link
              href="/campaigns/history"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              <Clock size={14} />
              Performance history
            </Link>
          </div>

          <CampaignTable
            status={filter === "all" ? undefined : filter}
            search={search}
            emptyTitle={filter === "all" ? "No campaigns yet" : `No ${FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} campaigns`}
            emptyDescription={
              filter === "all"
                ? "Create your first campaign to send an approved template to your contacts."
                : "Campaigns with this status will show up here."
            }
            toolbar={
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
                  <SegmentedTabs tabs={tabs} value={filter} onChange={setFilter} layoutId="campaign-filter" />
                </div>
                <div className="relative w-full lg:max-w-xs">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search campaigns..."
                    aria-label="Search campaigns"
                    className="h-10 pl-10 pr-9"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            }
          />
        </section>
      </div>
    </>
  );
}
