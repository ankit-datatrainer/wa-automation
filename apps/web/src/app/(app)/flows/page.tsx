"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Kanban, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface FlowRow {
  id: string;
  name: string;
  status: string;
  meta_flow_id: string | null;
  updated_at: string;
}

export default function ManageFlowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const flows = useQuery({
    queryKey: ["flows"],
    queryFn: () => api.get<{ data: FlowRow[] }>("/flows"),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/flows", {
        name: "Untitled flow",
        definition: { nodes: [], edges: [] },
      }),
    onSuccess: (flow) => router.push(`/flows/${flow.id}`),
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the flow"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/flows/${id}`),
    onSuccess: () => {
      toast.success("Flow deleted");
      void queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = flows.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Manage Flows"
        description="Conversation flows that power your chatbots — messages, questions, branches and handoffs."
        actions={
          <Button loading={create.isPending} onClick={() => create.mutate()}>
            <Plus size={16} />
            New flow
          </Button>
        }
      />

      <Card>
        {flows.isError ? (
          <ErrorState message="Could not load flows." onRetry={() => void flows.refetch()} />
        ) : flows.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Kanban}
            title="No flows yet"
            description="Build a flow from scratch, or clone one from the Chatbot Library."
            action={
              <Button loading={create.isPending} onClick={() => create.mutate()}>
                <Plus size={16} />
                Create your first flow
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Flow</TH>
                <TH>Status</TH>
                <TH>Last updated</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((flow) => (
                <TR key={flow.id}>
                  <TD>
                    <Link href={`/flows/${flow.id}`} className="font-medium hover:underline">
                      {flow.name}
                    </Link>
                  </TD>
                  <TD>
                    <Badge tone={statusTone(flow.status)}>{flow.status}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(flow.updated_at).toLocaleString()}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <Link href={`/flows/${flow.id}`}>
                        <Button size="sm" variant="outline">
                          <Pencil size={14} />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${flow.name}`}
                        onClick={() => remove.mutate(flow.id)}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
