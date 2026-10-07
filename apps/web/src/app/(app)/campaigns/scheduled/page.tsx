"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { CalendarClock, CalendarPlus, Clock, Globe, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { motion, ease } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { CampaignTable, statsOf, toOne, type CampaignsResponse } from "../campaign-table";

export default function ScheduledCampaignsPage() {
  const upcoming = useQuery({
    queryKey: ["campaigns", "scheduled-upcoming"],
    queryFn: () =>
      api.get<CampaignsResponse>("/campaigns", { page: 1, pageSize: 100, status: "scheduled" }),
  });

  // Re-render every 30s so the countdown stays fresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const queue = useMemo(
    () =>
      (upcoming.data?.data ?? [])
        .filter((c) => c.status === "scheduled" && c.scheduled_at)
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()),
    [upcoming.data],
  );
  const next = queue.find((c) => new Date(c.scheduled_at!).getTime() >= now) ?? queue[0];
  const queuedRecipients = queue.reduce((sum, c) => sum + statsOf(c).total, 0);
  // Read after mount so the server-rendered HTML never disagrees with the browser.
  const [timeZone, setTimeZone] = useState("");
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  return (
    <>
      <PageHeader
        title="Scheduled Campaigns"
        description="Campaigns queued for a future date. Send one early or cancel it here."
        actions={
          <Link href="/campaigns/new" className={buttonVariants()}>
            <CalendarPlus size={16} />
            Schedule a campaign
          </Link>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow lg:col-span-2"
          >
            <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-brand-orange/20 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">Next up</p>
                {upcoming.isLoading ? (
                  <Skeleton className="h-8 w-56 bg-white/20 bg-none" />
                ) : next ? (
                  <>
                    <h2 className="truncate text-2xl font-bold text-white">{next.name}</h2>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={14} />
                        {new Date(next.scheduled_at!).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} />
                        {statsOf(next).total.toLocaleString()} recipients
                      </span>
                      {toOne(next.templates)?.name && (
                        <span className="font-mono text-xs text-white/75">{toOne(next.templates)!.name}</span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">Nothing in the queue</h2>
                    <p className="text-sm text-white/85">Schedule a campaign to send at the perfect moment.</p>
                  </>
                )}
              </div>
              {next && (
                <div className="shrink-0 rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    {new Date(next.scheduled_at!).getTime() >= now ? "Sends in" : "Was due"}
                  </p>
                  <p className="font-display text-2xl font-bold">
                    {formatDistanceToNowStrict(new Date(next.scheduled_at!), {
                      addSuffix: new Date(next.scheduled_at!).getTime() < now,
                    })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.08 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-1"
          >
            <div className="rounded-2xl border bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <Clock size={14} className="text-primary" />
                In queue
              </p>
              {upcoming.isLoading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-1 font-display text-2xl font-bold">
                  {(upcoming.data?.total ?? 0).toLocaleString()}
                  <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                    · {queuedRecipients.toLocaleString()} recipients
                  </span>
                </p>
              )}
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <Globe size={14} className="text-primary" />
                Your time zone
              </p>
              <p className="mt-1 truncate text-sm font-semibold" title={timeZone}>
                {timeZone || "—"}
              </p>
            </div>
          </motion.div>
        </div>

        <CampaignTable
          status="scheduled"
          emptyTitle="Nothing scheduled"
          emptyDescription="Campaigns you schedule for a future time will wait here until they run."
        />
      </div>
    </>
  );
}
