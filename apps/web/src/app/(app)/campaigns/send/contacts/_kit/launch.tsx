"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  Rocket,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedNumber, Stagger, StaggerItem, ease } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { RollingNumber } from "./send-ui";
import type { AudienceKind, CampaignDetail } from "./types";

export interface LaunchInput {
  name: string;
  templateId: string;
  audienceType: AudienceKind;
  audienceConfig: Record<string, unknown>;
  variableMapping: Record<string, string>;
  scheduledAt: string | null;
}

export interface LaunchOutcome {
  id: string;
  name: string;
  recipientCount: number;
  scheduledAt: string | null;
  /** Set when the campaign was created but POST /campaigns/:id/send failed. */
  sendError?: string;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return "You need a manager role or higher to send campaigns.";
    return error.message || fallback;
  }
  return fallback;
}

/** POST /campaigns, then POST /campaigns/:id/send for "send now". */
export function useLaunchCampaign(onLaunched: (outcome: LaunchOutcome) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LaunchInput): Promise<LaunchOutcome> => {
      const created = await api.post<{ id: string; recipientCount: number }>("/campaigns", input);
      const outcome: LaunchOutcome = {
        id: created.id,
        name: input.name,
        recipientCount: created.recipientCount,
        scheduledAt: input.scheduledAt,
      };
      if (!input.scheduledAt) {
        try {
          await api.post(`/campaigns/${created.id}/send`);
        } catch (error) {
          outcome.sendError = errorMessage(error, "The campaign was created but could not be started.");
        }
      }
      return outcome;
    },
    onSuccess: (outcome) => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (outcome.sendError) toast.warning(outcome.sendError);
      else if (outcome.scheduledAt) toast.success(`“${outcome.name}” is scheduled`);
      else toast.success(`Sending “${outcome.name}” to ${outcome.recipientCount.toLocaleString()} contacts`);
      onLaunched(outcome);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not create the campaign")),
  });
}

// ---------------------------------------------------------------- confirm dialog

