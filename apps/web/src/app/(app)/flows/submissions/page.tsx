"use client";

import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { relation } from "@/components/data/ledger-table";
import { api } from "@/lib/api-client";

interface SubmissionRow {
  id: string;
  data: Record<string, unknown>;
  submitted_at: string;
  flows: unknown;
  contacts: unknown;
}

export default function FlowSubmissionsPage() {
  const submissions = useQuery({
    queryKey: ["flow-submissions"],
    queryFn: () => api.get<{ data: SubmissionRow[] }>("/flows/submissions"),
  });

  const rows = submissions.data?.data ?? [];

  const exportCsv = () => {
    // Union of every submission's keys, so sparse answers still line up.
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row.data)))];
    const header = ["Submitted at", "Flow", "Contact", ...keys];

    const lines = rows.map((row) => {
      const flow = relation<{ name: string }>(row.flows);
      const contact = relation<{ wa_id: string; name: string | null }>(row.contacts);
      return [
        new Date(row.submitted_at).toISOString(),
        flow?.name ?? "",
        contact?.name ?? contact?.wa_id ?? "",
        ...keys.map((key) => String(row.data[key] ?? "")),
      ]
        .map((field) => `"${field.replace(/"/g, '""')}"`)
        .join(",");
    });

    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flow-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row.data)))].slice(0, 6);

  return (
    <>
      <PageHeader
        title="Flow Submissions"
        description="Answers customers gave inside your flows."
        onRefresh={() => void submissions.refetch()}
        refreshing={submissions.isFetching}
        actions={
          rows.length > 0 ? (
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Export CSV
            </button>
          ) : null
        }
      />

      <Card>
        {submissions.isError ? (
          <ErrorState
            message="Could not load submissions."
            onRetry={() => void submissions.refetch()}
          />
        ) : submissions.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No submissions yet"
            description="When a contact completes a flow, their answers land here."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Submitted</TH>
                <TH>Flow</TH>
                <TH>Contact</TH>
                {columns.map((key) => (
                  <TH key={key}>{key}</TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => {
                const flow = relation<{ name: string }>(row.flows);
                const contact = relation<{ wa_id: string; name: string | null }>(row.contacts);
                return (
                  <TR key={row.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(row.submitted_at).toLocaleString()}
                    </TD>
                    <TD className="font-medium">{flow?.name ?? "—"}</TD>
                    <TD>
                      <p>{contact?.name ?? "Unnamed"}</p>
                      <p className="font-mono text-xs text-muted-foreground">+{contact?.wa_id}</p>
                    </TD>
                    {columns.map((key) => (
                      <TD key={key} className="text-sm">
                        {String(row.data[key] ?? "—")}
                      </TD>
                    ))}
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
