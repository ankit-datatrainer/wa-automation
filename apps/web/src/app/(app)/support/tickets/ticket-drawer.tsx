"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Lock, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { ease, motion } from "@/components/motion";
import { relation } from "@/components/data/ledger-table";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { Drawer } from "../_components/overlay";
import {
  labelize,
  priorityBadgeTone,
  statusBadgeTone,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../_components/ticket-meta";

interface TicketMessage {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  users: unknown;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  messages: TicketMessage[];
}

export function TicketDrawer({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  // Keep the last ticket rendered while the drawer slides out, so it doesn't
  // collapse to an empty panel mid-animation.
  const [shownId, setShownId] = useState(ticketId);
  if (ticketId && ticketId !== shownId) setShownId(ticketId);

  return (
    <Drawer open={Boolean(ticketId)} onClose={onClose} label="Ticket details">
      {shownId && <TicketDetailView key={shownId} ticketId={shownId} />}
    </Drawer>
  );
}

function TicketDetailView({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const threadEnd = useRef<HTMLDivElement>(null);

  const ticket = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => api.get<TicketDetail>(`/support/tickets/${ticketId}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    void queryClient.invalidateQueries({ queryKey: ["support-reports"] });
  };

  const update = useMutation({
    mutationFn: (patch: { status?: string; priority?: string }) =>
      api.patch(`/support/tickets/${ticketId}`, patch),
    onSuccess: () => {
      toast.success("Ticket updated");
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update the ticket"),
  });

  const sendReply = useMutation({
    mutationFn: () => api.post(`/support/tickets/${ticketId}/reply`, { body: reply.trim() }),
    onSuccess: () => {
      setReply("");
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not send the reply"),
  });

  const messageCount = ticket.data?.messages.length ?? 0;
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount]);

  if (ticket.isError) {
    return (
      <div className="p-6 pt-16">
        <ErrorState message="Could not load this ticket." onRetry={() => void ticket.refetch()} />
      </div>
    );
  }

  if (ticket.isLoading || !ticket.data) {
    return (
      <div className="space-y-4 p-6 pt-16">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const data = ticket.data;
  const closed = data.status === "closed";

  return (
    <>
      {/* Header */}
      <div className="border-b bg-gradient-to-br from-brand-50/80 via-white to-white px-6 pb-5 pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
          Ticket #{data.id.slice(0, 8)}
        </p>
        <h2 className="mt-1 pr-10 font-display text-xl font-semibold leading-snug">
          {data.subject}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={statusBadgeTone(data.status)}>{labelize(data.status)}</Badge>
          <Badge tone={priorityBadgeTone(data.priority)} className="capitalize">
            {data.priority} priority
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock size={13} />
            {new Date(data.created_at).toLocaleString()}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Status</span>
            <Select
              value={data.status}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ status: e.target.value })}
              className="h-10"
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Priority</span>
            <Select
              value={data.priority}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ priority: e.target.value })}
              className="h-10"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {labelize(p)}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {/* Thread */}
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-brand-50/20 px-6 py-5">
        {data.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div className="space-y-2">
              <MessageSquare className="mx-auto text-primary/60" size={22} />
              <p>No messages on this ticket yet.</p>
            </div>
          </div>
        ) : (
          data.messages.map((m, i) => {
            const author = relation<{ name: string | null; email: string }>(m.users);
            const name = author?.name ?? author?.email ?? "Support";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease, delay: Math.min(i, 10) * 0.04 }}
                className="flex gap-3"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-[11px] font-bold text-white shadow-glow">
                  {initials(name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    {m.is_internal && (
                      <Badge tone="warning" className="text-[10px]">
                        <Lock size={10} />
                        Internal
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-1.5 whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border px-4 py-3 text-sm leading-relaxed shadow-soft",
                      m.is_internal ? "border-amber-200 bg-amber-50/70" : "bg-white",
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={threadEnd} />
      </div>

      {/* Composer */}
      <div className="border-t bg-white p-4">
        {closed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              This ticket is closed.
            </span>
            <Button
              size="sm"
              variant="outline"
              loading={update.isPending}
              onClick={() => update.mutate({ status: "open" })}
            >
              Reopen
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) sendReply.mutate();
            }}
            className="space-y-2"
          >
            <label htmlFor="ticket-reply" className="sr-only">
              Reply
            </label>
            <Textarea
              id="ticket-reply"
              rows={3}
              maxLength={5000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && reply.trim()) {
                  e.preventDefault();
                  sendReply.mutate();
                }
              }}
              placeholder="Add a reply… (Ctrl + Enter to send)"
              className="min-h-20 resize-none"
            />
            <div className="flex items-center justify-between gap-3">
              {data.status !== "resolved" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={update.isPending}
                  onClick={() => update.mutate({ status: "resolved" })}
                >
                  <CheckCircle2 size={15} />
                  Mark resolved
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                size="sm"
                loading={sendReply.isPending}
                disabled={!reply.trim()}
              >
                {!sendReply.isPending && <Send size={14} />}
                Send reply
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
