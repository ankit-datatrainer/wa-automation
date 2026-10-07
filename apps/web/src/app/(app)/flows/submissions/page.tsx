"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, FileSpreadsheet, ListChecks, Search, Users, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { FadeIn, motion, Stagger, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { relation } from "@/components/data/ledger-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import { downloadCsv, formatDateTime, timeAgo } from "../../chatbots/_components/data";
import { Modal } from "../../chatbots/_components/modal";
import { StatTile } from "../../chatbots/_components/stat-tile";

interface SubmissionRow {
  id: string;
  data: Record<string, unknown>;
  submitted_at: string;
  flows: unknown;
  contacts: unknown;
}

type Contact = { wa_id: string; name: string | null };

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function FlowSubmissionsPage() {
  const submissions = useQuery({
    queryKey: ["flow-submissions"],
    queryFn: () => api.get<{ data: SubmissionRow[] }>("/flows/submissions"),
  });

  const [flowFilter, setFlowFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SubmissionRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openRow = (row: SubmissionRow) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const rows = useMemo(() => submissions.data?.data ?? [], [submissions.data]);

  const flowNames = useMemo(
    () => [...new Set(rows.map((r) => relation<{ name: string }>(r.flows)?.name).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = rows.filter((row) => {
    if (flowFilter && relation<{ name: string }>(row.flows)?.name !== flowFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    const contact = relation<Contact>(row.contacts);
    return (
      (contact?.name ?? "").toLowerCase().includes(needle) ||
      (contact?.wa_id ?? "").includes(needle.replace(/^\+/, "")) ||
      Object.values(row.data ?? {}).some((v) => display(v).toLowerCase().includes(needle))
    );
  });

  // Union of every submission's keys, so sparse answers still line up.
  const keys = useMemo(() => [...new Set(filtered.flatMap((row) => Object.keys(row.data ?? {})))], [filtered]);
  const columns = keys.slice(0, 5);
  const uniqueContacts = new Set(rows.map((r) => relation<Contact>(r.contacts)?.wa_id).filter(Boolean)).size;

  const exportCsv = () => {
    const header = ["Submitted at", "Flow", "Contact", "Phone", ...keys];
    const lines = filtered.map((row) => {
      const flow = relation<{ name: string }>(row.flows);
      const contact = relation<Contact>(row.contacts);
      return [
        new Date(row.submitted_at).toISOString(),
        flow?.name ?? "",
        contact?.name ?? "",
        contact?.wa_id ? `+${contact.wa_id}` : "",
        ...keys.map((key) => {
          const value = row.data?.[key];
          return value === null || value === undefined
            ? ""
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);
        }),
      ];
    });
    downloadCsv(`flow-submissions-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
  };

  const selectedFlow = selected ? relation<{ name: string }>(selected.flows) : null;
  const selectedContact = selected ? relation<Contact>(selected.contacts) : null;

  return (
    <>
      <PageHeader
        title="Flow Submissions"
        description="Answers customers gave inside your flows."
        onRefresh={() => void submissions.refetch()}
        refreshing={submissions.isFetching}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} />
            Export CSV
          </Button>
        }
      />

      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          icon={FileSpreadsheet}
          label="Submissions"
          value={submissions.data ? rows.length : undefined}
          hint="Latest 200"
        />
        <StatTile
          icon={Users}
          label="Contacts"
          accent="pink"
          value={submissions.data ? uniqueContacts : undefined}
          hint="Unique people who answered"
        />
        <StatTile
          icon={Workflow}
          label="Flows"
          accent="orange"
          value={submissions.data ? flowNames.length : undefined}
          hint="With at least one submission"
        />
      </Stagger>

      <FadeIn delay={0.1}>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-border/70 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search submissions"
                placeholder="Search contacts or answers…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              aria-label="Filter by flow"
              className="sm:w-60"
              value={flowFilter}
              onChange={(e) => setFlowFilter(e.target.value)}
            >
              <option value="">All flows</option>
              {flowNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground sm:ml-auto">
              {filtered.length} of {rows.length} shown
            </p>
          </div>

          {submissions.isError ? (
            <div className="p-4">
              <ErrorState message="Could not load submissions." onRetry={() => void submissions.refetch()} />
            </div>
          ) : submissions.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No submissions yet"
              description="When a contact completes a flow, their answers land here."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No submissions match"
              description="Try another search or flow."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setFlowFilter("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Contact</TH>
                  <TH>Flow</TH>
                  {columns.map((key) => (
                    <TH key={key}>{key}</TH>
                  ))}
                  <TH>Submitted</TH>
                  <TH>
                    <span className="sr-only">Open</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((row, index) => {
                  const flow = relation<{ name: string }>(row.flows);
                  const contact = relation<Contact>(row.contacts);
                  const animated = index < 20;
                  return (
                    <motion.tr
                      key={row.id}
                      initial={animated ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease, delay: animated ? index * 0.025 : 0 }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View submission from ${contact?.name ?? contact?.wa_id ?? "contact"}`}
                      onClick={() => openRow(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRow(row);
                        }
                      }}
                      className="cursor-pointer transition-colors duration-150 hover:bg-brand-50/50 focus-visible:bg-brand-50 focus-visible:outline-none"
                    >
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold text-brand-700">
                            {initials(contact?.name, "#")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{contact?.name ?? "Unnamed"}</p>
                            {contact?.wa_id && (
                              <p className="font-mono text-xs text-muted-foreground">+{contact.wa_id}</p>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD className="font-medium">{flow?.name ?? "—"}</TD>
                      {columns.map((key) => (
                        <TD key={key} className="max-w-[14rem] truncate text-sm">
                          {display(row.data?.[key])}
                        </TD>
                      ))}
                      <TD className="whitespace-nowrap text-xs">
                        <p className="font-medium">{timeAgo(row.submitted_at)}</p>
                        <p className="text-muted-foreground">{formatDateTime(row.submitted_at)}</p>
                      </TD>
                      <TD>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </TD>
                    </motion.tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </FadeIn>

      <Modal
        open={drawerOpen && Boolean(selected)}
        onClose={() => setDrawerOpen(false)}
        side="right"
        title={selectedContact?.name ?? (selectedContact?.wa_id ? `+${selectedContact.wa_id}` : "Submission")}
        description={
          <>
            {selectedFlow?.name ?? "Flow"} · {selected ? formatDateTime(selected.submitted_at) : ""}
          </>
        }
        icon={<ListChecks size={18} />}
      >
        {selected && (
          <div className="space-y-5">
            {selectedContact?.wa_id && (
              <div className="rounded-xl bg-brand-50/60 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                <p className="mt-1 font-medium">{selectedContact.name ?? "Unnamed"}</p>
                <p className="font-mono text-xs text-muted-foreground">+{selectedContact.wa_id}</p>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Answers
              </p>
              {Object.keys(selected.data ?? {}).length === 0 ? (
                <p className="text-sm text-muted-foreground">This submission has no answers.</p>
              ) : (
                <dl className="divide-y divide-border/70 overflow-hidden rounded-xl border">
                  {Object.entries(selected.data ?? {}).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                      <dt className="font-mono text-xs font-medium text-brand-700">{key}</dt>
                      <dd className="whitespace-pre-wrap break-words text-sm">{display(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
