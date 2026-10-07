"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Inbox,
  Lock,
  MessagesSquare,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { downloadCsv, toCsv } from "../contacts/csv";
import { ContactAvatar, formatPhone } from "../contacts/ui";
import { dayLabel, safeDate, sessionInfo } from "./format";

export interface TranscriptContact {
  id?: string;
  wa_id: string;
  name: string | null;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  type: string;
  content: Record<string, unknown> | null;
  status: "queued" | "sent" | "delivered" | "read" | "failed" | string;
  error?: { title?: string; message?: string } | null;
  sent_at: string;
}

interface MessagesResponse {
  data: Message[];
  sessionExpiresAt: string | null;
  canSendFreeform: boolean;
  /** Only present on the API's sample-data fallback. */
  _conversationId?: string;
  /** Set client-side when the API answered with sample messages. */
  sample?: boolean;
}

const PAGE = 50;

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** Only http(s) links are rendered as images/anchors. */
function safeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : "";
}

/** Plain-text rendering of any message, for search and export. */
export function messageText(m: Message) {
  const c = m.content ?? {};
  if (m.type === "text") return str(c.text);
  if (m.type === "template") {
    const body = str(c.text) || str(c.body);
    return `[Template: ${str(c.templateName) || "template"}]${body ? ` ${body}` : ""}`;
  }
  if (["image", "video", "audio", "document", "sticker"].includes(m.type)) {
    const caption = str(c.caption) || str(c.text);
    return `[${m.type}]${caption ? ` ${caption}` : ""}`;
  }
  return str(c.text) || str(c.body) || `[${m.type}]`;
}

function StatusTick({ status }: { status: string }) {
  if (status === "read") return <CheckCheck size={14} className="text-primary" aria-label="Read" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-muted-foreground" aria-label="Delivered" />;
  if (status === "sent") return <Check size={14} className="text-muted-foreground" aria-label="Sent" />;
  if (status === "failed") return <AlertCircle size={14} className="text-rose-500" aria-label="Failed" />;
  return <Clock size={13} className="text-muted-foreground" aria-label="Queued" />;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-brand-yellow/50 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Bubble({ message, query, index }: { message: Message; query: string; index: number }) {
  const out = message.direction === "outbound";
  const c = message.content ?? {};
  const media = safeUrl(str(c.link) || str(c.mediaUrl));
  const caption = str(c.caption);
  const isTemplate = message.type === "template";
  const isMedia = ["image", "video", "audio", "document", "sticker"].includes(message.type);
  const body = isTemplate ? str(c.text) || str(c.body) : isMedia ? caption : messageText(message);
  const time = safeDate(message.sent_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease, delay: Math.min(index, 12) * 0.02 }}
      className={cn("flex", out ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_1px_2px_rgba(40,16,70,0.06)] sm:max-w-[70%]",
          out
            ? "rounded-br-md border border-brand-100 bg-brand-50 text-foreground"
            : "rounded-bl-md border border-border/80 bg-white text-foreground",
          message.status === "failed" && "border-rose-200 bg-rose-50/60",
        )}
      >
        {isTemplate && (
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <FileText size={11} />
            Template · {str(c.templateName) || "template"}
          </p>
        )}
        {isMedia && (
          <div className="mb-1.5">
            {message.type === "image" && media ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media}
                alt={caption || "Image attachment"}
                className="max-h-64 w-full rounded-xl object-cover"
                loading="lazy"
              />
            ) : (
              <a
                href={media || undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-2 text-xs font-semibold",
                  media ? "text-primary hover:underline" : "pointer-events-none text-muted-foreground",
                )}
              >
                {message.type === "image" ? <ImageIcon size={15} /> : <Paperclip size={15} />}
                <span className="capitalize">{message.type}</span>
                {media ? "· Open" : "· unavailable"}
              </a>
            )}
          </div>
        )}
        {isTemplate && media && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media} alt="Template header" className="mb-1.5 max-h-48 w-full rounded-xl object-cover" loading="lazy" />
        )}
        {body ? (
          <p className="whitespace-pre-wrap break-words">
            <Highlight text={body} query={query} />
          </p>
        ) : !isMedia ? (
          <p className="italic text-muted-foreground">Unsupported message</p>
        ) : null}
        {message.status === "failed" && message.error && (
          <p className="mt-1 text-[11px] font-medium text-rose-600">
            {message.error.title ?? message.error.message ?? "Delivery failed"}
          </p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>{time ? format(time, "p") : ""}</span>
          {out && <StatusTick status={message.status} />}
        </div>
      </div>
    </motion.div>
  );
}

