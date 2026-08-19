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
import { ContactDetailsPanel } from "./contact-details-panel";
import { NewConversationModal } from "./inbox-modals";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newConvoOpen, setNewConvoOpen] = useState(false);

  const conversations = useQuery({
    queryKey: ["conversations", { filter, search }],
    queryFn: () =>
      api.get<{ data: ConversationSummary[] }>("/conversations", { filter, search }),
  });

  const rows = conversations.data?.data ?? [];

  // Auto-select first conversation if not yet selected
  useEffect(() => {
    if (!selectedId && rows.length > 0) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

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

  const selected = rows.find((c) => c.id === selectedId) ?? (rows.length > 0 ? rows[0] : null);
  const contact = selected ? toOne(selected.contacts) : null;
  const unreadTotal = rows.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col">
      <Card className="flex flex-1 min-h-0 overflow-hidden p-0 border rounded-2xl shadow-sm bg-card">
        {/* Column 1: Conversations List */}
        <ConversationList
          conversations={rows}
          loading={conversations.isLoading}
          selectedId={selected?.id ?? null}
          filter={filter}
          search={search}
          onSelect={setSelectedId}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onNewConversation={() => setNewConvoOpen(true)}
        />

        {/* Column 2 & 3: Chat Thread + Contact Details CRM Panel */}
        {selected && contact ? (
          <div className="flex flex-1 min-w-0">
            {/* Column 2: Chat Pane */}
            <ChatPane
              key={selected.id}
              conversationId={selected.id}
              contactId={contact.id}
              contactName={contact.name}
              contactWaId={contact.wa_id}
            />

            {/* Column 3: Contact Details Sidebar */}
            <ContactDetailsPanel
              key={`details-${contact.id}`}
              conversationId={selected.id}
              contactId={contact.id}
              contactName={contact.name}
              contactWaId={contact.wa_id}
              assignedTo={selected.assigned_to ?? null}
              assigneeName={null}
            />
          </div>
        ) : (
          <div className="grid flex-1 place-items-center bg-muted/10">
            <div className="space-y-4 text-center max-w-sm p-6">
              <EmptyState
                icon={MessageSquare}
                title="Welcome to Your Inbox"
                description="Select a conversation to start messaging, or create a new conversation to connect with your contacts."
              />
              {unreadTotal > 0 && (
                <p className="mx-auto w-fit rounded-xl border border-primary/30 bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                  You have {unreadTotal} unread {unreadTotal === 1 ? "message" : "messages"}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={newConvoOpen}
        onClose={() => setNewConvoOpen(false)}
        onSelectConversation={(id) => {
          setSelectedId(id);
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }}
      />
    </div>
  );
}
