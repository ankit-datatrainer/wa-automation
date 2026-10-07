"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCheck, Eye, MessageCircleReply, Send, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedNumber, ease, motion } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface FunnelData {
  id: string;
  name: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
}

interface FunnelResponse {
  funnels: FunnelData[];
}

type Stage = "total" | "sent" | "delivered" | "read" | "replied";

const STAGES: { key: Stage; label: string; icon: typeof Send; bar: string }[] = [
  { key: "total", label: "Recipients", icon: Users, bar: "from-brand-300 to-brand-400" },
  { key: "sent", label: "Sent", icon: Send, bar: "from-brand-400 to-brand-500" },
  { key: "delivered", label: "Delivered", icon: CheckCheck, bar: "from-brand-500 to-brand-600" },
  { key: "read", label: "Read", icon: Eye, bar: "from-brand-600 to-brand-magenta" },
  { key: "replied", label: "Replied", icon: MessageCircleReply, bar: "from-brand-magenta to-brand-pink" },
];

function rate(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function CampaignFunnelChart() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "campaign-funnel"],
    queryFn: () => api.get<FunnelResponse>("/analytics/campaign-funnel"),
  });

  const funnels = data?.funnels ?? [];
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (funnels.length && !funnels.some((f) => f.id === selectedId)) {
      setSelectedId(funnels[0]!.id);
    }
  }, [funnels, selectedId]);

  const funnel = funnels.find((f) => f.id === selectedId) ?? funnels[0];

  const metrics = funnel
    ? [
        { label: "Delivery rate", value: rate(funnel.delivered, funnel.sent), hint: "of sent" },
        { label: "Read rate", value: rate(funnel.read, funnel.delivered), hint: "of delivered" },
        { label: "Reply rate", value: rate(funnel.replied, funnel.read), hint: "of read" },
        { label: "Failure rate", value: rate(funnel.failed, funnel.total), hint: "of recipients", danger: true },
      ]
    : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <BarChart3 size={18} />
          </span>
          <div>
            <CardTitle className="text-base sm:text-lg">Delivery funnel</CardTitle>
            <CardDescription>
              {funnel
                ? "How recipients moved from sent to replied."
                : "Delivery funnel for your most recent campaigns"}
            </CardDescription>
          </div>
        </div>
        {funnels.length > 1 && (
          <Select
            aria-label="Choose campaign"
            value={funnel?.id ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-10 sm:w-64"
          >
            {funnels.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        )}
        {funnels.length === 1 && funnel && (
          <span className="max-w-full truncate rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            {funnel.name}
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Could not load the delivery funnel." onRetry={() => void refetch()} />
        ) : !funnel ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              No running or completed campaigns yet. Run your first campaign to see its delivery funnel.
            </p>
            <Link href="/campaigns/new" className={buttonVariants({ size: "sm" })}>
              <Send size={14} />
              Create a campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <ol className="space-y-2.5" aria-label={`Funnel for ${funnel.name}`}>
              {STAGES.map((stage, index) => {
                const value = funnel[stage.key];
                const width = funnel.total > 0 ? Math.max(2, rate(value, funnel.total)) : 0;
                const prev = index > 0 ? funnel[STAGES[index - 1]!.key] : null;
                return (
                  <li key={`${funnel.id}-${stage.key}`} className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[124px_minmax(0,1fr)] sm:gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <stage.icon size={15} className="shrink-0 text-primary" />
                      {stage.label}
                    </span>
                    <div className="relative h-11 overflow-hidden rounded-xl bg-brand-50/70">
                      <motion.div
                        className={cn("absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r", stage.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.6, ease, delay: index * 0.08 }}
                      />
                      <div className="relative flex h-full items-center justify-between gap-2 px-3">
                        <span className="font-display text-sm font-bold tabular-nums text-foreground mix-blend-normal">
                          <span className="rounded-md bg-white/85 px-1.5 py-0.5 shadow-sm">
                            <AnimatedNumber value={value} duration={0.8} />
                          </span>
                        </span>
                        <span className="rounded-md bg-white/85 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-brand-700 shadow-sm">
                          {prev !== null ? (
                            <>
                              {rate(value, prev).toFixed(0)}%
                              <span className="hidden sm:inline">
                                {" "}
                                of {STAGES[index - 1]!.label.toLowerCase()}
                              </span>
                            </>
                          ) : (
                            "100%"
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
              {funnel.failed > 0 && (
                <li className="flex items-center gap-2 pt-1 text-sm text-rose-600">
                  <TriangleAlert size={15} />
                  <span className="font-semibold tabular-nums">{funnel.failed.toLocaleString()}</span>
                  messages failed to send
                </li>
              )}
            </ol>

            <div className="grid grid-cols-2 gap-3 self-start">
              {metrics.map((m, i) => (
                <motion.div
                  key={`${funnel.id}-${m.label}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease, delay: 0.2 + i * 0.06 }}
                  className="rounded-xl border bg-white p-3.5 shadow-soft"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-2xl font-bold",
                      m.danger ? (m.value > 0 ? "text-rose-600" : "text-foreground") : "text-gradient",
                    )}
                  >
                    <AnimatedNumber value={m.value} format={(n) => `${n.toFixed(1)}%`} duration={0.8} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
