"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { relation } from "@/components/data/ledger-table";
import { api, ApiClientError } from "@/lib/api-client";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  users: unknown;
}

export default function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");

  const tickets = useQuery({
    queryKey: ["tickets", { page, status }],
    queryFn: () =>
      api.get<{ data: Ticket[]; page: number; totalPages: number; total: number }>(
        "/support/tickets",
        { page, pageSize: 25, status: status || undefined },
      ),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/support/tickets", { subject: subject.trim(), message: message.trim(), priority }),
    onSuccess: () => {
      toast.success("Ticket raised");
      setFormOpen(false);
      setSubject("");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not raise the ticket"),
  });

  const update = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api.patch(`/support/tickets/${id}`, { status: newStatus }),
    onSuccess: () => {
      toast.success("Ticket updated");
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
  });

  const rows = tickets.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Raise an issue with our team and track it through to resolution."
        actions={
          <Button onClick={() => setFormOpen((open) => !open)}>
            <Plus size={16} />
            New ticket
          </Button>
        }
      />

      {formOpen && (
        <Card className="mb-4 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Subject" required>
                {({ id }) => (
                  <Input
                    id={id}
                    required
                    minLength={4}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Templates stuck in pending review"
                  />
                )}
              </Field>
              <Field label="Priority">
                {({ id }) => (
                  <Select id={id} value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Describe the issue" required>
              {({ id }) => (
                <Textarea
                  id={id}
                  required
                  minLength={4}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What happened, and what did you expect instead?"
                />
              )}
            </Field>

            <div className="flex gap-3">
              <Button type="submit" loading={create.isPending}>
                Raise ticket
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Select
            className="w-56"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        {tickets.isError ? (
          <ErrorState message="Could not load tickets." onRetry={() => void tickets.refetch()} />
        ) : tickets.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets yet"
            description="If something isn't working, raise a ticket and we'll pick it up."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Subject</TH>
                  <TH>Raised by</TH>
                  <TH>Priority</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((ticket) => {
                  const author = relation<{ name: string | null; email: string }>(ticket.users);
                  return (
                    <TR key={ticket.id}>
                      <TD className="font-medium">{ticket.subject}</TD>
                      <TD className="text-sm text-muted-foreground">
                        {author?.name ?? author?.email ?? "—"}
                      </TD>
                      <TD>
                        <Badge tone={statusTone(ticket.priority)}>{ticket.priority}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={statusTone(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TD>
                      <TD>
                        <div className="flex justify-end">
                          {ticket.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                update.mutate({
                                  id: ticket.id,
                                  newStatus: ticket.status === "resolved" ? "closed" : "resolved",
                                })
                              }
                            >
                              {ticket.status === "resolved" ? "Close" : "Mark resolved"}
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
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
    </>
  );
}
