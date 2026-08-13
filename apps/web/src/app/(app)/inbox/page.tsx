"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationList,
  toOne,
  type ConversationSummary,
  type InboxFilter,
} from "./conversation-list";
import { ChatPane } from "./chat-pane";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = useQuery({
    queryKey: ["conversations", { filter, search }],
    queryFn: () =>
      api.get<{ data: ConversationSummary[] }>("/conversations", { filter, search }),
  });

  // Live updates: any new message refreshes the list and the open thread.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["messages"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = conversations.data?.data ?? [];
  const selected = rows.find((c) => c.id === selectedId) ?? null;
  const contact = selected ? toOne(selected.contacts) : null;
  const unreadTotal = rows.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <Card className="flex h-[calc(100vh-8.5rem)] overflow-hidden p-0">
      <ConversationList
        conversations={rows}
        loading={conversations.isLoading}
        selectedId={selectedId}
        filter={filter}
        search={search}
        onSelect={setSelectedId}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onNewConversation={() => undefined}
      />

      {selected && contact ? (
        <ChatPane
          key={selected.id}
          conversationId={selected.id}
          contactName={contact.name}
          contactWaId={contact.wa_id}
        />
      ) : (
        <div className="grid flex-1 place-items-center">
          <div className="space-y-4 text-center">
            <EmptyState
              icon={MessageSquare}
              title="Welcome to Your Inbox"
              description="Select a conversation to start messaging, or create a new conversation to connect with your contacts."
            />
            {unreadTotal > 0 && (
              <p className="mx-auto w-fit rounded-xl border border-primary/30 bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                You have {unreadTotal} unread {unreadTotal === 1 ? "message" : "messages"}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
