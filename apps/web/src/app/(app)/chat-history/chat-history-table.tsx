"use client";

import { MessageSquare } from "lucide-react";
import { Badge, statusTone } from "@/components/ui/badge";
import { LedgerTable, relation, type Column } from "@/components/data/ledger-table";
import { initials } from "@/lib/utils";

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
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(contact?.name, contact?.wa_id.slice(-2) ?? "?")}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{contact?.name ?? "Unnamed"}</p>
            <p className="font-mono text-xs text-muted-foreground">+{contact?.wa_id}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "preview",
    header: "Last message",
    render: (row) => (
      <p className="max-w-sm truncate text-sm text-muted-foreground">
        {row.last_message_preview ?? "—"}
      </p>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
  },
  {
    key: "window",
    header: "Session",
    render: (row) => {
      const open = row.session_expires_at
        ? new Date(row.session_expires_at).getTime() > Date.now()
        : false;
      return (
        <Badge tone={open ? "success" : "neutral"}>{open ? "Open" : "Closed"}</Badge>
      );
    },
  },
  {
    key: "unread",
    header: "Unread",
    render: (row) =>
      row.unread_count > 0 ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
          {row.unread_count}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "last",
    header: "Last activity",
    render: (row) =>
      row.last_message_at ? new Date(row.last_message_at).toLocaleString() : "—",
    className: "whitespace-nowrap text-xs text-muted-foreground",
  },
];

export function ChatHistoryTable() {
  return (
    <LedgerTable
      queryKey={["analytics", "chats"]}
      endpoint="/analytics/chats"
      columns={columns}
      emptyIcon={MessageSquare}
      emptyTitle="No conversations yet"
      emptyDescription="Conversations appear here as soon as a contact messages you or you start a chat."
    />
  );
}
