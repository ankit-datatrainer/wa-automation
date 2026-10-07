"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Megaphone,
  Pause,
  Play,
  Send,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- types

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied?: number;
  failed: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  audience_type: string;
  status: string;
  scheduled_at: string | null;
  started_at?: string | null;
  completed_at: string | null;
  created_at: string;
  stats: CampaignStats | null;
  templates: { name: string; category?: string } | { name: string; category?: string }[] | null;
}

export interface CampaignsResponse {
  data: CampaignRow[];
  page: number;
  totalPages: number;
  total: number;
}

interface CampaignDetail extends CampaignRow {
  audience_config: Record<string, unknown> | null;
  variable_mapping: Record<string, string> | null;
  templates:
    | { name: string; language: string; category: string; components: { body?: { text?: string } } }
    | { name: string; language: string; category: string; components: { body?: { text?: string } } }[]
    | null;
}

interface RecipientRow {
  id: string;
  status: string;
  wamid: string | null;
  error: unknown;
  sent_at: string | null;
  contacts: { wa_id: string; name: string | null } | { wa_id: string; name: string | null }[] | null;
}

interface RecipientsResponse {
  data: RecipientRow[];
  page: number;
  totalPages: number;
  total: number;
}

type Verb = "send" | "pause" | "cancel";

const EMPTY_STATS: CampaignStats = { total: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 };

const AUDIENCE_LABEL: Record<string, string> = {
  broadcast: "Broadcast",
  tags: "By tags",
  groups: "By groups",
  contacts: "Contacts",
  csv: "CSV list",
};

// ---------------------------------------------------------------- helpers

export function toOne<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export function statsOf(campaign: { stats: CampaignStats | null }): CampaignStats {
  return { ...EMPTY_STATS, ...(campaign.stats ?? {}) };
}

export function pct(part: number, whole: number) {
  return whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;
}

function formatWhen(campaign: CampaignRow) {
  if (campaign.status === "scheduled" && campaign.scheduled_at) {
    return { label: new Date(campaign.scheduled_at).toLocaleString(), hint: "Scheduled" };
  }
  if (campaign.completed_at) {
    return { label: new Date(campaign.completed_at).toLocaleString(), hint: "Completed" };
  }
  if (campaign.started_at) {
    return { label: new Date(campaign.started_at).toLocaleString(), hint: "Started" };
  }
  return { label: new Date(campaign.created_at).toLocaleDateString(), hint: "Created" };
}

