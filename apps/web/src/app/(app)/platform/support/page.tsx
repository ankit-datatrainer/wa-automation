"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Headphones,
  LifeBuoy,
  MessageSquare,
  Search,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface SupportTicketRow {
  id: string;
  organization_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
  } | null;
  users: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function PlatformSupportPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [activeTicket, setActiveTicket] = useState<SupportTicketRow | null>(null);

  const tickets = useQuery({
    queryKey: ["platform", "support-tickets", { page, search, status, priority }],
    queryFn: () =>
      api.get<{ data: SupportTicketRow[]; page: number; totalPages: number; total: number }>(
        "/platform/support-tickets",
        {
          page,
          pageSize: 25,
          search: search || undefined,
          status: status || undefined,
          priority: priority || undefined,
        },
      ),
  });

  const updateTicket = useMutation({
    mutationFn: ({
      id,
      status,
      priority,
    }: {
      id: string;
      status?: "open" | "in_progress" | "resolved" | "closed";
      priority?: "low" | "medium" | "high" | "urgent";
    }) => api.patch(`/platform/support-tickets/${id}`, { status, priority }),
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      setActiveTicket(null);
      void queryClient.invalidateQueries({ queryKey: ["platform", "support-tickets"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update ticket"),
  });

  const rows = tickets.data?.data ?? [];

  const priorityTone = (p: string) => {
    switch (p) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const statusTone = (s: string) => {
    switch (s) {
      case "resolved":
        return "success";
      case "in_progress":
        return "warning";
      case "open":
        return "info";
      default:
        return "neutral";
    }
  };

  const openCount = rows.filter((r) => r.status === "open" || r.status === "in_progress").length;
  const urgentCount = rows.filter((r) => r.priority === "urgent" || r.priority === "high").length;
  const resolvedCount = rows.filter((r) => r.status === "resolved").length;

  return (
    <>
      <PageHeader
        title="Platform Support Desk"
        description="Centralized ticketing helpdesk across all tenant organizations."
        onRefresh={() => void tickets.refetch()}
        refreshing={tickets.isFetching}
      />

      {/* Metrics Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Tickets
            </p>
            <p className="text-2xl font-bold">{tickets.data?.total ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Clock size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open / In Progress
            </p>
            <p className="text-2xl font-bold">{openCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              urgentCount > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <AlertCircle size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              High / Urgent
            </p>
            <p className="text-2xl font-bold">{urgentCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolved
            </p>
            <p className="text-2xl font-bold">{resolvedCount}</p>
          </div>
        </Card>
      </div>

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by ticket subject..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            className="w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>

          <Select
            className="w-40"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>

        {tickets.isError ? (
          <ErrorState
            message="Could not load support tickets."
            onRetry={() => void tickets.refetch()}
          />
        ) : tickets.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No support tickets found"
            description="No tickets match the selected criteria."
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
                {rows.map((ticket) => (
                  <TR key={ticket.id}>
                    <TD>
                      <p className="font-semibold text-sm">{ticket.subject}</p>
                      <p className="font-mono text-xs text-muted-foreground">{ticket.id.slice(0, 8)}…</p>
                    </TD>

                    <TD>
                      <p className="font-medium text-sm">{ticket.organizations?.name ?? "—"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{ticket.organizations?.slug}</p>
                    </TD>

                    <TD>
                      <p className="text-sm font-medium">{ticket.users?.name ?? "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{ticket.users?.email}</p>
                    </TD>

                    <TD>
                      <Badge tone={priorityTone(ticket.priority)}>
                        {ticket.priority.toUpperCase()}
                      </Badge>
                    </TD>

                    <TD>
                      <Badge tone={statusTone(ticket.status)}>
                        {ticket.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TD>

                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TD>

                    <TD>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTicket(ticket)}
                        >
                          Manage
                        </Button>
                      </div>
                    </TD>
                  </TR>
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

      {/* Ticket Management Dialog */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{activeTicket.subject}</h2>
                <p className="text-xs text-muted-foreground">
                  Tenant: {activeTicket.organizations?.name} · Submitter: {activeTicket.users?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Change Status
                </label>
                <Select
                  defaultValue={activeTicket.status}
                  id="ticket-status-select"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Change Priority
                </label>
                <Select
                  defaultValue={activeTicket.priority}
                  id="ticket-priority-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setActiveTicket(null)}>
                Cancel
              </Button>
              <Button
                loading={updateTicket.isPending}
                onClick={() => {
                  const statusSelect = document.getElementById("ticket-status-select") as HTMLSelectElement;
                  const prioritySelect = document.getElementById("ticket-priority-select") as HTMLSelectElement;
                  updateTicket.mutate({
                    id: activeTicket.id,
                    status: statusSelect.value as any,
                    priority: prioritySelect.value as any,
                  });
                }}
              >
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
