"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface CannedMessage {
  id: string;
  shortcode: string;
  body: string;
  created_at: string;
}

export default function CannedMessagesPage() {
  const queryClient = useQueryClient();
  const [shortcode, setShortcode] = useState("");
  const [body, setBody] = useState("");

  const canned = useQuery({
    queryKey: ["canned-messages"],
    queryFn: () => api.get<{ data: CannedMessage[] }>("/canned-messages"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["canned-messages"] });

  const create = useMutation({
    mutationFn: () =>
      api.post("/canned-messages", {
        shortcode: shortcode.trim().toLowerCase().replace(/\s+/g, "-"),
        body: body.trim(),
      }),
    onSuccess: () => {
      toast.success("Canned message saved");
      setShortcode("");
      setBody("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/canned-messages/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = canned.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Canned Message"
        description="Saved replies your agents can insert in the inbox by typing / followed by the shortcode."
      />

      <Card className="mb-4 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Shortcode</label>
            <Input
              required
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              placeholder="thanks"
            />
            <p className="text-xs text-muted-foreground">
              Agents type <code>/{shortcode || "shortcode"}</code> then space to insert it.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Thanks for reaching out! We'll get back to you shortly."
            />
          </div>

          <Button type="submit" loading={create.isPending}>
            <Plus size={16} />
            Save canned message
          </Button>
        </form>
      </Card>

      <Card>
        {canned.isError ? (
          <ErrorState message="Could not load canned messages." onRetry={() => void canned.refetch()} />
        ) : canned.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No canned messages yet"
            description="Save the replies your team sends most often to answer faster."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Shortcode</TH>
                <TH>Message</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((item) => (
                <TR key={item.id}>
                  <TD className="font-mono text-sm font-medium">/{item.shortcode}</TD>
                  <TD className="max-w-xl">
                    <p className="truncate text-sm text-muted-foreground">{item.body}</p>
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete /${item.shortcode}`}
                        onClick={() => remove.mutate(item.id)}
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
