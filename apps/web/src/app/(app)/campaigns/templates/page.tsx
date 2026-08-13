"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { TemplateBuilder } from "./template-builder";

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  rejection_reason: string | null;
  components: { body: { text: string } };
  created_at: string;
}

interface TemplatesResponse {
  data: TemplateRow[];
  page: number;
  totalPages: number;
  total: number;
}

export default function YourTemplatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);

  const templates = useQuery({
    queryKey: ["templates", { page, status }],
    queryFn: () =>
      api.get<TemplatesResponse>("/templates", { page, pageSize: 25, status: status || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["templates"] });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/templates/${id}/submit`),
    onSuccess: () => {
      toast.success("Submitted to Meta for review");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Submission failed"),
  });

  const sync = useMutation({
    mutationFn: () => api.post<{ synced: number }>("/templates/sync"),
    onSuccess: (result) => {
      toast.success(`Synced ${result.synced} templates`);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Sync failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      toast.success("Template deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = templates.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Your Templates"
        description="Message templates and their approval status with Meta."
        actions={
          <>
            <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
              {!sync.isPending && <RefreshCw size={16} />}
              Sync with Meta
            </Button>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus size={16} />
              New template
            </Button>
          </>
        }
      />

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
            <option value="draft">Draft</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paused">Paused</option>
          </Select>
        </div>

        {templates.isError ? (
          <ErrorState message="Could not load templates." onRetry={() => void templates.refetch()} />
        ) : templates.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Templates are required to start conversations outside the 24-hour window."
            action={
              <Button onClick={() => setBuilderOpen(true)}>
                <Plus size={16} />
                Create your first template
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Preview</TH>
                  <TH>Category</TH>
                  <TH>Language</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((template) => (
                  <TR key={template.id}>
                    <TD className="font-mono text-xs font-medium">{template.name}</TD>
                    <TD className="max-w-sm">
                      <p className="truncate text-sm text-muted-foreground">
                        {template.components?.body?.text ?? "—"}
                      </p>
                    </TD>
                    <TD className="capitalize">{template.category}</TD>
                    <TD className="uppercase">{template.language}</TD>
                    <TD>
                      <div className="space-y-1">
                        <Badge tone={statusTone(template.status)}>{template.status}</Badge>
                        {template.rejection_reason && (
                          <p className="text-xs text-destructive">{template.rejection_reason}</p>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        {(template.status === "draft" || template.status === "rejected") && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={submit.isPending && submit.variables === template.id}
                            onClick={() => submit.mutate(template.id)}
                          >
                            <Send size={14} />
                            Submit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${template.name}`}
                          onClick={() => remove.mutate(template.id)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={templates.data!.page}
              totalPages={templates.data!.totalPages}
              total={templates.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <TemplateBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSaved={() => {
          setBuilderOpen(false);
          void invalidate();
        }}
      />
    </>
  );
}
