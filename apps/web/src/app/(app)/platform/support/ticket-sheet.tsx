"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Calendar, Lock, LifeBuoy, Save, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion, ease } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Sheet } from "../_components/overlay";
import { Avatar, relation, timeAgo } from "../_components/ui";

/** Mirrors the `ticket_status` enum. Tenants can set "waiting"; the platform PATCH accepts the other four. */
export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
type SettableStatus = Exclude<TicketStatus, "waiting">;
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface SupportTicketRow {
  id: string;
  organization_id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  organizations: { id: string; name: string; slug: string } | null;
  users: { id: string; name: string | null; email: string } | null;
}

interface TicketMessage {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  users: unknown;
}

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting on tenant",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const priorityTone = (p: string) =>
  p === "urgent" ? "danger" : p === "high" ? "warning" : p === "medium" ? "info" : "neutral";

export const ticketStatusTone = (s: string) =>
  s === "resolved"
    ? "success"
    : s === "in_progress" || s === "waiting"
      ? "warning"
      : s === "open"
        ? "info"
        : "neutral";

const STATUSES: SettableStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const priorityActive: Record<TicketPriority, string> = {
  low: "border-slate-300 bg-slate-100 text-slate-700",
  medium: "border-violet-300 bg-violet-50 text-violet-700",
  high: "border-amber-300 bg-amber-50 text-amber-700",
  urgent: "border-rose-300 bg-rose-50 text-rose-700",
};

export function TicketSheet({ ticket, onClose }: { ticket: SupportTicketRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [saved, setSaved] = useState({ status: ticket.status, priority: ticket.priority });
  const [reply, setReply] = useState("");

  const messagesKey = ["platform", "support-tickets", ticket.id, "messages"];
  const messages = useQuery({
    queryKey: messagesKey,
    queryFn: () => api.get<{ data: TicketMessage[] }>(`/platform/support-tickets/${ticket.id}/messages`),
  });

  const dirty = status !== saved.status || priority !== saved.priority;

  const updateTicket = useMutation({
    // Only send what changed: a ticket the tenant set to "waiting" must still
    // accept a priority change, and the platform route rejects that status.
    mutationFn: () =>
      api.patch(`/platform/support-tickets/${ticket.id}`, {
        ...(status !== saved.status && { status }),
        ...(priority !== saved.priority && { priority }),
      }),
    onSuccess: () => {
      toast.success("Ticket updated");
      setSaved({ status, priority });
      void queryClient.invalidateQueries({ queryKey: ["platform", "support-tickets"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update ticket"),
  });

  const sendReply = useMutation({
    mutationFn: () =>
      api.post(`/platform/support-tickets/${ticket.id}/messages`, {
        body: reply.trim(),
        // Internal notes share the tenant's ticket thread and are shown to the
        // tenant team, so platform replies are always sent as public replies.
        isInternal: false,
      }),
    onSuccess: () => {
      toast.success("Reply sent");
      setReply("");
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not send the reply"),
  });

  const thread = messages.data?.data ?? [];

  return (
    <Sheet
      onClose={onClose}
      icon={LifeBuoy}
      size="xl"
      title={ticket.subject}
      description={`#${ticket.id.slice(0, 8)} · ${ticket.organizations?.name ?? "Unknown tenant"}`}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" loading={updateTicket.isPending} disabled={!dirty} onClick={() => updateTicket.mutate()}>
            {!updateTicket.isPending && <Save size={16} />}
            Save status & priority
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Meta */}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Building2 size={13} /> Organization
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold">{ticket.organizations?.name ?? "—"}</dd>
          </div>
          <div className="rounded-2xl border bg-white p-3.5">
            <dt className="text-xs font-semibold text-muted-foreground">Submitter</dt>
            <dd className="mt-1 truncate text-sm font-semibold" title={ticket.users?.email}>
              {ticket.users?.name ?? ticket.users?.email ?? "—"}
            </dd>
          </div>
          <div className="rounded-2xl border bg-white p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Calendar size={13} /> Submitted
            </dt>
            <dd className="mt-1 text-sm font-semibold">{new Date(ticket.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>

        {/* Status + priority */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Status</legend>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    status === s
                      ? "border-transparent bg-brand-gradient text-white shadow-glow"
                      : "bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {status === "waiting" && (
              <p className="mt-2 text-xs text-muted-foreground">Currently waiting on the tenant.</p>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Priority</legend>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={priority === p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    priority === p
                      ? priorityActive[p]
                      : "bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Conversation */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Conversation</h3>
            <Badge tone="neutral">{thread.length} messages</Badge>
          </div>
          <div className="space-y-3 rounded-2xl border bg-brand-50/30 p-4">
            {messages.isLoading ? (
              <>
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="ml-auto h-16 w-2/3" />
              </>
            ) : messages.isError ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Could not load the conversation.{" "}
                <button type="button" className="font-semibold text-primary hover:underline" onClick={() => void messages.refetch()}>
                  Retry
                </button>
              </p>
            ) : thread.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No messages on this ticket yet.</p>
            ) : (
              thread.map((m, i) => {
                const author = relation<{ id: string; name: string | null; email: string }>(m.users);
                const fromSubmitter = !!author && author.id === ticket.created_by;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease, delay: Math.min(i, 12) * 0.04 }}
                    className={cn("flex gap-2.5", !fromSubmitter && "flex-row-reverse")}
                  >
                    <Avatar name={author?.name ?? author?.email ?? "?"} size="sm" />
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                        m.is_internal
                          ? "border border-amber-200 bg-amber-50 text-amber-900"
                          : fromSubmitter
                            ? "bg-white"
                            : "bg-brand-gradient text-white",
                      )}
                    >
                      <p
                        className={cn(
                          "mb-1 flex items-center gap-1.5 text-[11px] font-semibold",
                          m.is_internal ? "text-amber-700" : fromSubmitter ? "text-muted-foreground" : "text-white/80",
                        )}
                      >
                        {m.is_internal && <Lock size={11} />}
                        {author?.name ?? author?.email ?? "Unknown"} · {timeAgo(m.created_at)}
                        {m.is_internal && " · internal"}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (reply.trim()) sendReply.mutate();
          }}
          className="space-y-3 rounded-2xl border bg-white p-4 shadow-soft"
        >
          <label htmlFor="ticket-reply" className="text-sm font-semibold">
            Reply to tenant
          </label>
          <Textarea
            id="ticket-reply"
            rows={3}
            maxLength={2000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Visible to the tenant in their support ticket.</p>
            <Button type="submit" size="sm" loading={sendReply.isPending} disabled={!reply.trim()}>
              {!sendReply.isPending && <Send size={14} />}
              Send reply
            </Button>
          </div>
        </form>
      </div>
    </Sheet>
  );
}
