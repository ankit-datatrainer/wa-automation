"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, Megaphone, Plus } from "lucide-react";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Stagger, StaggerItem, motion } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { one, type CampaignRow, type Paginated } from "./types";

export function RecentCampaigns() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "recent-campaigns"],
    queryFn: () => api.get<Paginated<CampaignRow>>("/campaigns", { page: 1, pageSize: 5 }),
  });

  const rows = data?.data ?? [];

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <Megaphone size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Recent campaigns</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString()} campaign${data.total === 1 ? "" : "s"} in total` : "Your latest sends"}
          </p>
        </div>
        <Link href="/campaigns/history" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 text-primary")}>
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-2">
            <ErrorState message="Could not load campaigns." onRetry={() => void refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Launch your first broadcast to reach customers on WhatsApp."
            action={
              <Link href="/campaigns/new" className={buttonVariants({ size: "sm" })}>
                <Plus size={15} />
                New campaign
              </Link>
            }
          />
        ) : (
          <Stagger className="space-y-1" stagger={0.05}>
            {rows.map((campaign) => {
              const stats = campaign.stats ?? {};
              const total = stats.total ?? 0;
              const delivered = stats.delivered ?? 0;
              const read = stats.read ?? 0;
              const deliveredPct = total ? (delivered / total) * 100 : 0;
              const readPct = total ? (read / total) * 100 : 0;
              const template = one(campaign.templates);
              const when = campaign.completed_at ?? campaign.started_at ?? campaign.scheduled_at ?? campaign.created_at;

              return (
                <StaggerItem key={campaign.id}>
                  <Link
                    href="/campaigns/history"
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 font-display text-sm font-bold text-primary">
                      {campaign.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold group-hover:text-primary">{campaign.name}</p>
                        <Badge tone={statusTone(campaign.status)} className="shrink-0 capitalize">
                          {campaign.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {template?.name ?? "No template"} · {total.toLocaleString()} recipients
                        {when ? ` · ${formatDistanceToNowStrict(new Date(when), { addSuffix: true })}` : ""}
                      </p>
                      {total > 0 && (
                        <div
                          className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                          title={`${delivered.toLocaleString()} delivered · ${read.toLocaleString()} read`}
                        >
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand-200"
                            initial={{ width: 0 }}
                            animate={{ width: `${deliveredPct}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                          />
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
                            initial={{ width: 0 }}
                            animate={{ width: `${readPct}%` }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                          />
                        </div>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="font-display text-sm font-bold tabular-nums">{readPct.toFixed(0)}%</p>
                        <p className="text-[11px] text-muted-foreground">read</p>
                      </div>
                    )}
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </Card>
  );
}
