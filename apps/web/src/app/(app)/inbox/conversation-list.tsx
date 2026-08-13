"use client";

import { isToday, isYesterday, format, isThisWeek } from "date-fns";
import { Filter, Plus, Search, Zap, MessageSquare, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { cn, initials } from "@/lib/utils";

export interface ConversationSummary {
  id: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  session_expires_at: string | null;
  contacts: { id: string; wa_id: string; name: string | null } | { id: string; wa_id: string; name: string | null }[] | null;
}

export type InboxFilter = "all" | "unread" | "active";

const FILTERS: { value: InboxFilter; label: string; icon: typeof MessageSquare }[] = [
  { value: "all", label: "All", icon: MessageSquare },
  { value: "unread", label: "Unread", icon: AlertCircle },
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
  const groups = groupByDay(conversations);

  return (
    <div className="flex w-full max-w-sm shrink-0 flex-col border-r">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <MessageSquare size={20} />
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Conversations</h2>
            <p className="text-xs text-muted-foreground">
              {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Filter conversations"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Filter size={18} />
          </button>
          <button
            type="button"
            aria-label="New conversation"
            onClick={onNewConversation}
            className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No conversations match this filter.
          </p>
        ) : (
          groups.map(([label, items]) => (
            <section key={label}>
              <h3 className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </h3>
              <ul>
                {items.map((conversation) => {
                  const contact = toOne(conversation.contacts);
                  const active = conversation.id === selectedId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          active ? "bg-accent" : "hover:bg-muted/60",
                        )}
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {initials(contact?.name, contact?.wa_id.slice(-2) ?? "?")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-semibold">
                              {contact?.name ?? `+${contact?.wa_id ?? "Unknown"}`}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {conversation.last_message_at
                                ? formatStamp(new Date(conversation.last_message_at))
                                : ""}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-muted-foreground">
                              {conversation.last_message_preview ?? "No messages yet"}
                            </span>
                            {conversation.unread_count > 0 && (
                              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                                {conversation.unread_count}
                              </span>
                            )}
                          </span>
                        </span>
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
): { id: string; wa_id: string; name: string | null } | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

/** Day headings: Today, Yesterday, weekday name, then a date. */
function groupByDay(conversations: ConversationSummary[]) {
  const groups = new Map<string, ConversationSummary[]>();

  for (const conversation of conversations) {
    const date = conversation.last_message_at
      ? new Date(conversation.last_message_at)
      : null;
    const label = !date
      ? "Earlier"
      : isToday(date)
        ? "Today"
        : isYesterday(date)
          ? "Yesterday"
          : isThisWeek(date)
            ? format(date, "EEEE")
            : format(date, "d MMM yyyy");

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
  return format(date, "dd/MM/yy");
}
