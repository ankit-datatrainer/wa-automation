"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, Gauge, Phone, PlugZap, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { motion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { TIER_LABELS, type MeResponse, type StatsData } from "./types";

const QUALITY: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral"; level: number }> = {
  high: { label: "High", tone: "success", level: 3 },
  medium: { label: "Medium", tone: "warning", level: 2 },
  low: { label: "Low", tone: "danger", level: 1 },
};

/** WhatsApp number status, quality rating and today's limit usage. */
export function ConnectionCard({
  waba,
  stats,
  loading,
}: {
  waba: MeResponse["waba"] | undefined;
  stats: StatsData | undefined;
  loading: boolean;
}) {
  const connected = waba?.status === "connected";
  const quality = QUALITY[(stats?.qualityRating ?? waba?.qualityRating ?? "").toLowerCase()];
  // `undefined` = stats not available yet, `null` = unlimited tier.
  const limit = stats ? stats.perDayMessageLimit : undefined;
  const used = stats?.messagesUsedToday ?? 0;
  const ratio = limit ? Math.min(1, used / limit) : 0;
  const tier = waba?.messagingTier ? (TIER_LABELS[waba.messagingTier] ?? waba.messagingTier) : null;

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
            <PlugZap size={16} />
          </span>
          <h3 className="font-display text-lg font-semibold tracking-tight">WhatsApp number</h3>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-24 rounded-full" />
        ) : (
          <Badge tone={connected ? "success" : waba ? "warning" : "neutral"}>
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-500" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  connected ? "bg-emerald-500" : waba ? "bg-amber-500" : "bg-muted-foreground/50",
                )}
              />
            </span>
            {connected ? "Connected" : waba ? waba.status.replace(/_/g, " ") : "Not connected"}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-20" />
        </div>
      ) : !waba ? (
        <div className="mt-5 flex flex-1 flex-col justify-between gap-5">
          <p className="text-sm text-muted-foreground">
            Connect your WhatsApp Business number to send campaigns, receive messages and track
            delivery in real time.
          </p>
          <Link href="/manage/credentials" className={cn(buttonVariants({ size: "md" }), "w-full")}>
            <Zap size={16} />
            Connect WhatsApp
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/40 p-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-soft">
              <Phone size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{waba.displayPhone ?? "Phone number pending"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {waba.verifiedName ?? "Display name not verified"}
                {waba.lastSyncedAt
                  ? ` · synced ${formatDistanceToNowStrict(new Date(waba.lastSyncedAt), { addSuffix: true })}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/80 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck size={13} /> Quality
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold">{quality?.label ?? "Unknown"}</span>
                <span className="flex items-end gap-0.5" aria-hidden>
                  {[1, 2, 3].map((bar) => (
                    <motion.span
                      key={bar}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.1 * bar, duration: 0.3 }}
                      style={{ height: 6 + bar * 4, transformOrigin: "bottom" }}
                      className={cn(
                        "w-1.5 rounded-full",
                        quality && bar <= quality.level
                          ? quality.tone === "success"
                            ? "bg-emerald-500"
                            : quality.tone === "warning"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          : "bg-muted",
                      )}
                    />
                  ))}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Gauge size={13} /> Tier
              </p>
              <p className="mt-2 font-display text-base font-bold">
                {tier ? (tier === "Unlimited" ? tier : `${tier} / day`) : "—"}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border/80 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Used today</span>
              <span className="font-semibold tabular-nums">
                {limit === undefined
                  ? "—"
                  : `${used.toLocaleString()} / ${limit === null ? "∞" : limit.toLocaleString()}`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", ratio > 0.9 ? "bg-rose-500" : "bg-brand-gradient")}
                initial={{ width: 0 }}
                animate={{ width: `${limit ? Math.max(2, ratio * 100) : 0}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Link
              href="/manage/credentials"
              className="group flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm font-semibold transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Manage credentials
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
