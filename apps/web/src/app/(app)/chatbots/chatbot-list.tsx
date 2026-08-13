"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: { keywords?: string[] };
  flow_id: string | null;
  is_active: boolean;
  created_at: string;
}

export function ChatbotList() {
  const queryClient = useQueryClient();

  const chatbots = useQuery({
    queryKey: ["chatbots"],
    queryFn: () => api.get<{ data: Chatbot[] }>("/chatbots"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["chatbots"] });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/chatbots/${id}`, { isActive }),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "Chatbot activated" : "Chatbot paused");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/chatbots/${id}`),
    onSuccess: () => {
      toast.success("Chatbot deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = chatbots.data?.data ?? [];

  if (chatbots.isError) {
    return <ErrorState message="Could not load chatbots." onRetry={() => void chatbots.refetch()} />;
  }

  return (
    <Card>
      {chatbots.isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No chatbots yet"
          description="Start from a prebuilt template in the Chatbot Library, or build a flow from scratch."
          action={
            <Link href="/chatbots/library">
              <Button>Browse the library</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Chatbot</TH>
              <TH>Trigger</TH>
              <TH>Keywords</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((chatbot) => (
              <TR key={chatbot.id}>
                <TD>
                  <p className="font-medium">{chatbot.name}</p>
                  {chatbot.description && (
                    <p className="max-w-md truncate text-xs text-muted-foreground">
                      {chatbot.description}
                    </p>
                  )}
                </TD>
                <TD className="capitalize">{chatbot.trigger_type.replace("_", " ")}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {chatbot.trigger_config?.keywords?.length ? (
                      chatbot.trigger_config.keywords.map((keyword) => (
                        <Badge key={keyword}>{keyword}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TD>
                <TD>
                  <Badge tone={chatbot.is_active ? "success" : "neutral"}>
                    {chatbot.is_active ? "Active" : "Paused"}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggle.mutate({ id: chatbot.id, isActive: !chatbot.is_active })
                      }
                    >
                      {chatbot.is_active ? "Pause" : "Activate"}
                    </Button>
                    {chatbot.flow_id && (
                      <Link href={`/flows/${chatbot.flow_id}`}>
                        <Button size="sm" variant="ghost" aria-label={`Edit ${chatbot.name} flow`}>
                          <Pencil size={14} />
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${chatbot.name}`}
                      onClick={() => remove.mutate(chatbot.id)}
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
  );
}
