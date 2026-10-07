"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Plus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { ease } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ConversationList,
  toOne,
  type ConversationSummary,
  type InboxFilter,
} from "./conversation-list";
import { ChatPane } from "./chat-pane";
import { ContactDetailsPanel } from "./contact-details-panel";
import { NewConversationModal } from "./inbox-modals";
import { useDebouncedValue, useMediaQuery } from "./inbox-ui";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  // Mobile (< md) shows one pane at a time: the list, or the open chat.
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  // xl+ shows the details panel inline (toggleable); smaller screens use a drawer.
  const isXl = useMediaQuery("(min-width: 1280px)");
  const [detailsPinned, setDetailsPinned] = useState(true);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);

  const conversations = useQuery({
    queryKey: ["conversations", { filter, search: debouncedSearch }],
    queryFn: () =>
      api.get<{ data: ConversationSummary[] }>("/conversations", {
        filter,
        search: debouncedSearch,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = conversations.data?.data ?? [];

  // Deep links from the dashboard / contacts: ?conversation=<id> or ?contact=<wa_id>.
  const deepLinkHandled = useRef(false);

  // Auto-select the deep-linked conversation, else the first one, so desktop
  // never opens on an empty pane.
  useEffect(() => {
    if (selectedId || rows.length === 0) return;
    if (!deepLinkHandled.current) {
      deepLinkHandled.current = true;
      const params = new URLSearchParams(window.location.search);
      const conversationId = params.get("conversation");
      const waId = params.get("contact");
      const match = rows.find(
        (c) => (conversationId && c.id === conversationId) || (waId && toOne(c.contacts)?.wa_id === waId),
      );
      if (match) {
        setSelectedId(match.id);
        setMobileView("chat");
        return;
      }
    }
    setSelectedId(rows[0]!.id);
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

  // Keep the open conversation stable when it drops out of the filtered list
  // (e.g. opening a chat under "Unread" marks it read and removes it). Falling
  // back to rows[0] here would open — and mark read — the next unread chat,
  // cascading through the whole unread queue.
  const lastSelectedRef = useRef<ConversationSummary | null>(null);
  const fromRows = selectedId ? rows.find((c) => c.id === selectedId) : undefined;
  if (fromRows) lastSelectedRef.current = fromRows;
  const selected: ConversationSummary | null = selectedId
    ? (fromRows ?? (lastSelectedRef.current?.id === selectedId ? lastSelectedRef.current : null))
    : (rows[0] ?? null);
  const contact = selected ? toOne(selected.contacts) : null;
  const unreadTotal = rows.reduce((sum, c) => sum + c.unread_count, 0);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  }, []);

  const detailsOpen = isXl ? detailsPinned : detailsDrawerOpen;
  const toggleDetails = () => {
    if (isXl) setDetailsPinned((v) => !v);
    else setDetailsDrawerOpen((v) => !v);
  };

  // Close the drawer if the viewport grows into the inline layout.
  useEffect(() => {
    if (isXl) setDetailsDrawerOpen(false);
  }, [isXl]);

  useEffect(() => {
    if (!detailsDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Let an open dialog inside the drawer handle Escape first.
      if (e.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"][aria-labelledby]')) {
        setDetailsDrawerOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailsDrawerOpen]);

  const detailsPanel = selected && contact && (
    <ContactDetailsPanel
      key={`details-${contact.id}`}
      conversationId={selected.id}
      contactId={contact.id}
      contactName={contact.name}
      contactWaId={contact.wa_id}
      assignedTo={selected.assigned_to ?? null}
      sessionOpen={
        !!selected.session_expires_at &&
        new Date(selected.session_expires_at).getTime() > Date.now()
      }
      onClose={isXl ? () => setDetailsPinned(false) : () => setDetailsDrawerOpen(false)}
    />
  );

  return (
    <div className="flex h-[calc(100vh-72px-2rem)] min-h-[520px] flex-col sm:h-[calc(100vh-72px-3rem)] lg:h-[calc(100vh-72px-4rem)]">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="relative flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-border/80 bg-white shadow-lift"
      >
        {/* Column 1: conversation list */}
        <ConversationList
          className={cn(mobileView === "chat" && selected ? "hidden md:flex" : "flex")}
          conversations={rows}
          loading={conversations.isLoading}
          fetching={conversations.isFetching}
          error={
            conversations.isError && rows.length === 0
              ? conversations.error instanceof ApiClientError
                ? conversations.error.message
                : "Conversations could not be loaded."
              : null
          }
          onRetry={() => void conversations.refetch()}
          selectedId={selected?.id ?? null}
          filter={filter}
          search={search}
          onSelect={handleSelect}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onNewConversation={() => setNewConvoOpen(true)}
        />

        {/* Column 2 + 3: chat thread and contact details */}
        <div
          className={cn(
            "min-w-0 flex-1",
            mobileView === "list" || !selected ? "hidden md:flex" : "flex",
          )}
        >
          {conversations.isError && rows.length === 0 ? (
            <div className="grid flex-1 place-items-center p-6">
              <ErrorState
                message={
                  conversations.error instanceof ApiClientError
                    ? conversations.error.message
                    : "Conversations could not be loaded."
                }
                onRetry={() => void conversations.refetch()}
              />
            </div>
          ) : selected && contact ? (
            <>
              <ChatPane
                key={selected.id}
                conversationId={selected.id}
                contactId={contact.id}
                contactName={contact.name}
                contactWaId={contact.wa_id}
                status={selected.status}
                detailsOpen={detailsOpen}
                onToggleDetails={toggleDetails}
                onBack={() => setMobileView("list")}
              />

              {/* Inline details (xl+) */}
              {isXl && (
                <AnimatePresence initial={false}>
                  {detailsPinned && (
                    <motion.aside
                      key="details-inline"
                      aria-label="Contact details"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 320, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease }}
                      className="flex min-h-0 shrink-0 overflow-hidden border-l border-border/70"
                    >
                      <div className="flex w-80 min-w-80 flex-col">{detailsPanel}</div>
                    </motion.aside>
                  )}
                </AnimatePresence>
              )}
            </>
          ) : (
            <InboxWelcome
              loading={
                conversations.isLoading ||
                // A just-opened conversation is still on its way into the list.
                (!!selectedId && !selected && conversations.isFetching)
              }
              unreadTotal={unreadTotal}
              onNew={() => setNewConvoOpen(true)}
            />
          )}
        </div>
      </motion.div>

      {/* Details drawer (< xl) */}
      <AnimatePresence>
        {!isXl && detailsDrawerOpen && selected && contact && (
          <motion.div
            key="details-drawer"
            className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-brand-900/25 backdrop-blur-sm"
              onClick={() => setDetailsDrawerOpen(false)}
            />
            <motion.aside
              aria-label="Contact details"
              role="dialog"
              aria-modal="true"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="relative flex h-full w-full max-w-[360px] flex-col bg-white shadow-lift"
            >
              {detailsPanel}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <NewConversationModal
        isOpen={newConvoOpen}
        onClose={() => setNewConvoOpen(false)}
        onSelectConversation={(id) => {
          // Clear list filters so the opened conversation is guaranteed to be listed.
          setFilter("all");
          setSearch("");
          handleSelect(id);
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }}
      />
    </div>
  );
}

function InboxWelcome({
  loading,
  unreadTotal,
  onNew,
}: {
  loading: boolean;
  unreadTotal: number;
  onNew: () => void;
}) {
  return (
    <div className="relative grid flex-1 place-items-center overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-gradient opacity-[0.12] blur-3xl"
      />
      {loading ? (
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <span className="relative grid h-14 w-14 place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-brand-300/50" />
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <MessageCircle size={24} />
            </span>
          </span>
          Loading your inbox…
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="relative max-w-sm text-center"
        >
          <span className="mx-auto grid h-16 w-16 animate-float place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <MessageCircle size={28} />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Your <span className="text-gradient">team inbox</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a conversation to start replying, or reach out to a contact with an approved
            template.
          </p>
          {unreadTotal > 0 && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700">
              <Sparkles size={13} />
              {unreadTotal} unread {unreadTotal === 1 ? "message" : "messages"} waiting
            </p>
          )}
          <div className="mt-6">
            <Button onClick={onNew}>
              <Plus size={16} /> Start a conversation
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
