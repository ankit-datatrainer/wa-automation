"use client";

import { isToday, isYesterday, format, isThisWeek } from "date-fns";
import { Filter, MessageSquare, Plus, Search, Zap } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { cn, initials } from "@/lib/utils";

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

const FILTERS: { value: InboxFilter; label: string; icon?: typeof MessageSquare }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread", icon: MessageSquare },
  { value: "active", label: "Active", icon: Zap },
];

export function ConversationList({
  conversations,
  loading,
  selectedId,
  filter,
  search,
  onSelect,
  onFilterChange,
  onSearchChange,
  onNewConversation,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  selectedId: string | null;
  filter: InboxFilter;
  search: string;
  onSelect: (id: string) => void;
  onFilterChange: (filter: InboxFilter) => void;
  onSearchChange: (search: string) => void;
  onNewConversation: () => void;
}) {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const groups = groupByDay(conversations);

  return (
    <div className="flex w-full max-w-[340px] lg:max-w-[360px] shrink-0 flex-col border-r bg-card">
      {/* Top Header */}
      <div className="space-y-3.5 border-b p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare size={20} className="text-[#00C268]" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Conversations</h2>
            <p className="text-xs text-muted-foreground">
              {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
            </p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              aria-label="Filter conversations"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
                filterMenuOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Filter size={16} />
            </button>

            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                <p className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase">
                  Filter By Status
                </p>
                {(["all", "unread", "active"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      onFilterChange(f);
                      setFilterMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize",
                      filter === f ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <span>{f}</span>
                    {filter === f && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="New conversation"
            onClick={onNewConversation}
            className="grid h-9 w-9 place-items-center rounded-lg bg-[#00C268] text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Search contacts bar */}
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search contacts..."
            className="h-10 pl-9 text-sm rounded-xl bg-muted/40 border-border/80 focus:bg-background"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                filter === value
                  ? "bg-[#00C268] text-white shadow-xs"
                  : "border border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {Icon && <Icon size={14} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations Stream */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">No conversations found</p>
            <p className="mt-1 text-xs">Try selecting another filter or start a new chat.</p>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <section key={label} className="py-1">
              <h3 className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {label}
              </h3>
              <ul className="space-y-0.5 px-2">
                {items.map((conversation) => {
                  const contact = toOne(conversation.contacts);
                  const active = conversation.id === selectedId;
                  const nameDisplay = contact?.name || (contact?.wa_id ? `+${contact.wa_id}` : "Unknown Contact");

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                          active
                            ? "bg-accent/80 dark:bg-muted/80 shadow-xs border border-border/50"
                            : "hover:bg-muted/50 text-foreground",
                        )}
                      >
                        {/* Avatar */}
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00C268]/15 text-sm font-bold text-[#00C268]">
                          {initials(contact?.name, contact?.wa_id.slice(-2) ?? "?")}
                        </span>

                        {/* Middle info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-1">
                            <p className="truncate text-sm font-bold text-foreground">
                              {nameDisplay}
                            </p>
                            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                              {conversation.last_message_at
                                ? formatStamp(new Date(conversation.last_message_at))
                                : ""}
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-muted-foreground">
                              {conversation.last_message_preview ?? "No messages yet"}
                            </p>
                            {conversation.unread_count > 0 && (
                              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#00C268] px-1.5 text-[10px] font-black text-white shadow-xs">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export function toOne(
  relation: ConversationSummary["contacts"],
): { id: string; wa_id: string; name: string | null; attributes?: Record<string, unknown> } | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

/** Day headings matching screenshot: YESTERDAY, AUGUST 9, AUGUST 7, AUGUST 6, TODAY */
function groupByDay(conversations: ConversationSummary[]) {
  const groups = new Map<string, ConversationSummary[]>();

  for (const conversation of conversations) {
    const date = conversation.last_message_at
      ? new Date(conversation.last_message_at)
      : null;
    const label = !date
      ? "EARLIER"
      : isToday(date)
        ? "TODAY"
        : isYesterday(date)
          ? "YESTERDAY"
          : isThisWeek(date)
            ? format(date, "EEEE").toUpperCase()
            : format(date, "MMMM d").toUpperCase();

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
