"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { initials } from "@/lib/utils";

interface Agent {
  id: string;
  role: string;
  isOnline: boolean;
  lastActiveAt: string | null;
  user: { id: string; name: string | null; email: string } | null;
  openConversations: number;
}

export default function AgentsLoginPage() {
  const queryClient = useQueryClient();

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get<{ data: Agent[] }>("/admin/agents"),
  });

  const setPresence = useMutation({
    mutationFn: (isOnline: boolean) => api.post("/admin/presence", { isOnline }),
    onSuccess: (_, isOnline) => {
      toast.success(isOnline ? "You are now online" : "You are now offline");
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update presence"),
  });

  const rows = agents.data?.data ?? [];
  const online = rows.filter((agent) => agent.isOnline).length;

  return (
    <>
      <PageHeader
        title="Agents Login"
        description="Who is available to take conversations, and how many each is handling."
        onRefresh={() => void agents.refetch()}
        refreshing={agents.isFetching}
        actions={
          <>
            <Button variant="outline" onClick={() => setPresence.mutate(true)}>
              Go online
            </Button>
            <Button variant="outline" onClick={() => setPresence.mutate(false)}>
              Go offline
            </Button>
          </>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-6 p-5">
        <Stat label="Agents" value={String(rows.length)} />
        <Stat label="Online now" value={String(online)} />
        <Stat
          label="Open conversations"
          value={String(rows.reduce((sum, a) => sum + a.openConversations, 0))}
        />
      </Card>

      <Card>
        {agents.isError ? (
          <ErrorState message="Could not load agents." onRetry={() => void agents.refetch()} />
        ) : agents.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No agents yet"
            description="Invite teammates with the Agent or Manager role to staff your inbox."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Agent</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Open conversations</TH>
                <TH>Last active</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((agent) => (
                <TR key={agent.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(agent.user?.name ?? agent.user?.email)}
                      </span>
                      <div>
                        <p className="font-medium">{agent.user?.name ?? "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{agent.user?.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="capitalize">{agent.role}</TD>
                  <TD>
                    <Badge tone={agent.isOnline ? "success" : "neutral"}>
                      {agent.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </TD>
                  <TD className="font-medium">{agent.openConversations}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">
                    {agent.lastActiveAt ? new Date(agent.lastActiveAt).toLocaleString() : "—"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
