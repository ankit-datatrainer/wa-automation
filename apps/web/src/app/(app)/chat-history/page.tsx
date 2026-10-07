"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, FileText, Inbox, MessageCircle, MessagesSquare, Search, Timer, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatedNumber, AnimatePresence, ease, motion, SegmentedTabs, Stagger, StaggerItem } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ContactAvatar, formatPhone, isUuid, toOne, useDebounced } from "../contacts/ui";
import { dayLabel, listTime, sessionInfo } from "./format";
import { Transcript, type TranscriptContact } from "./transcript";

type Filter = "all" | "unread" | "active";

interface ConversationItem {
  id: string;
  status: string;
  assigned_to: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  session_expires_at: string | null;
  contacts: unknown;
}

const LIMIT = 100;

export default function ChatHistoryPage() {
  return (
    <Suspense fallback={null}>
      <ChatHistory />
    </Suspense>
  );
}

function ChatHistory() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("conversation");

  const [filter, setFilter] = useState<Filter>("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim(), 300);

  const list = useQuery({
    queryKey: ["conversations", { filter, search, limit: LIMIT }],
    queryFn: () =>
      api.get<{ data: ConversationItem[] }>("/conversations", {
        filter,
        search: search || undefined,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  // Unfiltered snapshot for the KPI tiles (shares cache with the "All" tab).
  const overview = useQuery({
    queryKey: ["conversations", { filter: "all", search: "", limit: LIMIT }],
    queryFn: () => api.get<{ data: ConversationItem[] }>("/conversations", { filter: "all", limit: LIMIT }),
    refetchInterval: 30_000,
  });

  // With no real conversations the API answers with sample ones (ids like
  // "conv1"); never show those as the account's own chats.
  const rows = useMemo(() => (list.data?.data ?? []).filter((c) => isUuid(c.id)), [list.data]);
  const allRows = useMemo(() => (overview.data?.data ?? []).filter((c) => isUuid(c.id)), [overview.data]);
  const stats = useMemo(
    () => ({
      total: allRows.length,
      unread: allRows.reduce((sum, c) => sum + (c.unread_count > 0 ? 1 : 0), 0),
      active: allRows.filter((c) => sessionInfo(c.session_expires_at).open).length,
    }),
    [allRows],
  );

  const grouped = useMemo(() => {
    const groups: { label: string; items: ConversationItem[] }[] = [];
    for (const c of rows) {
      const label = dayLabel(c.last_message_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(c);
      else groups.push({ label, items: [c] });
    }
    return groups;
  }, [rows]);

  const select = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("conversation", id);
    else params.delete("conversation");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // On wide screens open the most recent conversation by default.
  useEffect(() => {
    if (selectedId || rows.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      select(rows[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectedId]);

  const selected =
    rows.find((c) => c.id === selectedId) ?? allRows.find((c) => c.id === selectedId) ?? null;
  const selectedContact = selected ? toOne<TranscriptContact>(selected.contacts) : null;

  const tiles = [
    { label: "Conversations", value: stats.total, icon: MessagesSquare, tint: "from-brand-600 to-brand-magenta" },
    { label: "Unread", value: stats.unread, icon: MessageCircle, tint: "from-brand-pink to-brand-orange" },
    { label: "Open 24h windows", value: stats.active, icon: Timer, tint: "from-emerald-500 to-teal-500" },
  ];

  return (
    // Fills the viewport below the 72px topbar (minus <main>'s padding) so the
    // list and transcript scroll on their own and the page itself does not.
    <div className="flex h-[calc(100dvh-72px-2rem)] min-h-[680px] flex-col sm:h-[calc(100dvh-72px-3rem)] lg:h-[calc(100dvh-72px-4rem)]">
      <LoadingScreen isLoading={list.isLoading} minDurationMs={600} />

      <PageHeader
        title="Chat History"
        description="Every WhatsApp conversation with full transcripts — search, filter and reply while the 24-hour window is open."
        onRefresh={() => {
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
        }}
        refreshing={list.isFetching && !list.isLoading}
        actions={
          <Link href="/inbox" className={buttonVariants({ variant: "outline" })}>
            <Inbox size={16} />
            Open Inbox
          </Link>
        }
      />

      <Stagger className="mb-5 grid shrink-0 grid-cols-3 gap-2.5 sm:gap-4" stagger={0.07}>
        {tiles.map((tile) => (
          <StaggerItem key={tile.label} whileHover={{ y: -3 }}>
            <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-white p-3 shadow-soft transition-shadow hover:shadow-lift sm:p-4">
              <span
                className={cn(
                  "hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_20px_-8px_rgba(131,58,180,0.6)] sm:grid",
                  tile.tint,
                )}
              >
                <tile.icon size={19} />
              </span>
              <div className="min-w-0">
                <div className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {overview.isLoading ? <Skeleton className="h-7 w-10" /> : <AnimatedNumber value={tile.value} />}
                </div>
                <p className="truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">{tile.label}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: 0.1 }}
      >
        <Card className="flex min-h-[420px] flex-1 overflow-hidden">
          {/* Conversation list */}
          <aside
            className={cn(
              "flex w-full min-w-0 flex-col border-r border-border/70 bg-white md:w-[340px] md:shrink-0 lg:w-[380px]",
              selectedId ? "hidden md:flex" : "flex",
            )}
          >
            <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search conversations"
                  placeholder="Search name or number…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-10 pl-10 pr-9"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchInput("")}
                    className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-brand-50 hover:text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <SegmentedTabs<Filter>
                layoutId="chat-history-filter"
                value={filter}
                onChange={setFilter}
                className="grid w-full grid-cols-3"
                tabs={[
                  { value: "all", label: "All" },
                  {
                    value: "unread",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        Unread
                        {stats.unread > 0 && (
                          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-brand-gradient px-1 text-[10px] font-bold text-white">
                            {stats.unread}
                          </span>
                        )}
                      </span>
                    ),
                  },
                  { value: "active", label: "Active" },
                ]}
              />
            </div>

            <div
              className={cn(
                "scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2 transition-opacity",
                list.isPlaceholderData && "opacity-60",
              )}
            >
              {list.isError ? (
                <div className="p-2">
                  <ErrorState
                    message={list.error instanceof ApiClientError ? list.error.message : "Could not load conversations."}
                    onRetry={() => void list.refetch()}
                  />
                </div>
              ) : list.isLoading ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-primary">
                    <MessagesSquare size={22} />
                  </span>
                  <p className="mt-3 font-display text-base font-semibold">
                    {search || filter !== "all" ? "No conversations found" : "No conversations yet"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {search || filter !== "all"
                      ? "Try another search or filter."
                      : "Chats appear here when a contact messages you or you start one from Contacts."}
                  </p>
                  {!search && filter === "all" && (
                    <Link href="/contacts" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
                      Go to Contacts
                    </Link>
                  )}
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.label} className="pb-1">
                    <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {group.label}
                    </p>
                    {group.items.map((conv) => {
                      const contact = toOne<TranscriptContact>(conv.contacts);
                      const active = conv.id === selectedId;
                      const preview = conv.last_message_preview || "No messages yet";
                      const isTemplate = /template/i.test(preview);
                      const session = sessionInfo(conv.session_expires_at);
                      const flatIndex = rows.indexOf(conv);
                      return (
                        <motion.button
                          key={conv.id}
                          type="button"
                          onClick={() => select(conv.id)}
                          initial={flatIndex < 20 ? { opacity: 0, x: -8 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, ease, delay: flatIndex < 20 ? flatIndex * 0.025 : 0 }}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            active ? "text-foreground" : "hover:bg-brand-50/60",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="chat-history-active"
                              className="absolute inset-0 rounded-xl border border-brand-200 bg-brand-50"
                              transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            />
                          )}
                          <span className="relative">
                            <ContactAvatar name={contact?.name} waId={contact?.wa_id} seed={contact?.id ?? conv.id} />
                            {session.open && (
                              <span
                                title="24-hour window open"
                                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                              />
                            )}
                          </span>
                          <span className="relative min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate text-sm",
                                  conv.unread_count > 0 ? "font-bold" : "font-semibold",
                                )}
                              >
                                {contact?.name || formatPhone(contact?.wa_id)}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 text-[11px]",
                                  conv.unread_count > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                                )}
                              >
                                {listTime(conv.last_message_at)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5">
                              {isTemplate ? (
                                <FileText size={12} className="shrink-0 text-muted-foreground" />
                              ) : conv.unread_count === 0 && conv.last_message_preview ? (
                                <CheckCheck size={13} className="shrink-0 text-muted-foreground/70" />
                              ) : null}
                              <span
                                className={cn(
                                  "truncate text-xs",
                                  conv.unread_count > 0 ? "font-medium text-foreground/80" : "text-muted-foreground",
                                )}
                              >
                                {preview}
                              </span>
                              {conv.unread_count > 0 && (
                                <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-gradient px-1.5 text-[10px] font-bold text-white shadow-glow">
                                  {conv.unread_count}
                                </span>
                              )}
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            {rows.length >= LIMIT && (
              <p className="border-t border-border/70 px-4 py-2 text-center text-[11px] text-muted-foreground">
                Showing the {LIMIT} most recent conversations.
              </p>
            )}
          </aside>

          {/* Transcript */}
          <section className={cn("min-w-0 flex-1 bg-brand-50/20", selectedId ? "flex flex-col" : "hidden md:flex md:flex-col")}>
            <AnimatePresence mode="wait" initial={false}>
              {selectedId ? (
                <motion.div
                  key={selectedId}
                  className="flex h-full min-h-0 flex-col"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <Transcript
                    conversationId={selectedId}
                    contact={selectedContact}
                    unreadCount={selected?.unread_count ?? 0}
                    sessionExpiresAt={selected?.session_expires_at ?? null}
                    onBack={() => select(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="grid h-full place-items-center bg-aurora"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState
                    icon={MessagesSquare}
                    title="Pick a conversation"
                    description={
                      stats.unread > 0
                        ? `You have ${stats.unread} unread conversation${stats.unread === 1 ? "" : "s"}. Select one to read the full transcript.`
                        : "Select a conversation on the left to read its full transcript."
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </Card>
      </motion.div>
    </div>
  );
}
