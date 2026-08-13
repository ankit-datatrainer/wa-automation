"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pause, Play, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface CampaignRow {
  id: string;
  name: string;
  audience_type: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  stats: { total: number; sent: number; delivered: number; read: number; failed: number };
  templates: { name: string } | { name: string }[] | null;
}

interface CampaignsResponse {
  data: CampaignRow[];
  page: number;
  totalPages: number;
  total: number;
}

/** Shared by Campaigns, Campaign History and Scheduled Campaigns. */
export function CampaignTable({
  status,
  emptyTitle,
  emptyDescription,
}: {
  status?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const campaigns = useQuery({
    queryKey: ["campaigns", { page, status }],
    queryFn: () => api.get<CampaignsResponse>("/campaigns", { page, pageSize: 25, status }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["campaigns"] });

  const action = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: "send" | "pause" | "cancel" }) =>
      api.post(`/campaigns/${id}/${verb}`),
    onSuccess: () => {
      toast.success("Campaign updated");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Action failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success("Campaign deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = campaigns.data?.data ?? [];

  if (campaigns.isError) {
    return (
      <ErrorState message="Could not load campaigns." onRetry={() => void campaigns.refetch()} />
    );
  }

  return (
    <Card>
      {campaigns.isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Link href="/campaigns/new">
              <Button>Create a campaign</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Campaign</TH>
                <TH>Template</TH>
                <TH>Audience</TH>
                <TH>Status</TH>
                <TH>Progress</TH>
                <TH>When</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((campaign) => {
                const template = toOne(campaign.templates);
                const stats = campaign.stats ?? { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
                const pct = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

                return (
                  <TR key={campaign.id}>
                    <TD className="font-medium">{campaign.name}</TD>
                    <TD className="font-mono text-xs">{template?.name ?? "—"}</TD>
                    <TD className="capitalize">{campaign.audience_type}</TD>
                    <TD>
                      <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
                    </TD>
                    <TD className="min-w-40">
                      <div className="space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.sent}/{stats.total} sent
                          {stats.delivered > 0 && ` · ${stats.delivered} delivered`}
                          {stats.read > 0 && ` · ${stats.read} read`}
                          {stats.failed > 0 && ` · ${stats.failed} failed`}
                        </p>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {campaign.scheduled_at
                        ? new Date(campaign.scheduled_at).toLocaleString()
                        : new Date(campaign.created_at).toLocaleDateString()}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {(campaign.status === "draft" || campaign.status === "paused") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action.mutate({ id: campaign.id, verb: "send" })}
                          >
                            <Play size={14} />
                            Start
                          </Button>
                        )}
                        {campaign.status === "running" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action.mutate({ id: campaign.id, verb: "pause" })}
                          >
                            <Pause size={14} />
                            Pause
                          </Button>
                        )}
                        {["draft", "scheduled", "running", "paused"].includes(campaign.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Cancel campaign"
                            onClick={() => action.mutate({ id: campaign.id, verb: "cancel" })}
                          >
                            <XCircle size={14} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${campaign.name}`}
                          onClick={() => remove.mutate(campaign.id)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <Pagination
            page={campaigns.data!.page}
            totalPages={campaigns.data!.totalPages}
            total={campaigns.data!.total}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}

function toOne(relation: CampaignRow["templates"]): { name: string } | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}