export function Transcript({
  conversationId,
  contact,
  unreadCount,
  sessionExpiresAt,
  onBack,
}: {
  conversationId: string;
  contact: TranscriptContact | null;
  unreadCount: number;
  /** From the conversation list; used when the transcript has no real messages yet. */
  sessionExpiresAt?: string | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const messages = useInfiniteQuery({
    queryKey: ["messages", conversationId, "transcript"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<MessagesResponse> => {
      const res = await api.get<MessagesResponse>(`/conversations/${conversationId}/messages`, {
        limit: PAGE,
        before: pageParam,
      });
      // An empty (or older-than-the-first) page comes back as sample messages;
      // treat it as "no messages" rather than showing them as real history.
      if (res && "_conversationId" in res) {
        return { data: [], sessionExpiresAt: null, canSendFreeform: false, sample: true };
      }
      return res;
    },
    // Pages come back oldest-first; the next (older) page starts before the first message.
    getNextPageParam: (last) =>
      last.data.length >= PAGE && last.data[0] && safeDate(last.data[0].sent_at)
        ? new Date(last.data[0].sent_at).toISOString()
        : undefined,
    refetchInterval: 20_000,
  });

  const pages = messages.data?.pages ?? [];
  const latest = pages[0];
  const all = useMemo(() => {
    const seen = new Set<string>();
    // pages[0] is newest; render oldest page first.
    return [...pages]
      .reverse()
      .flatMap((p) => p.data)
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [pages]);

  const q = query.trim();
  const visible = q ? all.filter((m) => messageText(m).toLowerCase().includes(q.toLowerCase())) : all;

  const grouped = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    for (const m of visible) {
      const label = dayLabel(m.sent_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(m);
      else groups.push({ label, items: [m] });
    }
    return groups;
  }, [visible]);

  // Clear the unread badge once the transcript is opened.
  useEffect(() => {
    if (unreadCount <= 0) return;
    void api
      .patch(`/conversations/${conversationId}`, { markRead: true })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => undefined);
  }, [conversationId, unreadCount, queryClient]);

  // Stick to the bottom when new messages arrive (not when loading older ones).
  const newestId = latest?.data[latest.data.length - 1]?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [newestId]);

  // Older messages are prepended above; keep the reader's place instead of
  // letting the content jump.
  const distanceFromBottom = useRef<number | null>(null);
  const loadEarlier = () => {
    const el = scrollRef.current;
    if (el) distanceFromBottom.current = el.scrollHeight - el.scrollTop;
    void messages.fetchNextPage();
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || distanceFromBottom.current === null) return;
    el.scrollTop = el.scrollHeight - distanceFromBottom.current;
    distanceFromBottom.current = null;
  }, [pages.length]);

  const send = useMutation({
    mutationFn: (text: string) => api.post(`/conversations/${conversationId}/messages`, { type: "text", text }),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Message could not be sent"),
  });

  // With no real messages yet, fall back to the list's session window.
  const realLatest = latest && !latest.sample ? latest : undefined;
  const session = sessionInfo(realLatest ? realLatest.sessionExpiresAt : sessionExpiresAt);
  const canSend = realLatest ? realLatest.canSendFreeform : session.open;
  const name = contact?.name || (contact ? formatPhone(contact.wa_id) : "Conversation");

  const exportTranscript = () => {
    if (all.length === 0) {
      toast.info("Nothing to export yet");
      return;
    }
    downloadCsv(
      `chat_${contact?.wa_id ?? conversationId}_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ["Sent at", "Direction", "Type", "Status", "Message"],
        all.map((m) => [m.sent_at, m.direction, m.type, m.status, messageText(m)]),
      ),
    );
    toast.success(`Exported ${all.length} messages`);
  };

  const submit = () => {
    const text = draft.trim();
    if (text && !send.isPending) send.mutate(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-white/80 px-3 py-3 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-brand-50 hover:text-primary md:hidden"
        >
          <ArrowLeft size={18} />
        </button>
        <ContactAvatar name={contact?.name} waId={contact?.wa_id} seed={contact?.id ?? conversationId} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold leading-tight">{name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {contact && contact.name && (
              <span className="font-mono text-xs text-muted-foreground">{formatPhone(contact.wa_id)}</span>
            )}
            {latest && (
              <Badge tone={session.open ? "success" : "neutral"} className="px-2 py-0 text-[10px]">
                <span className={cn("h-1.5 w-1.5 rounded-full", session.open ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                {session.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setQuery("");
            }}
            aria-label={searchOpen ? "Close search" : "Search in conversation"}
            aria-pressed={searchOpen}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary",
              searchOpen && "bg-brand-50 text-primary",
            )}
          >
            {searchOpen ? <X size={17} /> : <Search size={17} />}
          </button>
          <button
            type="button"
            onClick={exportTranscript}
            aria-label="Export transcript as CSV"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary"
          >
            <Download size={17} />
          </button>
          <Link
            href="/inbox"
            className="ml-1 hidden items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-semibold shadow-[0_1px_2px_rgba(40,16,70,0.05)] transition hover:border-brand-200 hover:bg-brand-50 sm:inline-flex"
          >
            <Inbox size={14} />
            Open Inbox
          </Link>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            className="shrink-0 overflow-hidden border-b border-border/70 bg-white"
          >
            <div className="flex items-center gap-2 px-3 py-2 sm:px-5">
              <Input
                autoFocus
                aria-label="Search messages"
                placeholder="Search messages in this chat…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9"
              />
              {q && (
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {visible.length} found
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(131,58,180,0.07)_1px,transparent_0)] bg-[length:22px_22px] px-3 py-4 sm:px-6"
      >
        {messages.isLoading ? (
          <div className="space-y-3">
            {[60, 40, 72, 52, 35].map((w, i) => (
              <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                <Skeleton className="h-12" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : messages.isError ? (
          <ErrorState
            message={messages.error instanceof ApiClientError ? messages.error.message : "Could not load this conversation."}
            onRetry={() => void messages.refetch()}
          />
        ) : all.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No messages yet"
            description="Messages exchanged with this contact will appear here."
          />
        ) : (
          <div className="space-y-2.5">
            {messages.hasNextPage && !q && (
              <div className="flex justify-center pb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadEarlier}
                  loading={messages.isFetchingNextPage}
                >
                  Load earlier messages
                </Button>
              </div>
            )}
            {grouped.length === 0 && q && (
              <p className="py-10 text-center text-sm text-muted-foreground">No messages match “{q}”.</p>
            )}
            {grouped.map((group) => (
              <div key={group.label} className="space-y-2.5">
                <div className="sticky top-0 z-10 flex justify-center py-1">
                  <span className="rounded-full border border-border/70 bg-white/90 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-soft backdrop-blur">
                    {group.label}
                  </span>
                </div>
                {group.items.map((m, i) => (
                  <Bubble key={m.id} message={m} query={q} index={i} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border/70 bg-white p-3 sm:p-4">
        {!latest ? null : canSend ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              aria-label="Reply message"
              placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
              value={draft}
              maxLength={4096}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="max-h-36 min-h-11 resize-none py-2.5"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" aria-label="Send message" disabled={!draft.trim()} loading={send.isPending}>
              {!send.isPending && <Send size={17} />}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-sm text-amber-900 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2">
              <Lock size={15} className="shrink-0" />
              The 24-hour reply window is closed. Re-open it with an approved template.
            </span>
            <Link href="/inbox" className="font-semibold text-primary hover:underline sm:ml-auto">
              Send template in Inbox →
            </Link>
          </div>
        )}
        {messages.isFetchingNextPage && (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Spinner className="h-3.5 w-3.5" /> Loading earlier messages…
          </p>
        )}
      </div>
    </div>
  );
}
