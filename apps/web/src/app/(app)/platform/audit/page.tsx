"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, FadeIn, SegmentedTabs, motion, ease } from "@/components/motion";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Avatar, MotionTR, SearchField, humanizeAction, relation, timeAgo } from "../_components/ui";

interface AuditRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  users: unknown;
}

type Category = "all" | "organization" | "subscription" | "plan" | "user" | "support_ticket";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "organization", label: "Organizations" },
  { value: "subscription", label: "Subscriptions" },
  { value: "plan", label: "Plans" },
  { value: "user", label: "Users" },
  { value: "support_ticket", label: "Support" },
];

const PAGE = 50;

/** Destructive actions are highlighted so they stand out when scanning. */
function toneForAction(action: string) {
  if (action.includes("suspended") || action.includes("revoked") || action.includes("deleted") || action.includes("cancelled"))
    return "danger";
  if (action.includes("granted") || action.includes("restored") || action.includes("created") || action.includes("assigned"))
    return "success";
  if (action.includes("wallet")) return "brand";
  return statusTone(action) === "neutral" ? "info" : statusTone(action);
}

export default function PlatformAuditPage() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const logs = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: () => api.get<{ data: AuditRow[] }>("/platform/audit-logs"),
  });

  const all = logs.data?.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      if (category !== "all" && !row.action.startsWith(`${category}.`)) return false;
      if (!term) return true;
      const actor = relation<{ name: string | null; email: string }>(row.users);
      return [row.action, row.target_type, row.target_id, actor?.name, actor?.email, JSON.stringify(row.metadata ?? {})]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [all, category, search]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      <PageHeader
        title="Platform Audit"
        description="Every action taken by platform administrators across all tenants — the latest 200 entries."
        onRefresh={() => void logs.refetch()}
        refreshing={logs.isFetching}
      />

      <FadeIn>
        <Card className="overflow-hidden">
          <div className="space-y-3 border-b p-4">
            <SearchField
              label="Search audit log"
              placeholder="Search by action, administrator, target or details…"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setVisible(PAGE);
              }}
              className="sm:max-w-lg"
            />
            <div className="scrollbar-none overflow-x-auto">
              <SegmentedTabs<Category>
                layoutId="audit-category"
                value={category}
                onChange={(value) => {
                  setCategory(value);
                  setVisible(PAGE);
                }}
                tabs={CATEGORIES}
              />
            </div>
          </div>

          {logs.isError ? (
            <div className="p-4">
              <ErrorState
                message="Could not load the audit log. This area is restricted to platform administrators."
                onRetry={() => void logs.refetch()}
              />
            </div>
          ) : logs.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={all.length === 0 ? "No platform actions yet" : "Nothing matches"}
              description={
                all.length === 0
                  ? "Suspensions, wallet adjustments, plan changes and admin grants are recorded here."
                  : "Try a different search or category."
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Administrator</TH>
                    <TH>Action</TH>
                    <TH>Target</TH>
                    <TH className="w-10">
                      <span className="sr-only">Details</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {shown.map((row, index) => {
                    const actor = relation<{ name: string | null; email: string }>(row.users);
                    const hasMeta = Object.keys(row.metadata ?? {}).length > 0;
                    const open = expanded === row.id;
                    return (
                      <Fragment key={row.id}>
                        <MotionTR
                          index={index}
                          className={cn(hasMeta && "cursor-pointer", open && "bg-brand-50/50")}
                          onClick={hasMeta ? () => setExpanded(open ? null : row.id) : undefined}
                        >
                          <TD className="whitespace-nowrap">
                            <p className="text-sm font-medium">{timeAgo(row.created_at)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={actor?.name ?? actor?.email ?? "System"} size="sm" />
                              <div className="min-w-0">
                                <p className="max-w-[180px] truncate font-medium">{actor?.name ?? "System"}</p>
                                <p className="max-w-[180px] truncate text-xs text-muted-foreground">{actor?.email}</p>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <Badge tone={toneForAction(row.action)} title={row.action}>
                              {humanizeAction(row.action)}
                            </Badge>
                          </TD>
                          <TD className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                            {row.target_type ? `${row.target_type}:${row.target_id?.slice(0, 8) ?? ""}` : "—"}
                          </TD>
                          <TD>
                            {hasMeta && (
                              <button
                                type="button"
                                aria-label={open ? "Hide details" : "Show details"}
                                aria-expanded={open}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpanded(open ? null : row.id);
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary"
                              >
                                <ChevronDown size={16} className={cn("transition-transform duration-300", open && "rotate-180")} />
                              </button>
                            )}
                          </TD>
                        </MotionTR>
                        <AnimatePresence initial={false}>
                          {open && (
                            <tr>
                              <td colSpan={5} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 gap-3 bg-brand-50/40 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(row.metadata ?? {}).map(([key, value]) => (
                                      <div key={key} className="min-w-0 rounded-xl border bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          {key}
                                        </p>
                                        <p className="break-words font-mono text-xs">
                                          {value === null || value === undefined
                                            ? "—"
                                            : typeof value === "object"
                                              ? JSON.stringify(value)
                                              : String(value)}
                                        </p>
                                      </div>
                                    ))}
                                    {row.target_id && (
                                      <div className="min-w-0 rounded-xl border bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Target ID
                                        </p>
                                        <p className="break-all font-mono text-xs">{row.target_id}</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </TBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                <p className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{shown.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{filtered.length}</span> entries
                </p>
                {shown.length < filtered.length && (
                  <Button size="sm" variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
                    Show more
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </FadeIn>
    </>
  );
}
