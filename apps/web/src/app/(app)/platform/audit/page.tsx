"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { relation } from "@/components/data/ledger-table";
import { api } from "@/lib/api-client";

interface AuditRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  users: unknown;
}

/** Destructive actions are highlighted so they stand out when scanning. */
function toneForAction(action: string) {
  if (action.includes("suspended") || action.includes("revoked")) return "danger";
  if (action.includes("granted") || action.includes("restored")) return "success";
  return statusTone(action);
}

export default function PlatformAuditPage() {
  const logs = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: () => api.get<{ data: AuditRow[] }>("/platform/audit-logs"),
  });

  const rows = logs.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Platform Audit"
        description="Actions taken by platform administrators across all tenants."
        onRefresh={() => void logs.refetch()}
        refreshing={logs.isFetching}
      />

      <Card>
        {logs.isError ? (
          <ErrorState
            message="Could not load the audit log. This area is restricted to platform administrators."
            onRetry={() => void logs.refetch()}
          />
        ) : logs.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No platform actions yet"
            description="Suspensions, wallet adjustments and admin grants are recorded here."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Administrator</TH>
                <TH>Action</TH>
                <TH>Target</TH>
                <TH>Details</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => {
                const actor = relation<{ name: string | null; email: string }>(row.users);
                return (
                  <TR key={row.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </TD>
                    <TD>
                      <p className="font-medium">{actor?.name ?? "System"}</p>
                      <p className="text-xs text-muted-foreground">{actor?.email}</p>
                    </TD>
                    <TD>
                      <Badge tone={toneForAction(row.action)}>{row.action}</Badge>
                    </TD>
                    <TD className="font-mono text-xs">
                      {row.target_type ? `${row.target_type}:${row.target_id?.slice(0, 8)}…` : "—"}
                    </TD>
                    <TD className="max-w-sm">
                      <p className="truncate text-xs text-muted-foreground">
                        {Object.keys(row.metadata ?? {}).length > 0
                          ? JSON.stringify(row.metadata)
                          : "—"}
                      </p>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
