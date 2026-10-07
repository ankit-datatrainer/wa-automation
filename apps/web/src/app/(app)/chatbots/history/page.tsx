"use client";

import { Activity, CheckCircle2, Clock3, History, PlayCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FadeIn, motion, SegmentedTabs, Stagger, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { relation } from "@/components/data/ledger-table";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { initials } from "@/lib/utils";
import {
  formatDateTime,
  humanize,
  timeAgo,
  useChatbotHistory,
  type ExecutionRow,
} from "../_components/data";
import { StatTile } from "../_components/stat-tile";

type StatusFilter = "all" | "running" | "completed" | "other";

function duration(row: ExecutionRow) {
  if (!row.ended_at) return null;
  const ms = new Date(row.ended_at).getTime() - new Date(row.started_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

export default function ChatbotHistoryPage() {
  const executions = useChatbotHistory();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [bot, setBot] = useState("");
  const [search, setSearch] = useState("");

  const rows = executions.data?.data ?? [];

  const botNames = useMemo(
    () =>
      [...new Set(rows.map((r) => relation<{ name: string }>(r.chatbots)?.name).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = rows.filter((row) => {
    if (status === "running" && row.status !== "running") return false;
    if (status === "completed" && row.status !== "completed") return false;
    if (status === "other" && (row.status === "running" || row.status === "completed")) return false;
    const chatbot = relation<{ name: string }>(row.chatbots);
    if (bot && chatbot?.name !== bot) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    const contact = relation<{ wa_id: string; name: string | null }>(row.contacts);
    return (
      (contact?.name ?? "").toLowerCase().includes(needle) ||
      (contact?.wa_id ?? "").includes(needle.replace(/^\+/, "")) ||
      (chatbot?.name ?? "").toLowerCase().includes(needle)
    );
  });

  const running = rows.filter((r) => r.status === "running").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const other = rows.length - running - completed;

  return (
    <>
      <PageHeader
        title="Chatbot History"
        description="Every chatbot run, showing where each conversation reached in the flow."
        onRefresh={() => void executions.refetch()}
        refreshing={executions.isFetching}
      />

      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          icon={Activity}
          label="Runs"
          value={executions.data ? rows.length : undefined}
          hint="Latest 100"
        />
        <StatTile
          icon={PlayCircle}
          label="In progress"
          accent="pink"
          value={executions.data ? running : undefined}
          hint="Waiting on the customer"
        />
        <StatTile
          icon={CheckCircle2}
          label="Completed"
          accent="success"
          value={executions.data ? completed : undefined}
          hint="Reached the end of the flow"
        />
        <StatTile
          icon={Clock3}
          label="Completion rate"
          accent="violet"
          value={executions.data ? (rows.length ? Math.round((completed / rows.length) * 100) : 0) : undefined}
          format={(n) => `${Math.round(n)}%`}
          hint="Of runs shown here"
        />
      </Stagger>

      <FadeIn delay={0.1}>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
              <SegmentedTabs<StatusFilter>
                layoutId="history-status"
                value={status}
                onChange={setStatus}
                tabs={[
                  { value: "all", label: `All · ${rows.length}` },
                  { value: "running", label: `Running · ${running}` },
                  { value: "completed", label: `Completed · ${completed}` },
                  ...(other > 0 ? [{ value: "other" as const, label: `Other · ${other}` }] : []),
                ]}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                aria-label="Filter by chatbot"
                className="sm:w-52"
                value={bot}
                onChange={(e) => setBot(e.target.value)}
              >
                <option value="">All chatbots</option>
                {botNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <div className="relative sm:w-64">
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search runs"
                  placeholder="Contact name or number…"
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {executions.isError ? (
            <div className="p-4">
              <ErrorState
                message="Could not load chatbot history."
                onRetry={() => void executions.refetch()}
              />
            </div>
          ) : executions.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={History}
              title="No chatbot runs yet"
              description="Once an active chatbot is triggered, each run is logged here."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No runs match"
              description="Try another status, chatbot or search."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("all");
                    setBot("");
                    setSearch("");
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
                  <TH>Chatbot</TH>
                  <TH>Current step</TH>
                  <TH>Status</TH>
                  <TH>Started</TH>
                  <TH>Duration</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((row, index) => {
                  const chatbot = relation<{ name: string }>(row.chatbots);
                  const contact = relation<{ wa_id: string; name: string | null }>(row.contacts);
                  const animated = index < 20;
                  return (
                    <motion.tr
                      key={row.id}
                      initial={animated ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease, delay: animated ? index * 0.025 : 0 }}
                      className="transition-colors duration-150 hover:bg-brand-50/50"
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
                      <TD className="font-medium">{chatbot?.name ?? "—"}</TD>
                      <TD>
                        {row.current_node ? (
                          <code className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-foreground/80">
                            {row.current_node}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={statusTone(row.status)}>
                          {row.status === "running" && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                          )}
                          {humanize(row.status)}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        <p className="font-medium text-foreground">{timeAgo(row.started_at)}</p>
                        <p className="text-muted-foreground">{formatDateTime(row.started_at)}</p>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">
                        {duration(row) ?? (row.status === "running" ? "In progress" : "—")}
                      </TD>
                    </motion.tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </FadeIn>
    </>
  );
}
