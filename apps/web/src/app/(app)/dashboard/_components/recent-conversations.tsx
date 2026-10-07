"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Stagger, StaggerItem } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { one, type ChatRow, type Paginated } from "./types";

const AVATAR_GRADIENTS = [
  "from-[#6d28d9] to-[#833ab4]",
  "from-[#833ab4] to-[#c13584]",
  "from-[#c13584] to-[#e1306c]",
  "from-[#e1306c] to-[#f77737]",
];

export function RecentConversations() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "recent-chats"],
    queryFn: () => api.get<Paginated<ChatRow>>("/analytics/chats", { page: 1, pageSize: 6 }),
  });

  const rows = data?.data ?? [];
  const unread = rows.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <MessagesSquare size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Latest conversations</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Your most recent chats"
              : unread > 0
                ? `${unread} unread in your recent chats`
                : "You're all caught up"}
          </p>
        </div>
        <Link href="/inbox" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 text-primary")}>
          Inbox
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-2">
            <ErrorState message="Could not load conversations." onRetry={() => void refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No conversations yet"
            description="When customers message your WhatsApp number, their chats show up here."
          />
        ) : (
          <Stagger className="space-y-1" stagger={0.05}>
            {rows.map((chat, index) => {
              const contact = one(chat.contacts);
              const label = contact?.name || (contact?.wa_id ? `+${contact.wa_id.replace(/^\+/, "")}` : "Unknown contact");
              const sessionOpen =
                !!chat.session_expires_at && new Date(chat.session_expires_at).getTime() > Date.now();
              return (
                <StaggerItem key={chat.id}>
                  <Link
                    href={contact?.wa_id ? `/inbox?contact=${encodeURIComponent(contact.wa_id)}` : "/inbox"}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="relative shrink-0">
                      <span
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
                          AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
                        )}
                      >
                        {initials(contact?.name, "#")}
                      </span>
                      {sessionOpen && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
                          title="24-hour session open"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm group-hover:text-primary",
                            chat.unread_count > 0 ? "font-bold" : "font-semibold",
                          )}
                        >
                          {label}
                        </span>
                        {chat.last_message_at && (
                          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                            {formatDistanceToNowStrict(new Date(chat.last_message_at), { addSuffix: true })}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {chat.last_message_preview || "No messages yet"}
                        </span>
                        {chat.unread_count > 0 && (
                          <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-gradient px-1.5 text-[10px] font-bold text-white">
                            {chat.unread_count > 99 ? "99+" : chat.unread_count}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </Card>
  );
}
