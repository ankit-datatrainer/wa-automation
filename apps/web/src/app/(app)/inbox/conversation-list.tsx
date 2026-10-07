"use client";

import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import {
  AlertCircle,
  Inbox,
  MailOpen,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { ease } from "@/components/motion";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./inbox-ui";

export interface ConversationSummary {
  id: string;
  status: string;
  assigned_to?: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  session_expires_at: string | null;
  contacts:
    | { id: string; wa_id: string; name: string | null; attributes?: Record<string, unknown> }
    | { id: string; wa_id: string; name: string | null; attributes?: Record<string, unknown> }[]
    | null;
}

export type InboxFilter = "all" | "unread" | "active";

const FILTERS: { value: InboxFilter; label: string; icon: typeof Inbox }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "unread", label: "Unread", icon: MailOpen },
  { value: "active", label: "Active", icon: Zap },
];

/** Rows beyond this index render without an entrance animation. */
const ANIMATED_ROWS = 20;

export function ConversationList({
  conversations,
  loading,
  fetching,
  selectedId,
  filter,
  search,
  onSelect,
  onFilterChange,
  onSearchChange,
  onNewConversation,
  error,
  onRetry,
  className,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  fetching?: boolean;
  /** Load failure with nothing cached to show; rendered in place of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  selectedId: string | null;
  filter: InboxFilter;
  search: string;
  onSelect: (id: string) => void;
  onFilterChange: (filter: InboxFilter) => void;
  onSearchChange: (search: string) => void;
  onNewConversation: () => void;
  className?: string;
}) {
  const groups = groupByDay(conversations);
  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  let rowIndex = 0;

  return (
    <section
      aria-label="Conversations"
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col border-r border-border/70 bg-white md:w-[320px] lg:w-[340px] 2xl:w-[360px]",
        className,
      )}
    >
      {/* Header */}
      <div className="space-y-3.5 border-b border-border/70 p-4">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <MessageCircle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-semibold leading-tight tracking-tight">Inbox</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
              </span>
              {unreadTotal > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-semibold text-primary tabular-nums">{unreadTotal} unread</span>
                </>
              )}
              {fetching && !loading && (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                />
              )}
            </p>
          </div>
          <Button
            size="icon"
            aria-label="New conversation"
            title="New conversation"
            onClick={onNewConversation}
            className="h-10 w-10 rounded-xl"
          >
            <Plus size={19} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            aria-label="Search conversations by name or number"
            placeholder="Search name or number…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-border/80 bg-muted/50 pl-10 pr-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/80 hover:border-brand-200 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-brand-50 hover:text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter tabs with a sliding indicator */}
        <div role="tablist" aria-label="Filter conversations" className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
          {FILTERS.map(({ value, label, icon: Icon }) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFilterChange(value)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active ? "text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="inbox-filter-indicator"
                    className="absolute inset-0 rounded-lg bg-brand-gradient shadow-[0_4px_14px_-4px_rgba(131,58,180,0.6)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={13} className="relative z-10" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation stream */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="space-y-1 p-3" aria-busy="true" aria-label="Loading conversations">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3 rounded-md" />
                  <Skeleton className="h-2.5 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error && conversations.length === 0 ? (
          <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-destructive ring-1 ring-rose-100">
              <AlertCircle size={22} />
            </span>
            <p className="mt-4 font-display text-base font-semibold">Couldn&apos;t load conversations</p>
            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
                <RotateCcw size={14} /> Try again
              </Button>
            )}
          </div>
        ) : conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="flex flex-col items-center px-6 py-14 text-center"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-primary ring-1 ring-brand-100">
              {search ? <Search size={22} /> : <Inbox size={22} />}
            </span>
            <p className="mt-4 font-display text-base font-semibold">
              {search ? "No matches" : filter === "all" ? "No conversations yet" : `No ${filter} conversations`}
            </p>
            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
              {search
                ? `Nothing matches “${search}”. Try another name or number.`
                : filter === "all"
                  ? "Messages from your customers will appear here."
                  : "Switch filters or start a new conversation."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {(search || filter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSearchChange("");
                    onFilterChange("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
              <Button size="sm" onClick={onNewConversation}>
                <Plus size={15} /> New chat
              </Button>
            </div>
          </motion.div>
        ) : (
          groups.map(([label, items]) => (
            <section key={label} aria-label={label} className="pb-1">
              <h2 className="sticky top-0 z-10 bg-white/90 px-5 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80 backdrop-blur">
                {label}
              </h2>
              <ul className="space-y-0.5 px-2">
                {items.map((conversation) => {
                  const index = rowIndex++;
                  return (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      active={conversation.id === selectedId}
                      index={index}
                      onSelect={onSelect}
                    />
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

function ConversationRow({
  conversation,
  active,
  index,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  const contact = toOne(conversation.contacts);
  const nameDisplay = contact?.name || (contact?.wa_id ? `+${contact.wa_id}` : "Unknown contact");
  const unread = conversation.unread_count > 0;
  const windowOpen =
    !!conversation.session_expires_at &&
    new Date(conversation.session_expires_at).getTime() > Date.now();
  const animate = index < ANIMATED_ROWS;

  return (
    <motion.li
      initial={animate ? { opacity: 0, x: -10 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease, delay: animate ? index * 0.025 : 0 }}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          active ? "text-foreground" : "hover:bg-brand-50/50",
        )}
      >
        {active && (
          <motion.span
            layoutId="inbox-selected-row"
            aria-hidden
            className="absolute inset-0 rounded-2xl border border-brand-200/80 bg-gradient-to-r from-brand-50 via-brand-50/70 to-white shadow-[0_6px_18px_-10px_rgba(131,58,180,0.45)]"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-brand-gradient" />
          </motion.span>
        )}

        <ContactAvatar
          name={contact?.name}
          waId={contact?.wa_id}
          seed={contact?.id}
          online={windowOpen}
          className="relative"
        />

        <div className="relative min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("truncate text-sm", unread ? "font-bold" : "font-semibold")}>{nameDisplay}</p>
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums",
                unread ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {conversation.last_message_at ? formatStamp(new Date(conversation.last_message_at)) : ""}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-xs",
                unread ? "font-medium text-foreground/80" : "text-muted-foreground",
              )}
            >
              {conversation.last_message_preview ?? "No messages yet"}
            </p>
            {unread ? (
              <motion.span
                key={conversation.unread_count}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-gradient px-1.5 text-[10px] font-bold text-white shadow-[0_3px_10px_-3px_rgba(193,53,132,0.7)]"
                aria-label={`${conversation.unread_count} unread`}
              >
                {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
              </motion.span>
            ) : conversation.status && conversation.status !== "open" ? (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                {conversation.status === "closed" ? "Resolved" : conversation.status}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </motion.li>
  );
}

export function toOne(
  relation: ConversationSummary["contacts"],
): { id: string; wa_id: string; name: string | null; attributes?: Record<string, unknown> } | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

/** Day headings: Today, Yesterday, weekday names this week, then dates. */
function groupByDay(conversations: ConversationSummary[]) {
  const groups = new Map<string, ConversationSummary[]>();

  for (const conversation of conversations) {
    const date = conversation.last_message_at ? new Date(conversation.last_message_at) : null;
    const label = !date
      ? "Earlier"
      : isToday(date)
        ? "Today"
        : isYesterday(date)
          ? "Yesterday"
          : isThisWeek(date)
            ? format(date, "EEEE")
            : format(date, "MMMM d");

    const existing = groups.get(label);
    if (existing) existing.push(conversation);
    else groups.set(label, [conversation]);
  }

  return [...groups.entries()];
}

function formatStamp(date: Date) {
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEE");
  return format(date, "MMM d");
}
