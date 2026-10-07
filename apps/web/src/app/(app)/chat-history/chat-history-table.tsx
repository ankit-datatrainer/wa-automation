"use client";

import { ArrowUpRight, MessageSquare, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LedgerTable, relation, type Column } from "@/components/data/ledger-table";
import { ContactAvatar, formatPhone, useDebounced } from "../contacts/ui";
import { sessionInfo } from "./format";

interface ChatRow {
  id: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  session_expires_at: string | null;
  contacts: unknown;
}

const columns: Column<ChatRow>[] = [
  {
    key: "contact",
    header: "Contact",
    render: (row) => {
      const contact = relation<{ wa_id: string; name: string | null }>(row.contacts);
      return (
        <Link
          href={`/chat-history?conversation=${encodeURIComponent(row.id)}`}
          className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ContactAvatar name={contact?.name} waId={contact?.wa_id} seed={row.id} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold transition-colors group-hover:text-primary">
              {contact?.name ?? "Unnamed"}
              <ArrowUpRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
            <p className="font-mono text-xs text-muted-foreground">{formatPhone(contact?.wa_id)}</p>
          </div>
        </Link>
      );
    },
  },
  {
    key: "preview",
    header: "Last message",
    render: (row) => (
      <p className="max-w-xs truncate text-sm text-muted-foreground">{row.last_message_preview ?? "—"}</p>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge tone={statusTone(row.status)} className="capitalize">
        {row.status}
      </Badge>
    ),
  },
  {
    key: "window",
    header: "Session",
    render: (row) => {
      const session = sessionInfo(row.session_expires_at);
      return (
        <Badge tone={session.open ? "success" : "neutral"} className="whitespace-nowrap">
          <span className={session.open ? "h-1.5 w-1.5 rounded-full bg-emerald-500" : "h-1.5 w-1.5 rounded-full bg-muted-foreground/50"} />
          {session.open ? "Open" : "Closed"}
        </Badge>
      );
    },
  },
  {
    key: "unread",
    header: "Unread",
    render: (row) =>
      row.unread_count > 0 ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-gradient px-1.5 text-xs font-bold text-white shadow-glow">
          {row.unread_count}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "last",
    header: "Last activity",
    render: (row) => (row.last_message_at ? new Date(row.last_message_at).toLocaleString() : "—"),
    className: "whitespace-nowrap text-xs text-muted-foreground",
  },
];

/** Paginated conversation ledger, used by Analytics → Chat History. */
export function ChatHistoryTable() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim(), 300);

  return (
    <div className="space-y-3">
      <div className="relative w-full max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search last messages"
          placeholder="Search message text…"
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
      {/* Keyed by the search so paging restarts at page 1 for each new query. */}
      <LedgerTable
        key={search}
        queryKey={["analytics", "chats"]}
        endpoint="/analytics/chats"
        columns={columns}
        extraParams={search ? { search } : undefined}
        emptyIcon={MessageSquare}
        emptyTitle={search ? "No matching conversations" : "No conversations yet"}
        emptyDescription={
          search
            ? "No conversation's last message contains that text."
            : "Conversations appear here as soon as a contact messages you or you start a chat."
        }
      />
    </div>
  );
}
