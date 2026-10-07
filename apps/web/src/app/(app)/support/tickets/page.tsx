"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LifeBuoy, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { FadeIn, SegmentedTabs, ease, motion } from "@/components/motion";
import { relation } from "@/components/data/ledger-table";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { Modal } from "../_components/overlay";
import { TicketDrawer } from "./ticket-drawer";
import {
  labelize,
  priorityBadgeTone,
  statusBadgeTone,
  TICKET_PRIORITIES,
} from "../_components/ticket-meta";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  users: unknown;
}

type StatusFilter = "" | "open" | "in_progress" | "waiting" | "resolved" | "closed";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("");
  const [formOpen, setFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deep link from Support Reports: /support/tickets?new=1 opens the form.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setFormOpen(true);
  }, []);

  const tickets = useQuery({
    queryKey: ["tickets", { page, status }],
    queryFn: () =>
      api.get<{ data: Ticket[]; page: number; totalPages: number; total: number }>(
        "/support/tickets",
        // The API doesn't apply `status` yet, so filtered views pull the largest page
        // the API allows and narrow it client-side below.
        { page, pageSize: status ? 100 : 25, status: status || undefined },
      ),
    placeholderData: keepPreviousData,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/support/tickets", { subject: subject.trim(), message: message.trim(), priority }),
    onSuccess: () => {
      toast.success("Ticket raised");
      setFormOpen(false);
      setSubject("");
      setMessage("");
      setPriority("medium");
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["support-reports"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not raise the ticket"),
  });

  const update = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api.patch(`/support/tickets/${id}`, { status: newStatus }),
    onSuccess: (_data, variables) => {
      toast.success("Ticket updated");
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["support-reports"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
  });

  // The API falls back to demo fixtures (non-UUID ids such as "tk1") when an org has no
  // tickets, and currently ignores the status param; filter both out client-side so the
  // list only ever shows this account's real tickets in the selected status.
  const rawRows = tickets.data?.data ?? [];
  const rows = rawRows.filter((t) => UUID_RE.test(t.id) && (!status || t.status === status));
  const adjusted = rows.length !== rawRows.length;
  const total = adjusted ? rows.length : (tickets.data?.total ?? 0);
  // A filtered page can come back empty while later pages still hold matches, so
  // keep the pager reachable whenever the API reports more than one page.
  const showPager =
    !!tickets.data && !tickets.isError && (rows.length > 0 || tickets.data.totalPages > 1);
  const subjectTrimmed = subject.trim();
  const messageTrimmed = message.trim();

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Raise an issue with our team and track it through to resolution."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            New ticket
          </Button>
        }
      />

      <FadeIn>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-brand-50/60 via-white to-white px-4 py-3">
            <div className="scrollbar-thin -mx-1 max-w-full overflow-x-auto px-1 py-0.5">
              <SegmentedTabs
                tabs={FILTERS}
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                layoutId="ticket-status-filter"
                className="whitespace-nowrap"
              />
            </div>
            {tickets.data && (
              <p className="text-xs font-medium text-muted-foreground">
                {total.toLocaleString()} {total === 1 ? "ticket" : "tickets"}
              </p>
            )}
          </div>

          {tickets.isError ? (
            <div className="p-4">
              <ErrorState
                message="Could not load tickets."
                onRetry={() => void tickets.refetch()}
              />
            </div>
          ) : tickets.isLoading ? (
            <div className="space-y-2.5 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title={status ? `No ${labelize(status).toLowerCase()} tickets` : "No tickets yet"}
              description={
                status
                  ? "Try another filter, or raise a new ticket."
                  : "If something isn't working, raise a ticket and we'll pick it up."
              }
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus size={16} />
                  Raise a ticket
                </Button>
              }
            />
          ) : (
            <>
              <div
                className={cn(
                  "transition-opacity duration-200",
                  tickets.isPlaceholderData && "pointer-events-none opacity-60",
                )}
              >
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Subject</TH>
                      <TH>Raised by</TH>
                      <TH>Priority</TH>
                      <TH>Status</TH>
                      <TH>Created</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rows.map((ticket, index) => {
                      const author = relation<{ name: string | null; email: string }>(ticket.users);
                      const authorLabel = author?.name ?? author?.email ?? "—";
                      return (
                        <motion.tr
                          key={ticket.id}
                          initial={index < 20 ? { opacity: 0, y: 6 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease, delay: Math.min(index, 20) * 0.025 }}
                          onClick={() => setSelectedId(ticket.id)}
                          className="group cursor-pointer transition-colors duration-150 hover:bg-brand-50/50"
                        >
                          <TD className="max-w-[320px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(ticket.id);
                              }}
                              className="flex w-full items-center gap-2 text-left font-semibold text-foreground transition-colors group-hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                            >
                              <span className="truncate">{ticket.subject}</span>
                              <ChevronRight
                                size={14}
                                className="shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                              />
                            </button>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-2">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-primary ring-1 ring-brand-100">
                                {initials(author?.name ?? author?.email)}
                              </span>
                              <span className="truncate text-sm text-muted-foreground">
                                {authorLabel}
                              </span>
                            </div>
                          </TD>
                          <TD>
                            <Badge tone={priorityBadgeTone(ticket.priority)} className="capitalize">
                              {ticket.priority}
                            </Badge>
                          </TD>
                          <TD>
                            <Badge tone={statusBadgeTone(ticket.status)}>
                              {labelize(ticket.status)}
                            </Badge>
                          </TD>
                          <TD
                            className="whitespace-nowrap text-xs text-muted-foreground"
                            title={new Date(ticket.created_at).toLocaleString()}
                          >
                            {relativeTime(ticket.created_at)}
                          </TD>
                          <TD>
                            <div className="flex justify-end">
                              {ticket.status !== "closed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={update.isPending && update.variables?.id === ticket.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    update.mutate({
                                      id: ticket.id,
                                      newStatus:
                                        ticket.status === "resolved" ? "closed" : "resolved",
                                    });
                                  }}
                                >
                                  {ticket.status === "resolved" ? "Close" : "Mark resolved"}
                                </Button>
                              )}
                            </div>
                          </TD>
                        </motion.tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </>
          )}

          {showPager && tickets.data && (
            <Pagination
              page={tickets.data.page}
              totalPages={tickets.data.totalPages}
              total={total}
              onPageChange={setPage}
            />
          )}
        </Card>
      </FadeIn>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Raise a ticket"
        description="Tell us what's going wrong — the more detail, the faster we can help."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_170px]">
            <Field
              label="Subject"
              required
              error={subject && subjectTrimmed.length < 4 ? "At least 4 characters" : undefined}
            >
              {({ id }) => (
                <Input
                  id={id}
                  required
                  autoFocus
                  minLength={4}
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Templates stuck in pending review"
                  aria-invalid={(subject && subjectTrimmed.length < 4) || undefined}
                />
              )}
            </Field>
            <Field label="Priority">
              {({ id }) => (
                <Select id={id} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {labelize(p)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field
            label="Describe the issue"
            required
            hint={`${message.length}/5000`}
            error={message && messageTrimmed.length < 4 ? "At least 4 characters" : undefined}
          >
            {({ id }) => (
              <Textarea
                id={id}
                required
                minLength={4}
                maxLength={5000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened, and what did you expect instead?"
                aria-invalid={(message && messageTrimmed.length < 4) || undefined}
              />
            )}
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={create.isPending}
              disabled={subjectTrimmed.length < 4 || messageTrimmed.length < 4}
            >
              Raise ticket
            </Button>
          </div>
        </form>
      </Modal>

      <TicketDrawer ticketId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