export function ConfirmLaunchDialog({
  open,
  onClose,
  onConfirm,
  loading,
  mode,
  recipientLabel,
  rows,
  notes,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  mode: "now" | "schedule";
  recipientLabel: React.ReactNode;
  rows: { label: string; value: React.ReactNode }[];
  notes?: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loadingRef.current) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    // Focus the primary action once when the dialog opens.
    const t = window.setTimeout(() => confirmRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="confirm-launch" className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-brand-900/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !loading && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-launch-title"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border/80 bg-white shadow-lift sm:max-w-lg sm:rounded-3xl"
          >
            <div className="relative overflow-hidden bg-brand-gradient px-6 pb-6 pt-7 text-white">
              <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
              >
                <X size={18} />
              </button>
              <motion.span
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}
                className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/40"
              >
                {mode === "now" ? <Rocket size={22} /> : <CalendarClock size={22} />}
              </motion.span>
              <h2 id="confirm-launch-title" className="font-display text-2xl font-bold">
                {mode === "now" ? "Ready to send?" : "Schedule this campaign?"}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {mode === "now" ? "Messages start going out as soon as you confirm." : "You can cancel it any time before it starts."}
              </p>
              <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/25">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">Recipients</p>
                <p className="font-display text-3xl font-bold">{recipientLabel}</p>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <dl className="divide-y divide-border/70 rounded-2xl border border-border/80 px-4">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{r.label}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold text-foreground">{r.value}</dd>
                  </div>
                ))}
              </dl>

              {notes && notes.length > 0 && (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-500" />
                      {n}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Go back
                </Button>
                <Button ref={confirmRef} onClick={onConfirm} loading={loading}>
                  {!loading && (mode === "now" ? <Send size={16} /> : <CalendarClock size={16} />)}
                  {mode === "now" ? "Confirm & send" : "Confirm schedule"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------------------------------------------------------------- result

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export function LaunchResult({
  outcome,
  onReset,
}: {
  outcome: LaunchOutcome;
  onReset: () => void;
}) {
  const queryClient = useQueryClient();
  const campaign = useQuery({
    queryKey: ["campaigns", "detail", outcome.id],
    queryFn: () => api.get<CampaignDetail>(`/campaigns/${outcome.id}`),
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2500 : false),
  });

  const action = useMutation({
    mutationFn: (kind: "send" | "pause" | "cancel") => api.post(`/campaigns/${outcome.id}/${kind}`),
    onSuccess: (_data, kind) => {
      toast.success(
        kind === "send" ? "Campaign started" : kind === "pause" ? "Campaign paused" : "Campaign cancelled",
      );
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => toast.error(errorMessage(error, "That action failed")),
  });

  const data = campaign.data;
  const status = data?.status ?? (outcome.scheduledAt ? "scheduled" : outcome.sendError ? "draft" : "running");
  const stats = data?.stats ?? {};
  const total = stats.total ?? outcome.recipientCount;
  const sent = stats.sent ?? 0;
  const failed = stats.failed ?? 0;
  const processed = Math.min(total, sent + failed);
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const scheduledFor = data?.scheduled_at ?? outcome.scheduledAt;

  const headline =
    status === "running"
      ? "Your campaign is on its way"
      : status === "completed"
        ? "Campaign delivered"
        : status === "scheduled"
          ? "Campaign scheduled"
          : status === "paused"
            ? "Campaign paused"
            : status === "cancelled"
              ? "Campaign cancelled"
              : status === "failed"
                ? "Campaign failed"
                : "Campaign created";

  const sub =
    status === "scheduled" && scheduledFor
      ? `It will start on ${new Date(scheduledFor).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}.`
      : status === "draft"
        ? (outcome.sendError ?? "The campaign was saved as a draft but hasn't started.")
        : status === "paused"
          ? "Sending is paused — this also happens automatically when the daily messaging limit is reached."
          : status === "running"
            ? "Messages are being delivered in batches. This page updates live."
            : status === "failed"
              ? "Check that WhatsApp is connected and the template is still approved."
              : `“${outcome.name}” has finished processing.`;

  const tiles = [
    { label: "Recipients", value: total, tone: "text-foreground" },
    { label: "Sent", value: sent, tone: "text-brand-700" },
    { label: "Delivered", value: stats.delivered ?? 0, tone: "text-emerald-700" },
    { label: "Read", value: stats.read ?? 0, tone: "text-brand-magenta" },
    { label: "Failed", value: failed, tone: "text-rose-600" },
  ];

  const success = status === "running" || status === "completed" || status === "scheduled";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="relative overflow-hidden">
        <div aria-hidden className="bg-aurora absolute inset-0 opacity-80" />
        <div className="relative flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10">
          <div className="relative mb-5">
            {status === "running" && (
              <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-400/40" />
            )}
            <motion.span
              initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 15 }}
              className={cn(
                "relative grid h-20 w-20 place-items-center rounded-3xl text-white shadow-glow",
                success ? "bg-brand-gradient" : status === "failed" ? "bg-rose-500" : "bg-amber-500",
              )}
            >
              {status === "running" ? (
                <Send size={32} />
              ) : status === "scheduled" ? (
                <CalendarClock size={32} />
              ) : status === "completed" ? (
                <CheckCircle2 size={34} />
              ) : status === "paused" ? (
                <Pause size={32} />
              ) : status === "cancelled" ? (
                <Ban size={32} />
              ) : (
                <TriangleAlert size={32} />
              )}
            </motion.span>
          </div>
          <Badge tone={statusTone(status)} className="mb-3 capitalize">
            {status === "running" && <Loader2 size={12} className="animate-spin" />}
            {status}
          </Badge>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{headline}</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">{sub}</p>

          {(status === "running" || status === "completed" || status === "paused") && (
            <div className="mt-7 w-full max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Progress</span>
                <span className="tabular-nums text-brand-700">
                  <RollingNumber value={processed} /> / {total.toLocaleString()} · {pct}%
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease }}
                />
                {status === "running" && (
                  <div className="animate-shimmer absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] bg-[length:200%_100%]" />
                )}
              </div>
            </div>
          )}
        </div>

        <Stagger className="relative grid grid-cols-2 gap-px border-t border-border/70 bg-border/70 sm:grid-cols-5">
          {tiles.map((t, i) => (
            <StaggerItem
              key={t.label}
              className={cn("bg-white px-4 py-4 text-center", i === 0 && "col-span-2 sm:col-span-1")}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{t.label}</p>
              <p className={cn("mt-1 font-display text-2xl font-bold", t.tone)}>
                {i === 0 ? <AnimatedNumber value={t.value} /> : <RollingNumber value={t.value} />}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        {status === "running" && (
          <Button variant="outline" onClick={() => action.mutate("pause")} loading={action.isPending}>
            {!action.isPending && <Pause size={16} />}
            Pause sending
          </Button>
        )}
        {(status === "paused" || status === "draft") && (
          <Button onClick={() => action.mutate("send")} loading={action.isPending}>
            {!action.isPending && <Play size={16} />}
            {status === "draft" ? "Start sending" : "Resume sending"}
          </Button>
        )}
        {status === "scheduled" && (
          <>
            <Button onClick={() => action.mutate("send")} loading={action.isPending}>
              {!action.isPending && <Send size={16} />}
              Send now instead
            </Button>
            <Button variant="outline" onClick={() => action.mutate("cancel")} disabled={action.isPending}>
              <Ban size={16} />
              Cancel schedule
            </Button>
          </>
        )}
        <Link
          href={status === "scheduled" ? "/campaigns/scheduled" : "/campaigns/history"}
          className={buttonVariants({ variant: "outline" })}
        >
          {status === "scheduled" ? <CalendarClock size={16} /> : <History size={16} />}
          {status === "scheduled" ? "Scheduled campaigns" : "Campaign history"}
        </Link>
        <Button variant="secondary" onClick={onReset}>
          <Plus size={16} />
          Create another
        </Button>
      </div>
    </div>
  );
}
