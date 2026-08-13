"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { relation } from "@/components/data/ledger-table";
import { api } from "@/lib/api-client";

interface ExecutionRow {
  id: string;
  current_node: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  chatbots: unknown;
  contacts: unknown;
}

export default function ChatbotHistoryPage() {
  const executions = useQuery({
    queryKey: ["chatbot-history"],
    queryFn: () => api.get<{ data: ExecutionRow[] }>("/chatbots/history"),
  });

  const rows = executions.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Chatbot History"
        description="Every chatbot run, showing where each conversation reached in the flow."
        onRefresh={() => void executions.refetch()}
        refreshing={executions.isFetching}
      />

      <Card>
        {executions.isError ? (
          <ErrorState
            message="Could not load chatbot history."
            onRetry={() => void executions.refetch()}
          />
        ) : executions.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No chatbot runs yet"
            description="Once an active chatbot is triggered, each run is logged here."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Chatbot</TH>
                <TH>Contact</TH>
                <TH>Current step</TH>
                <TH>Status</TH>
                <TH>Started</TH>
                <TH>Ended</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => {
                const chatbot = relation<{ name: string }>(row.chatbots);
                const contact = relation<{ wa_id: string; name: string | null }>(row.contacts);
                return (
                  <TR key={row.id}>
                    <TD className="font-medium">{chatbot?.name ?? "—"}</TD>
                    <TD>
                      <p>{contact?.name ?? "Unnamed"}</p>
                      <p className="font-mono text-xs text-muted-foreground">+{contact?.wa_id}</p>
                    </TD>
                    <TD className="font-mono text-xs">{row.current_node ?? "—"}</TD>
                    <TD>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(row.started_at).toLocaleString()}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.ended_at ? new Date(row.ended_at).toLocaleString() : "—"}
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
