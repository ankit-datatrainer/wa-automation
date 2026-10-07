"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, FadeIn, SegmentedTabs, Stagger } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { Avatar, KpiTile, MotionTR, SearchField, timeAgo, useDebouncedValue } from "../_components/ui";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TicketSheet,
  priorityTone,
  ticketStatusTone,
  type SupportTicketRow,
  type TicketStatus,
} from "./ticket-sheet";

type TicketPage = { data: SupportTicketRow[]; page: number; totalPages: number; total: number };
type StatusFilter = "" | TicketStatus;

function useTicketCount(filter: { status?: string; priority?: string }) {
  return useQuery({
    queryKey: ["platform", "support-tickets", "count", filter],
    queryFn: () => api.get<TicketPage>("/platform/support-tickets", { page: 1, pageSize: 1, ...filter }),
    select: (res) => res.total,
  });
}

export default function PlatformSupportPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("");
  const [priority, setPriority] = useState("");
  const [activeTicket, setActiveTicket] = useState<SupportTicketRow | null>(null);

  const tickets = useQuery({
    queryKey: ["platform", "support-tickets", { page, search: debouncedSearch, status, priority }],
    queryFn: () =>
      api.get<TicketPage>("/platform/support-tickets", {
        page,
        pageSize: 25,
        search: debouncedSearch || undefined,
        status: status || undefined,
        priority: priority || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const total = useTicketCount({});
  const open = useTicketCount({ status: "open" });
  const inProgress = useTicketCount({ status: "in_progress" });
  const waiting = useTicketCount({ status: "waiting" });
  const urgent = useTicketCount({ priority: "urgent" });
  const resolved = useTicketCount({ status: "resolved" });

  const rows = tickets.data?.data ?? [];
  const openCount = (open.data ?? 0) + (inProgress.data ?? 0) + (waiting.data ?? 0);
  const urgentCount = urgent.data ?? 0;

  return (
    <>
      <PageHeader
        title="Support Desk"
        description="Tickets raised by every tenant. Triage, set priority and reply from one place."
        onRefresh={() => {
          void tickets.refetch();
          void total.refetch();
          void open.refetch();
          void inProgress.refetch();
          void waiting.refetch();
          void urgent.refetch();
          void resolved.refetch();
        }}
        refreshing={tickets.isFetching}
      />

      <Stagger className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={LifeBuoy} label="Total tickets" value={total.data ?? 0} loading={total.isLoading} sublabel="All time" />
        <KpiTile
          icon={Clock}
          label="Open / pending"
          value={openCount}
          loading={open.isLoading || inProgress.isLoading || waiting.isLoading}
          tone="warning"
          sublabel="Awaiting resolution"
        />
        <KpiTile
          icon={AlertCircle}
          label="Urgent"
          value={urgentCount}
          loading={urgent.isLoading}
          tone={urgentCount > 0 ? "danger" : "neutral"}
          sublabel="Highest priority"
          badge={urgentCount > 0 ? <Badge tone="danger">Act now</Badge> : undefined}
        />
        <KpiTile icon={CheckCircle2} label="Resolved" value={resolved.data ?? 0} loading={resolved.isLoading} tone="success" sublabel="Closed out successfully" />
      </Stagger>

      <FadeIn delay={0.1}>
        <Card className="overflow-hidden">
          <div className="space-y-3 border-b p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <SearchField
                label="Search tickets"
                placeholder="Search by ticket subject…"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
              />
              <Select
                aria-label="Filter by priority"
                className="lg:w-44"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
            <div className="scrollbar-none overflow-x-auto">
              <SegmentedTabs<StatusFilter>
                layoutId="support-status-filter"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                tabs={[
                  { value: "", label: "All" },
                  { value: "open", label: "Open" },
                  { value: "in_progress", label: "In progress" },
                  { value: "waiting", label: "Waiting" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </div>
          </div>

          {tickets.isError ? (
            <div className="p-4">
              <ErrorState message="Could not load support tickets." onRetry={() => void tickets.refetch()} />
            </div>
          ) : tickets.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title={search || status || priority ? "No tickets match" : "Inbox zero"}
              description={
                search || status || priority
                  ? "No tickets match the selected filters."
                  : "No tenant has raised a support ticket yet."
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Subject</TH>
                    <TH>Organization</TH>
                    <TH>Submitter</TH>
                    <TH>Priority</TH>
                    <TH>Status</TH>
                    <TH>Submitted</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((ticket, index) => (
                    <MotionTR
                      key={ticket.id}
                      index={index}
                      className="cursor-pointer"
                      onClick={() => setActiveTicket(ticket)}
                    >
                      <TD>
                        <p className="max-w-[260px] truncate font-semibold">{ticket.subject}</p>
                        <p className="font-mono text-xs text-muted-foreground">#{ticket.id.slice(0, 8)}</p>
                      </TD>
                      <TD>
                        <p className="max-w-[180px] truncate font-medium">{ticket.organizations?.name ?? "—"}</p>
                        <p className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                          {ticket.organizations?.slug}
                        </p>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={ticket.users?.name ?? ticket.users?.email} size="sm" />
                          <div className="min-w-0">
                            <p className="max-w-[160px] truncate text-sm font-medium">{ticket.users?.name ?? "—"}</p>
                            <p className="max-w-[160px] truncate text-xs text-muted-foreground">{ticket.users?.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={priorityTone(ticket.priority)}>{PRIORITY_LABEL[ticket.priority] ?? ticket.priority}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={ticketStatusTone(ticket.status)}>{STATUS_LABEL[ticket.status] ?? ticket.status}</Badge>
                      </TD>
                      <TD
                        className="whitespace-nowrap text-xs text-muted-foreground"
                        title={new Date(ticket.created_at).toLocaleString()}
                      >
                        {timeAgo(ticket.created_at)}
                      </TD>
                      <TD>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTicket(ticket);
                            }}
                          >
                            Manage
                          </Button>
                        </div>
                      </TD>
                    </MotionTR>
                  ))}
                </TBody>
              </Table>

              <Pagination
                page={tickets.data!.page}
                totalPages={tickets.data!.totalPages}
                total={tickets.data!.total}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      </FadeIn>

      <AnimatePresence>
        {activeTicket && (
          <TicketSheet key={activeTicket.id} ticket={activeTicket} onClose={() => setActiveTicket(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