/** Debounces a fast-changing value such as a search box. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------- small pieces

export function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone(status)} className="capitalize">
      {status === "running" ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
        </span>
      ) : null}
      {status}
    </Badge>
  );
}

export function CampaignProgress({ stats, compact }: { stats: CampaignStats; compact?: boolean }) {
  const sentPct = pct(stats.sent, stats.total);
  const deliveredPct = pct(stats.delivered, stats.total);
  const readPct = pct(stats.read, stats.total);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums text-foreground">{sentPct}%</span>
        <span className="tabular-nums text-muted-foreground">
          {stats.sent.toLocaleString()} / {stats.total.toLocaleString()}
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-brand-50 ring-1 ring-inset ring-brand-100"
        role="progressbar"
        aria-valuenow={sentPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Messages sent"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-200"
          initial={{ width: 0 }}
          animate={{ width: `${sentPct}%` }}
          transition={{ duration: 0.6, ease }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-400"
          initial={{ width: 0 }}
          animate={{ width: `${deliveredPct}%` }}
          transition={{ duration: 0.6, ease, delay: 0.05 }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${readPct}%` }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        />
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CheckCheck size={12} className="text-brand-400" />
            {stats.delivered.toLocaleString()} delivered
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} className="text-primary" />
            {stats.read.toLocaleString()} read
          </span>
          {stats.failed > 0 && (
            <span className="inline-flex items-center gap-1 text-rose-600">
              <AlertTriangle size={12} />
              {stats.failed.toLocaleString()} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Accessible confirm modal used for cancel / delete. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-brand-900/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-md rounded-2xl border bg-white p-6 shadow-lift"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                  destructive ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-primary",
                )}
              >
                <AlertTriangle size={20} />
              </span>
              <div className="space-y-1">
                <h2 id="confirm-title" className="text-lg font-semibold">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Keep it
              </Button>
              <Button
                variant={destructive ? "destructive" : "primary"}
                loading={loading}
                onClick={onConfirm}
                autoFocus
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- actions

function useCampaignActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    void queryClient.invalidateQueries({ queryKey: ["campaign"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics", "campaign-funnel"] });
  };

  const action = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: Verb }) => api.post(`/campaigns/${id}/${verb}`),
    onSuccess: (_data, { verb }) => {
      toast.success(
        verb === "send" ? "Campaign started" : verb === "pause" ? "Campaign paused" : "Campaign cancelled",
      );
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Action failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success("Campaign deleted");
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  return { action, remove };
}

type Confirming = { kind: "cancel" | "delete"; campaign: { id: string; name: string } } | null;

function ActionButtons({
  campaign,
  actions,
  onConfirm,
  size = "sm",
}: {
  campaign: { id: string; name: string; status: string };
  actions: ReturnType<typeof useCampaignActions>;
  onConfirm: (c: Confirming) => void;
  size?: "sm" | "md";
}) {
  const busy = (verb: Verb) =>
    actions.action.isPending &&
    actions.action.variables?.id === campaign.id &&
    actions.action.variables?.verb === verb;

  const canStart = ["draft", "paused", "scheduled"].includes(campaign.status);
  const startLabel =
    campaign.status === "paused" ? "Resume" : campaign.status === "scheduled" ? "Send now" : "Start";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {canStart && (
        <Button
          size={size}
          variant="outline"
          loading={busy("send")}
          onClick={() => actions.action.mutate({ id: campaign.id, verb: "send" })}
        >
          {!busy("send") && <Play size={14} />}
          {startLabel}
        </Button>
      )}
      {campaign.status === "running" && (
        <Button
          size={size}
          variant="outline"
          loading={busy("pause")}
          onClick={() => actions.action.mutate({ id: campaign.id, verb: "pause" })}
        >
          {!busy("pause") && <Pause size={14} />}
          Pause
        </Button>
      )}
      {["draft", "scheduled", "running", "paused"].includes(campaign.status) && (
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={`Cancel ${campaign.name}`}
          title="Cancel campaign"
          onClick={() => onConfirm({ kind: "cancel", campaign })}
        >
          <XCircle size={16} />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Delete ${campaign.name}`}
        title="Delete campaign"
        onClick={() => onConfirm({ kind: "delete", campaign })}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- table

/** Shared by Campaigns, Campaign History and Scheduled Campaigns. */
export function CampaignTable({
  status,
  search,
  emptyTitle,
  emptyDescription,
  toolbar,
}: {
  status?: string;
  search?: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Rendered above the rows, e.g. filter tabs and a search box. */
  toolbar?: React.ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const actions = useCampaignActions();

  useEffect(() => setPage(1), [status, search]);

  const campaigns = useQuery({
    queryKey: ["campaigns", { page, status, search: search || undefined }],
    queryFn: () =>
      api.get<CampaignsResponse>("/campaigns", {
        page,
        pageSize: 25,
        status,
        search: search || undefined,
      }),
    placeholderData: (previous) => previous,
    // Keep running campaigns' progress bars moving.
    refetchInterval: (query) =>
      query.state.data?.data.some((c) => c.status === "running") ? 10_000 : false,
  });

  const rows = campaigns.data?.data ?? [];

  const confirm = () => {
    if (!confirming) return;
    const { kind, campaign } = confirming;
    const done = { onSettled: () => setConfirming(null) };
    if (kind === "delete") {
      actions.remove.mutate(campaign.id, {
        ...done,
        onSuccess: () => {
          if (openId === campaign.id) setOpenId(null);
        },
      });
    } else {
      actions.action.mutate({ id: campaign.id, verb: "cancel" }, done);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        {toolbar && <div className="border-b px-4 py-4 sm:px-5">{toolbar}</div>}

        {campaigns.isError ? (
          <div className="p-5">
            <ErrorState message="Could not load campaigns." onRetry={() => void campaigns.refetch()} />
          </div>
        ) : campaigns.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={search ? "No campaigns match your search" : emptyTitle}
            description={search ? "Try a different name or clear the search." : emptyDescription}
            action={
              <Link href="/campaigns/new" className={buttonVariants()}>
                <Send size={16} />
                Create a campaign
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Campaign</TH>
                    <TH>Audience</TH>
                    <TH>Status</TH>
                    <TH className="min-w-52">Progress</TH>
                    <TH>When</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((campaign, index) => {
                    const template = toOne(campaign.templates);
                    const when = formatWhen(campaign);
                    return (
                      <motion.tr
                        key={campaign.id}
                        initial={index < 20 ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease, delay: Math.min(index, 20) * 0.03 }}
                        className="group transition-colors duration-150 hover:bg-brand-50/50"
                      >
                        <TD className="max-w-72">
                          <button
                            type="button"
                            onClick={() => setOpenId(campaign.id)}
                            className="group/name flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-inset ring-brand-100 transition group-hover:bg-brand-gradient group-hover:text-white group-hover:ring-0">
                              <Megaphone size={17} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-foreground group-hover/name:text-primary">
                                {campaign.name}
                              </span>
                              <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <FileText size={11} />
                                <span className="truncate font-mono">{template?.name ?? "No template"}</span>
                              </span>
                            </span>
                          </button>
                        </TD>
                        <TD>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-foreground/80">
                            <Users size={14} className="text-muted-foreground" />
                            {AUDIENCE_LABEL[campaign.audience_type] ?? campaign.audience_type}
                          </span>
                        </TD>
                        <TD>
                          <CampaignStatusBadge status={campaign.status} />
                        </TD>
                        <TD>
                          <CampaignProgress stats={statsOf(campaign)} />
                        </TD>
                        <TD className="whitespace-nowrap">
                          <p className="text-xs font-medium text-foreground/80">{when.label}</p>
                          <p className="text-[11px] text-muted-foreground">{when.hint}</p>
                        </TD>
                        <TD>
                          <ActionButtons campaign={campaign} actions={actions} onConfirm={setConfirming} />
                        </TD>
                      </motion.tr>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y lg:hidden">
              {rows.map((campaign, index) => {
                const template = toOne(campaign.templates);
                const when = formatWhen(campaign);
                return (
                  <motion.li
                    key={campaign.id}
                    initial={index < 20 ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease, delay: Math.min(index, 20) * 0.03 }}
                    className="space-y-3 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setOpenId(campaign.id)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate font-semibold">{campaign.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {template?.name ?? "No template"} ·{" "}
                          {AUDIENCE_LABEL[campaign.audience_type] ?? campaign.audience_type}
                        </p>
                      </button>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                    <CampaignProgress stats={statsOf(campaign)} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        {when.hint} · {when.label}
                      </p>
                      <ActionButtons campaign={campaign} actions={actions} onConfirm={setConfirming} />
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            <Pagination
              page={campaigns.data!.page}
              totalPages={campaigns.data!.totalPages}
              total={campaigns.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <CampaignDrawer
        id={openId}
        // While the confirm dialog is open, Escape should close only the dialog.
        escapeDisabled={!!confirming}
        onClose={() => setOpenId(null)}
        actions={actions}
        onConfirm={setConfirming}
      />

      <ConfirmDialog
        open={!!confirming}
        title={confirming?.kind === "delete" ? "Delete this campaign?" : "Cancel this campaign?"}
        description={
          confirming?.kind === "delete"
            ? `"${confirming.campaign.name}" and its delivery history will be permanently removed.`
            : `"${confirming?.campaign.name ?? ""}" will stop sending. Messages already delivered are not affected.`
        }
        confirmLabel={confirming?.kind === "delete" ? "Delete campaign" : "Cancel campaign"}
        destructive
        loading={actions.remove.isPending || (actions.action.isPending && actions.action.variables?.verb === "cancel")}
        onConfirm={confirm}
        onClose={() => setConfirming(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------- drawer

const RECIPIENT_FILTERS = ["all", "queued", "sent", "delivered", "read", "failed"] as const;

function CampaignDrawer({
  id,
  escapeDisabled,
  onClose,
  actions,
  onConfirm,
}: {
  id: string | null;
  escapeDisabled?: boolean;
  onClose: () => void;
  actions: ReturnType<typeof useCampaignActions>;
  onConfirm: (c: Confirming) => void;
}) {
  const [filter, setFilter] = useState<(typeof RECIPIENT_FILTERS)[number]>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFilter("all");
    setPage(1);
  }, [id]);

  useEffect(() => {
    if (!id || escapeDisabled) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, escapeDisabled, onClose]);

  // Lock page scroll only while the drawer is open (not on every re-render).
  useEffect(() => {
    if (!id) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [id]);

  const detail = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => api.get<CampaignDetail>(`/campaigns/${id}`),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "running" ? 10_000 : false),
  });

  const recipients = useQuery({
    queryKey: ["campaign", id, "recipients", { page, filter }],
    queryFn: () =>
      api.get<RecipientsResponse>(`/campaigns/${id}/recipients`, {
        page,
        pageSize: 20,
        status: filter === "all" ? undefined : filter,
      }),
    enabled: !!id,
    placeholderData: (previous) => previous,
  });

  const campaign = detail.data;
  const template = campaign ? toOne(campaign.templates) : null;
  const stats = campaign ? statsOf(campaign) : EMPTY_STATS;

  const tiles = [
    { label: "Recipients", value: stats.total, tone: "text-foreground" },
    { label: "Sent", value: stats.sent, tone: "text-brand-500" },
    { label: "Delivered", value: stats.delivered, tone: "text-brand-600" },
    { label: "Read", value: stats.read, tone: "text-brand-magenta" },
    { label: "Replied", value: stats.replied ?? 0, tone: "text-brand-pink" },
    { label: "Failed", value: stats.failed, tone: "text-rose-600" },
  ];

  return (
    <AnimatePresence>
      {id && (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close campaign details"
            className="absolute inset-0 bg-brand-900/25 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Campaign details"
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease }}
          >
            <div className="relative overflow-hidden border-b px-5 pb-5 pt-5 sm:px-6">
              <div aria-hidden className="absolute inset-0 bg-aurora opacity-80" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    Campaign details
                  </p>
                  {detail.isLoading ? (
                    <Skeleton className="h-7 w-56" />
                  ) : (
                    <h2 className="truncate text-xl font-bold">{campaign?.name ?? "Campaign"}</h2>
                  )}
                  {campaign && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <CampaignStatusBadge status={campaign.status} />
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} />
                        {AUDIENCE_LABEL[campaign.audience_type] ?? campaign.audience_type}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
                <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>
            </div>

            <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              {detail.isError ? (
                <ErrorState
                  message="Could not load this campaign."
                  onRetry={() => void detail.refetch()}
                />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2.5">
                    {tiles.map((tile, i) => (
                      <motion.div
                        key={tile.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease, delay: 0.1 + i * 0.04 }}
                        className="rounded-xl border bg-white p-3 shadow-soft"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {tile.label}
                        </p>
                        {detail.isLoading ? (
                          <Skeleton className="mt-1 h-6 w-12" />
                        ) : (
                          <p className={cn("mt-0.5 font-display text-xl font-bold tabular-nums", tile.tone)}>
                            {tile.value.toLocaleString()}
                          </p>
                        )}
                        {tile.label !== "Recipients" && !detail.isLoading && (
                          <p className="text-[11px] text-muted-foreground">{pct(tile.value, stats.total)}%</p>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {campaign && (
                    <div className="space-y-3 rounded-2xl border bg-brand-50/30 p-4">
                      <DetailRow icon={FileText} label="Template" value={template?.name ?? "—"} mono />
                      {campaign.scheduled_at && (
                        <DetailRow
                          icon={CalendarClock}
                          label="Scheduled for"
                          value={new Date(campaign.scheduled_at).toLocaleString()}
                        />
                      )}
                      {campaign.started_at && (
                        <DetailRow
                          icon={Play}
                          label="Started"
                          value={new Date(campaign.started_at).toLocaleString()}
                        />
                      )}
                      {campaign.completed_at && (
                        <DetailRow
                          icon={CheckCheck}
                          label="Completed"
                          value={new Date(campaign.completed_at).toLocaleString()}
                        />
                      )}
                      {template?.components?.body?.text && (
                        <div className="rounded-xl bg-white p-3 text-sm leading-relaxed text-foreground/80 shadow-soft">
                          <p className="whitespace-pre-wrap break-words">{template.components.body.text}</p>
                        </div>
                      )}
                      <div className="pt-1">
                        <ActionButtons
                          campaign={campaign}
                          actions={actions}
                          onConfirm={onConfirm}
                          size="md"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">Recipients</h3>
                      {recipients.data && (
                        <span className="text-xs text-muted-foreground">
                          {recipients.data.total.toLocaleString()} total
                        </span>
                      )}
                    </div>
                    <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                      {RECIPIENT_FILTERS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            setFilter(f);
                            setPage(1);
                          }}
                          aria-pressed={filter === f}
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition",
                            filter === f
                              ? "border-transparent bg-brand-gradient text-white shadow-glow"
                              : "bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    {recipients.isError ? (
                      <ErrorState
                        message="Could not load recipients."
                        onRetry={() => void recipients.refetch()}
                      />
                    ) : recipients.isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-12" />
                        ))}
                      </div>
                    ) : (recipients.data?.data.length ?? 0) === 0 ? (
                      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No recipients with this status.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-xl border">
                        <ul className="divide-y">
                          {recipients.data!.data.map((r) => {
                            const contact = toOne(r.contacts);
                            const errorText = describeError(r.error);
                            return (
                              <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {contact?.name || (contact ? `+${contact.wa_id}` : "Unknown contact")}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {contact?.name ? `+${contact.wa_id}` : ""}
                                    {r.sent_at
                                      ? `${contact?.name ? " · " : ""}${new Date(r.sent_at).toLocaleString()}`
                                      : ""}
                                  </p>
                                  {errorText && (
                                    <p className="mt-0.5 truncate text-xs text-rose-600" title={errorText}>
                                      {errorText}
                                    </p>
                                  )}
                                </div>
                                <Badge tone={statusTone(r.status)} className="shrink-0 capitalize">
                                  {r.status}
                                </Badge>
                              </li>
                            );
                          })}
                        </ul>
                        {recipients.data!.totalPages > 1 && (
                          <Pagination
                            page={recipients.data!.page}
                            totalPages={recipients.data!.totalPages}
                            total={recipients.data!.total}
                            onPageChange={setPage}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t bg-white px-5 py-3 sm:px-6">
              <Link
                href="/campaigns/history"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                All campaign history
                <ChevronRight size={14} />
              </Link>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon size={14} className="text-primary" />
        {label}
      </span>
      <span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

function describeError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as { title?: string; message?: string; details?: string };
    return e.title ?? e.message ?? e.details ?? null;
  }
  return null;
}
