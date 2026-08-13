"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Check, CheckCheck, Clock, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  type: string;
  content: Record<string, unknown>;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  error: { title: string } | null;
  sent_at: string;
}

interface MessagesResponse {
  data: Message[];
  sessionExpiresAt: string | null;
  canSendFreeform: boolean;
}

interface CannedMessage {
  id: string;
  shortcode: string;
  body: string;
}

export function ChatPane({
  conversationId,
  contactName,
  contactWaId,
}: {
  conversationId: string;
  contactName: string | null;
  contactWaId: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get<MessagesResponse>(`/conversations/${conversationId}/messages`),
    // Polling backs up Realtime so the thread stays fresh if the socket drops.
    refetchInterval: 15_000,
  });

  const canned = useQuery({
    queryKey: ["canned-messages"],
    queryFn: () => api.get<{ data: CannedMessage[] }>("/canned-messages"),
  });

  // Clear the unread badge once the thread is on screen.
  useEffect(() => {
    void api
      .patch(`/conversations/${conversationId}`, { markRead: true })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => undefined);
  }, [conversationId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.data?.data.length]);

  const send = useMutation({
    mutationFn: (text: string) =>
      api.post(`/conversations/${conversationId}/messages`, { type: "text", text }),
    onSuccess: () => {
      setDraft("");
      void messages.refetch();
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Message could not be sent",
      ),
  });

  const canSend = messages.data?.canSendFreeform ?? false;

  // Typing "/shortcode " expands the matching canned message.
  const handleDraftChange = (value: string) => {
    const match = /^\/([a-z0-9_-]+)\s$/.exec(value);
    const shortcut = match
      ? canned.data?.data.find((c) => c.shortcode === match[1])
      : undefined;
    setDraft(shortcut ? shortcut.body : value);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b p-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(contactName, contactWaId.slice(-2))}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{contactName ?? `+${contactWaId}`}</p>
          <p className="font-mono text-xs text-muted-foreground">+{contactWaId}</p>
        </div>
        {messages.data && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              canSend ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {canSend
              ? `Window open until ${format(new Date(messages.data.sessionExpiresAt!), "HH:mm")}`
              : "24-hour window closed"}
          </span>
        )}
      </header>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto bg-muted/20 p-6">
        {messages.isLoading ? (
          <div className="grid h-full place-items-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : messages.data?.data.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.data?.data.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t p-4">
        {!canSend && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              More than 24 hours have passed since this contact&apos;s last message. Only
              approved templates can be sent until they reply again.
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) send.mutate(draft.trim());
          }}
          className="flex items-end gap-3"
        >
          <Textarea
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) send.mutate(draft.trim());
              }
            }}
            disabled={!canSend}
            placeholder={
              canSend
                ? "Type a message, or / for a canned reply..."
                : "Send a template to reopen this conversation"
            }
            className="min-h-[52px] flex-1 resize-none"
          />
          <Button type="submit" size="lg" loading={send.isPending} disabled={!canSend || !draft.trim()}>
            <Send size={18} />
            Send
          </Button>
        </form>
      </footer>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === "outbound";
  const text =
    (message.content.text as string) ??
    (message.content.caption as string) ??
    `[${message.type}]`;

  return (
    <li className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
          outbound
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-card",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[11px]",
            outbound ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {format(new Date(message.sent_at), "HH:mm")}
          {outbound && <StatusTick status={message.status} />}
        </div>
        {message.error && (
          <p className="mt-1 text-[11px] font-medium text-destructive">{message.error.title}</p>
        )}
      </div>
    </li>
  );
}

function StatusTick({ status }: { status: Message["status"] }) {
  switch (status) {
    case "queued":
      return <Clock size={13} aria-label="Queued" />;
    case "sent":
      return <Check size={13} aria-label="Sent" />;
    case "delivered":
      return <CheckCheck size={13} aria-label="Delivered" />;
    case "read":
      return <CheckCheck size={13} className="text-sky-300" aria-label="Read" />;
    case "failed":
      return <X size={13} className="text-destructive" aria-label="Failed" />;
  }
}
