"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Film,
  Hourglass,
  Image as ImageIcon,
  MapPin,
  MoreHorizontal,
  Music,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  Smile,
  Sparkles,
  Sticker,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { ease } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ContactAvatar, popoverMotion, useClickOutside } from "./inbox-ui";
import { MediaAttachmentModal, TemplatePickerModal, type MediaKind } from "./inbox-modals";

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

type ConversationStatus = "open" | "pending" | "closed";

const COMMON_EMOJIS = [
  "👍", "👋", "❤️", "😊", "😂", "🎉", "🔥", "🙏",
  "✅", "🚀", "💬", "⭐", "💼", "📦", "🙌", "👌",
];

const STATUS_ACTIONS: { value: ConversationStatus; label: string; icon: typeof Check }[] = [
  { value: "closed", label: "Mark as resolved", icon: CheckCircle2 },
  { value: "pending", label: "Mark as pending", icon: Hourglass },
  { value: "open", label: "Reopen conversation", icon: RotateCcw },
];

const MEDIA_OPTIONS: { kind: MediaKind; label: string; icon: typeof ImageIcon; tint: string }[] = [
  { kind: "image", label: "Image", icon: ImageIcon, tint: "from-[#833ab4] to-[#c13584]" },
  { kind: "video", label: "Video", icon: Film, tint: "from-[#c13584] to-[#e1306c]" },
  { kind: "document", label: "Document", icon: FileText, tint: "from-[#6d28d9] to-[#833ab4]" },
  { kind: "audio", label: "Audio", icon: Music, tint: "from-[#e1306c] to-[#f77737]" },
];

export function ChatPane({
  conversationId,
  contactName,
  contactWaId,
  status,
  detailsOpen,
  onToggleDetails,
  onBack,
}: {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  contactWaId: string;
  status?: string;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  onBack?: () => void;
}) {
  const queryClient = useQueryClient();
  const messagesKey = useMemo(() => ["messages", conversationId] as const, [conversationId]);

  const [draft, setDraft] = useState("");
  const [searchInChat, setSearchInChat] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [menu, setMenu] = useState<null | "attach" | "emoji" | "canned">(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const initialIdsRef = useRef<Set<string> | null>(null);
  const recentlySentRef = useRef(new Set<string>());

  const messages = useQuery({
    queryKey: messagesKey,
    queryFn: () => api.get<MessagesResponse>(`/conversations/${conversationId}/messages`),
    refetchInterval: 15_000,
  });

  const canned = useQuery({
    queryKey: ["canned-messages"],
    queryFn: () => api.get<{ data: CannedMessage[] }>("/canned-messages"),
  });

  // Clear the unread badge once the thread is opened.
  useEffect(() => {
    void api
      .patch(`/conversations/${conversationId}`, { markRead: true })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => undefined);
  }, [conversationId, queryClient]);

  const send = useMutation({
    mutationFn: (text: string) =>
      api.post(`/conversations/${conversationId}/messages`, { type: "text", text }),
    // Optimistically append the bubble so sending feels instant.
    onMutate: async (text) => {
      setDraft("");
      recentlySentRef.current.add(text);
      atBottomRef.current = true;
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<MessagesResponse>(messagesKey);
      if (previous) {
        const optimistic: Message = {
          id: `optimistic-${Date.now()}`,
          direction: "outbound",
          type: "text",
          content: { text },
          status: "queued",
          error: null,
          sent_at: new Date().toISOString(),
        };
        queryClient.setQueryData<MessagesResponse>(messagesKey, {
          ...previous,
          data: [...previous.data, optimistic],
        });
      }
      return { previous, text };
    },
    onError: (error, _text, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous);
      if (context?.text) setDraft(context.text);
      toast.error(error instanceof ApiClientError ? error.message : "Message could not be sent");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: (next: ConversationStatus) =>
      api.patch(`/conversations/${conversationId}`, { status: next }),
    onSuccess: (_data, next) => {
      toast.success(
        next === "closed"
          ? "Conversation resolved"
          : next === "pending"
            ? "Marked as pending"
            : "Conversation reopened",
      );
      setStatusMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update status"),
  });

  const canSend = messages.data?.canSendFreeform ?? false;
  const sessionExpiresAt = messages.data?.sessionExpiresAt ?? null;
  const cannedList = canned.data?.data ?? [];

  // ---- Slash-command quick replies ----------------------------------------
  const slashMatch = /^\/([a-z0-9_-]*)$/i.exec(draft);
  const slashSuggestions = slashMatch
    ? cannedList
        .filter((c) => c.shortcode.toLowerCase().includes(slashMatch[1]!.toLowerCase()))
        .slice(0, 6)
    : [];
  const showSlash = canSend && !!slashMatch && menu === null;

  useEffect(() => setSlashIndex(0), [draft]);

  // Typing "/shortcode " expands the matching canned message.
  const handleDraftChange = (value: string) => {
    const match = /^\/([a-z0-9_-]+)\s$/.exec(value);
    const shortcut = match ? cannedList.find((c) => c.shortcode === match[1]) : undefined;
    setDraft(shortcut ? shortcut.body : value);
  };

  const insertCanned = (body: string) => {
    setDraft(body);
    setMenu(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleInsertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (el && typeof el.selectionStart === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const next = draft.slice(0, start) + emoji + draft.slice(end);
      setDraft(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      setDraft((prev) => prev + emoji);
    }
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || !canSend || send.isPending) return;
    send.mutate(text);
  };

  // ---- Composer autosize ----------------------------------------------------
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  // ---- Popovers -------------------------------------------------------------
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeStatusMenu = useCallback(() => setStatusMenuOpen(false), []);
  useClickOutside(footerRef, menu !== null, closeMenu);
  useClickOutside(statusMenuRef, statusMenuOpen, closeStatusMenu);

  // ---- Messages + search ----------------------------------------------------
  const rawMessages = messages.data?.data ?? [];
  if (initialIdsRef.current === null && messages.data) {
    // Messages present on first load fade in as one block; later ones animate individually.
    initialIdsRef.current = new Set(rawMessages.map((m) => m.id));
  }

  const needle = searchInChat.trim().toLowerCase();
  const filteredMessages = needle
    ? rawMessages.filter((m) => messageSearchText(m).toLowerCase().includes(needle))
    : rawMessages;
  const groupedByDay = groupMessagesByDay(filteredMessages);

  // Auto-scroll when new messages arrive, unless the agent scrolled up to read history.
  const lastId = rawMessages[rawMessages.length - 1]?.id;
  const lastOutbound = rawMessages[rawMessages.length - 1]?.direction === "outbound";
  const firstScrollDone = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !lastId) return;
    if (!firstScrollDone.current) {
      el.scrollTop = el.scrollHeight;
      firstScrollDone.current = true;
      return;
    }
    if (atBottomRef.current || lastOutbound) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      setShowJump(true);
    }
  }, [lastId, lastOutbound]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    if (atBottom) setShowJump(false);
    else if (el.scrollHeight - el.scrollTop - el.clientHeight > 400) setShowJump(true);
  };

  const jumpToLatest = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setShowJump(false);
  };

  const currentStatus = (status ?? "open") as ConversationStatus;
  const displayName = contactName ?? `+${contactWaId}`;

  return (
    <section aria-label={`Conversation with ${displayName}`} className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      {/* ---------------------------------------------------------------- Header */}
      <header className="relative z-20 flex h-[68px] shrink-0 items-center gap-2 border-b border-border/70 bg-white/85 px-2.5 backdrop-blur-xl sm:gap-3 sm:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleDetails}
          aria-label={`${detailsOpen ? "Hide" : "Show"} details for ${displayName}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-brand-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ContactAvatar name={contactName} waId={contactWaId} size="sm" online={canSend} className="sm:hidden" />
          <ContactAvatar name={contactName} waId={contactWaId} online={canSend} className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-base font-semibold leading-tight">{displayName}</h2>
              {currentStatus !== "open" && (
                <span
                  className={cn(
                    "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset sm:inline-flex",
                    currentStatus === "closed"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200",
                  )}
                >
                  {currentStatus === "closed" ? "Resolved" : "Pending"}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-medium tabular-nums">+{contactWaId}</span>
              {messages.data && (
                <span className={cn("ml-2 sm:hidden", canSend ? "text-emerald-600" : "text-amber-600")}>
                  · {canSend ? "Window open" : "Window closed"}
                </span>
              )}
            </p>
          </div>
        </button>

        {/* 24-hour window chip */}
        {messages.data && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease }}
            className={cn(
              "hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset sm:inline-flex",
              canSend
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200",
            )}
            title={
              canSend && sessionExpiresAt
                ? `Free-form replies allowed until ${format(new Date(sessionExpiresAt), "PPp")}`
                : "Only approved templates can be sent"
            }
          >
            <span className="relative flex h-2 w-2">
              {canSend && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", canSend ? "bg-emerald-500" : "bg-amber-500")} />
            </span>
            {canSend && sessionExpiresAt
              ? `${formatDistanceToNowStrict(new Date(sessionExpiresAt))} left`
              : "Window closed"}
          </motion.span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <HeaderIconButton
            label={isSearching ? "Close search" : "Search in conversation"}
            active={isSearching}
            onClick={() => {
              if (isSearching) setSearchInChat("");
              setIsSearching((v) => !v);
            }}
          >
            <Search size={17} />
          </HeaderIconButton>

          <div ref={statusMenuRef} className="relative">
            <HeaderIconButton
              label="Conversation actions"
              active={statusMenuOpen}
              onClick={() => setStatusMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={statusMenuOpen}
            >
              <MoreHorizontal size={18} />
            </HeaderIconButton>
            <AnimatePresence>
              {statusMenuOpen && (
                <motion.div
                  role="menu"
                  {...popoverMotion}
                  className="absolute right-0 top-full z-40 mt-2 w-60 origin-top-right rounded-2xl border border-border/80 bg-white p-1.5 shadow-lift"
                >
                  <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Conversation
                  </p>
                  {STATUS_ACTIONS.filter((a) => a.value !== currentStatus).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitem"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate(value)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-50 hover:text-primary disabled:opacity-50"
                    >
                      <Icon size={16} className="text-primary" />
                      {label}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-border/70" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setStatusMenuOpen(false);
                      setTemplatePickerOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-50 hover:text-primary"
                  >
                    <Sparkles size={16} className="text-primary" />
                    Send a template
                  </button>
                  {onToggleDetails && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setStatusMenuOpen(false);
                        onToggleDetails();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-50 hover:text-primary"
                    >
                      {detailsOpen ? (
                        <PanelRightClose size={16} className="text-primary" />
                      ) : (
                        <PanelRightOpen size={16} className="text-primary" />
                      )}
                      {detailsOpen ? "Hide contact details" : "Show contact details"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {onToggleDetails && (
            <HeaderIconButton
              label={detailsOpen ? "Hide contact details" : "Show contact details"}
              active={detailsOpen}
              onClick={onToggleDetails}
              className="hidden sm:grid"
            >
              {detailsOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
            </HeaderIconButton>
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------------- Search bar */}
      <AnimatePresence initial={false}>
        {isSearching && (
          <motion.div
            key="chat-search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            className="relative z-10 shrink-0 overflow-hidden border-b border-border/70 bg-brand-50/40"
          >
            <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
              <Search size={15} className="shrink-0 text-primary" aria-hidden />
              <input
                type="text"
                aria-label="Search messages in this conversation"
                placeholder="Search in this conversation…"
                value={searchInChat}
                onChange={(e) => setSearchInChat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchInChat("");
                    setIsSearching(false);
                  }
                }}
                className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
              {needle && (
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-primary shadow-soft">
                  {filteredMessages.length} {filteredMessages.length === 1 ? "match" : "matches"}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- Messages */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="scrollbar-thin absolute inset-0 overflow-y-auto overscroll-contain bg-[radial-gradient(hsl(268_25%_91%/0.55)_1px,transparent_1px)] bg-[length:18px_18px] px-3 py-5 sm:px-6"
          aria-live="polite"
          aria-busy={messages.isLoading}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-50/70 to-transparent"
          />
          {messages.isLoading ? (
            <div className="relative space-y-4" aria-label="Loading messages">
              {[60, 42, 70, 35, 55].map((w, i) => (
                <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                  <Skeleton className="h-12 rounded-2xl" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          ) : messages.isError ? (
            <div className="relative grid h-full place-items-center text-center">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Messages could not be loaded</p>
                <Button variant="outline" size="sm" onClick={() => void messages.refetch()}>
                  <RotateCcw size={14} /> Try again
                </Button>
              </div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="relative grid h-full place-items-center text-center"
            >
              <div className="max-w-xs space-y-3">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  {needle ? <Search size={22} /> : <Sparkles size={22} />}
                </span>
                <p className="font-display text-base font-semibold text-foreground">
                  {needle ? "No matching messages" : "No messages yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {needle
                    ? "Try a different keyword."
                    : canSend
                      ? "Say hello — the 24-hour window is open."
                      : "Send an approved template to start the conversation."}
                </p>
                {!needle && !canSend && (
                  <Button size="sm" onClick={() => setTemplatePickerOpen(true)}>
                    <FileText size={15} /> Browse templates
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease }}
              className="relative space-y-5"
            >
              {groupedByDay.map(({ dateLabel, items }) => (
                <div key={dateLabel} className="space-y-2.5">
                  <div className="sticky top-0 z-10 flex justify-center py-1">
                    <span className="rounded-full border border-border/70 bg-white/90 px-3.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-soft backdrop-blur">
                      {dateLabel}
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {items.map((message) => {
                      const text = typeof message.content?.text === "string" ? message.content.text : "";
                      const isNew =
                        !initialIdsRef.current?.has(message.id) &&
                        !(
                          !message.id.startsWith("optimistic-") &&
                          message.direction === "outbound" &&
                          recentlySentRef.current.has(text)
                        );
                      return (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          animate={isNew}
                          highlight={needle}
                        />
                      );
                    })}
                  </ul>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Jump to latest */}
        <AnimatePresence>
          {showJump && (
            <motion.button
              type="button"
              onClick={jumpToLatest}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2, ease }}
              className="absolute bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow"
            >
              <ArrowDown size={14} /> Latest messages
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------------------------------------------------------- Window closed banner */}
      <AnimatePresence initial={false}>
        {!canSend && messages.data && (
          <motion.div
            key="window-closed"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="shrink-0 overflow-hidden border-t border-amber-200/70 bg-amber-50/70"
          >
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-soft ring-1 ring-amber-200">
                  <Clock size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900">24-hour messaging window closed</p>
                  <p className="text-xs leading-relaxed text-amber-800/80">
                    Send an approved template to restart the conversation. Free-form replies unlock
                    once the customer responds.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setTemplatePickerOpen(true)} className="shrink-0 self-start sm:self-auto">
                <FileText size={15} /> Browse templates
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- Composer */}
      <footer ref={footerRef} className="relative z-20 shrink-0 border-t border-border/70 bg-white px-2.5 pb-2.5 pt-2.5 sm:px-4 sm:pb-3">
        <AnimatePresence>
          {/* Slash-command suggestions */}
          {showSlash && (
            <motion.div
              key="slash"
              {...popoverMotion}
              className="absolute bottom-full left-3 right-3 z-40 mb-2 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-lift sm:left-4 sm:right-auto sm:w-96"
              role="listbox"
              aria-label="Quick replies"
            >
              <div className="flex items-center gap-2 border-b border-border/70 bg-brand-50/50 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground">
                <Zap size={13} className="text-primary" /> Quick replies
                <span className="ml-auto hidden font-normal sm:inline">↑↓ to move · Enter to insert</span>
              </div>
              {slashSuggestions.length === 0 ? (
                <div className="px-3.5 py-4 text-center text-xs text-muted-foreground">
                  {cannedList.length === 0 ? (
                    <>
                      No quick replies yet.{" "}
                      <Link href="/manage/canned-messages" className="font-semibold text-primary hover:underline">
                        Create one
                      </Link>
                    </>
                  ) : (
                    "No quick reply matches that shortcode."
                  )}
                </div>
              ) : (
                <ul className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
                  {slashSuggestions.map((c, i) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === slashIndex}
                        onMouseEnter={() => setSlashIndex(i)}
                        onClick={() => insertCanned(c.body)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                          i === slashIndex ? "bg-brand-50" : "hover:bg-muted/60",
                        )}
                      >
                        <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary ring-1 ring-brand-200">
                          /{c.shortcode}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{c.body}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {/* Attachment menu */}
          {menu === "attach" && (
            <motion.div
              key="attach"
              role="menu"
              {...popoverMotion}
              className="absolute bottom-full left-3 z-40 mb-2 w-64 rounded-2xl border border-border/80 bg-white p-2 shadow-lift sm:left-4"
            >
              <p className="px-2 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Attach
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {MEDIA_OPTIONS.map(({ kind, label, icon: Icon, tint }) => (
                  <button
                    key={kind}
                    type="button"
                    role="menuitem"
                    disabled={!canSend}
                    onClick={() => {
                      setMenu(null);
                      setMediaKind(kind);
                    }}
                    className="group flex flex-col items-center gap-1.5 rounded-xl p-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-soft transition-transform group-hover:-translate-y-0.5",
                        tint,
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              {!canSend && (
                <p className="px-2 pt-2 text-[11px] text-amber-700">
                  Media needs an open 24-hour window.
                </p>
              )}
              <div className="my-1.5 h-px bg-border/70" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  setTemplatePickerOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium hover:bg-brand-50 hover:text-primary"
              >
                <FileText size={16} className="text-primary" /> Message template
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!canSend}
                onClick={() => setMenu("canned")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium hover:bg-brand-50 hover:text-primary disabled:opacity-40 sm:hidden"
              >
                <Zap size={16} className="text-primary" /> Quick replies
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!canSend}
                onClick={() => setMenu("emoji")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium hover:bg-brand-50 hover:text-primary disabled:opacity-40 sm:hidden"
              >
                <Smile size={16} className="text-primary" /> Emoji
              </button>
            </motion.div>
          )}

          {/* Canned messages */}
          {menu === "canned" && (
            <motion.div
              key="canned"
              role="menu"
              {...popoverMotion}
              className="absolute bottom-full left-3 right-3 z-40 mb-2 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-lift sm:left-16 sm:right-auto sm:w-96"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-brand-50/50 px-3.5 py-2">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <Zap size={14} className="text-primary" /> Quick replies
                </span>
                <Link href="/manage/canned-messages" className="text-[11px] font-semibold text-primary hover:underline">
                  Manage
                </Link>
              </div>
              {canned.isLoading ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-9 rounded-xl" />
                  <Skeleton className="h-9 rounded-xl" />
                </div>
              ) : cannedList.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm font-semibold">No quick replies yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save answers you send often and insert them with one click or by typing /shortcode.
                  </p>
                  <Link
                    href="/manage/canned-messages"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Create quick replies <ExternalLink size={12} />
                  </Link>
                </div>
              ) : (
                <ul className="max-h-72 overflow-y-auto p-1.5 scrollbar-thin">
                  {cannedList.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => insertCanned(c.body)}
                        className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-brand-50"
                      >
                        <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary ring-1 ring-brand-200">
                          /{c.shortcode}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{c.body}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {/* Emoji picker */}
          {menu === "emoji" && (
            <motion.div
              key="emoji"
              {...popoverMotion}
              className="absolute bottom-full right-3 z-40 mb-2 w-[272px] rounded-2xl border border-border/80 bg-white p-3 shadow-lift sm:right-16"
            >
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Emoji</p>
              <div className="grid grid-cols-8 gap-1 text-xl">
                {COMMON_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    type="button"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleInsertEmoji(emoji)}
                    aria-label={`Insert ${emoji}`}
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-brand-50"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className={cn(
            "flex items-end gap-1 rounded-2xl border border-border/80 bg-muted/40 p-1.5 transition-all focus-within:border-primary/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10",
            !canSend && "bg-muted/60",
          )}
        >
          <div className="flex items-center">
            <ComposerButton
              label="Attach media or template"
              active={menu === "attach"}
              onClick={() => setMenu((m) => (m === "attach" ? null : "attach"))}
            >
              <Paperclip size={18} />
            </ComposerButton>
            <ComposerButton
              label="Send a template"
              onClick={() => {
                setMenu(null);
                setTemplatePickerOpen(true);
              }}
              className="hidden sm:grid"
            >
              <FileText size={18} />
            </ComposerButton>
            <ComposerButton
              label="Quick replies"
              active={menu === "canned"}
              disabled={!canSend}
              onClick={() => setMenu((m) => (m === "canned" ? null : "canned"))}
              className="hidden sm:grid"
            >
              <Zap size={18} />
            </ComposerButton>
          </div>

          <label htmlFor={`composer-${conversationId}`} className="sr-only">
            Message
          </label>
          <textarea
            id={`composer-${conversationId}`}
            ref={inputRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (showSlash && slashSuggestions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSlashIndex((i) => (i + 1) % slashSuggestions.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSlashIndex((i) => (i - 1 + slashSuggestions.length) % slashSuggestions.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertCanned(slashSuggestions[slashIndex]?.body ?? slashSuggestions[0]!.body);
                  return;
                }
              }
              if (e.key === "Escape" && showSlash) {
                setDraft("");
                return;
              }
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={!canSend}
            rows={1}
            placeholder={
              canSend
                ? "Type a message — / for quick replies"
                : "Window closed — send a template to continue"
            }
            className="max-h-40 min-h-[40px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/80 disabled:cursor-not-allowed"
          />

          <ComposerButton
            label="Insert emoji"
            active={menu === "emoji"}
            disabled={!canSend}
            onClick={() => setMenu((m) => (m === "emoji" ? null : "emoji"))}
            className="hidden sm:grid"
          >
            <Smile size={18} />
          </ComposerButton>

          <motion.button
            type="submit"
            disabled={!canSend || !draft.trim() || send.isPending}
            aria-label="Send message"
            whileTap={{ scale: 0.9 }}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
              canSend && draft.trim()
                ? "bg-brand-gradient shadow-glow hover:brightness-110"
                : "cursor-not-allowed bg-brand-300/70",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={send.isPending ? "pending" : "idle"}
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                className="grid place-items-center"
              >
                {send.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Send size={17} className="translate-x-px" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </form>
        <p className="mt-1.5 hidden px-2 text-[11px] text-muted-foreground sm:block">
          <kbd className="font-sans font-semibold">Enter</kbd> to send ·{" "}
          <kbd className="font-sans font-semibold">Shift + Enter</kbd> for a new line ·{" "}
          <kbd className="font-sans font-semibold">/</kbd> for quick replies
        </p>
      </footer>

      {/* ---------------------------------------------------------------- Modals */}
      <TemplatePickerModal
        conversationId={conversationId}
        contactName={contactName}
        isOpen={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
      />

      <MediaAttachmentModal
        conversationId={conversationId}
        type={mediaKind ?? "image"}
        isOpen={mediaKind !== null}
        onClose={() => setMediaKind(null)}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

function HeaderIconButton({
  label,
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-brand-200 bg-brand-50 text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-white hover:text-foreground hover:shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function ComposerButton({
  label,
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid h-10 w-9 shrink-0 place-items-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-white text-primary shadow-soft" : "text-muted-foreground hover:bg-white hover:text-primary hover:shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Message bubble                                                             */
/* -------------------------------------------------------------------------- */

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function messageSearchText(m: Message) {
  const c = m.content ?? {};
  return [str(c.text), str(c.caption), str(c.templateName), str(c.filename)].filter(Boolean).join(" ");
}

const MEDIA_LABELS: Record<string, { label: string; icon: typeof ImageIcon }> = {
  image: { label: "Photo", icon: ImageIcon },
  video: { label: "Video", icon: Film },
  audio: { label: "Voice message", icon: Music },
  document: { label: "Document", icon: FileText },
  sticker: { label: "Sticker", icon: Sticker },
};

function MessageBubble({
  message,
  animate,
  highlight,
}: {
  message: Message;
  animate: boolean;
  highlight: string;
}) {
  const outbound = message.direction === "outbound";
  const c = message.content ?? {};
  const type = message.type;
  const isTemplate = type === "template";
  const url = str(c.link) ?? str(c.mediaUrl);
  const filename = str(c.filename);
  const templateName = str(c.templateName);
  let text = str(c.text) ?? str(c.caption);
  if (type === "document" && text && text === filename) text = undefined;

  const latitude = typeof c.latitude === "number" ? c.latitude : undefined;
  const longitude = typeof c.longitude === "number" ? c.longitude : undefined;
  const mediaMeta = MEDIA_LABELS[type];

  const bubbleTone = outbound
    ? "bg-brand-gradient text-white rounded-br-md shadow-[0_10px_24px_-14px_rgba(131,58,180,0.85)]"
    : "bg-white text-foreground border border-border/70 rounded-bl-md shadow-soft";

  let body: React.ReactNode = null;

  if (type === "reaction") {
    body = <p className="text-3xl leading-none">{str(c.emoji) ?? text ?? "👍"}</p>;
  } else {
    body = (
      <>
        {isTemplate && (
          <div
            className={cn(
              "mb-1.5 flex items-center gap-1.5 border-b pb-1.5 text-[11px] font-semibold",
              outbound ? "border-white/20 text-white/90" : "border-border/70 text-primary",
            )}
          >
            <Sparkles size={12} />
            <span className="truncate">Template{templateName ? ` · ${templateName}` : ""}</span>
          </div>
        )}

        {url && (type === "image" || type === "sticker" || isTemplate) && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="-mx-1 mb-1.5 block overflow-hidden rounded-xl bg-black/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={text ?? "Image attachment"}
              loading="lazy"
              className="max-h-64 w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </a>
        )}

        {url && type === "video" && (
          <video controls preload="metadata" src={url} className="-mx-1 mb-1.5 max-h-64 w-[calc(100%+0.5rem)] rounded-xl bg-black" />
        )}

        {url && type === "audio" && (
          <audio controls preload="metadata" src={url} className="mb-1 h-10 w-64 max-w-full" />
        )}

        {url && type === "document" && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mb-1.5 flex items-center gap-3 rounded-xl p-2.5 transition-colors",
              outbound ? "bg-white/15 hover:bg-white/25" : "bg-brand-50/70 hover:bg-brand-50",
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                outbound ? "bg-white/20 text-white" : "bg-white text-primary shadow-soft",
              )}
            >
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{filename ?? fileNameFromUrl(url)}</span>
              <span className={cn("text-[11px]", outbound ? "text-white/75" : "text-muted-foreground")}>
                Open document
              </span>
            </span>
            <ExternalLink size={14} className="shrink-0 opacity-70" />
          </a>
        )}

        {/* Inbound media arrives as a Meta media id without a public URL. */}
        {!url && mediaMeta && (
          <div
            className={cn(
              "mb-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium",
              outbound ? "bg-white/15" : "bg-brand-50/70 text-brand-800",
            )}
          >
            <mediaMeta.icon size={16} />
            {type === "document" && filename ? filename : mediaMeta.label}
          </div>
        )}

        {type === "location" && latitude !== undefined && longitude !== undefined && (
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mb-1.5 flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium",
              outbound ? "bg-white/15 hover:bg-white/25" : "bg-brand-50/70 text-brand-800 hover:bg-brand-50",
            )}
          >
            <MapPin size={16} />
            <span className="truncate">{str(c.address) ?? "Shared location"}</span>
            <ExternalLink size={13} className="ml-auto shrink-0 opacity-70" />
          </a>
        )}

        {text ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            <Highlighted text={text} needle={highlight} outbound={outbound} />
          </p>
        ) : isTemplate && !url ? (
          <p className={cn("text-sm italic", outbound ? "text-white/85" : "text-muted-foreground")}>
            Template message sent
          </p>
        ) : !url && !mediaMeta && type !== "location" ? (
          <p className={cn("text-sm italic", outbound ? "text-white/85" : "text-muted-foreground")}>
            Unsupported message ({type})
          </p>
        ) : null}
      </>
    );
  }

  return (
    <motion.li
      layout="position"
      initial={animate ? { opacity: 0, y: 12, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn("flex flex-col", outbound ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "relative max-w-[86%] rounded-[20px] px-3.5 py-2.5 sm:max-w-[72%]",
          type === "reaction" ? "bg-transparent px-1 py-0 shadow-none" : bubbleTone,
          message.status === "failed" && outbound && "opacity-80 ring-2 ring-rose-300",
        )}
      >
        {body}
      </div>
      <div className="mt-1 flex items-center gap-1 px-1.5 text-[10.5px] text-muted-foreground">
        <time dateTime={message.sent_at} className="tabular-nums">
          {format(new Date(message.sent_at), "h:mm a")}
        </time>
        {outbound && <StatusTick status={message.status} />}
      </div>
      {message.error && (
        <div className="mt-0.5 flex items-center gap-1 px-1.5 text-[11px] font-semibold text-destructive">
          <AlertCircle size={12} />
          <span>{message.error.title}</span>
        </div>
      )}
    </motion.li>
  );
}

function Highlighted({ text, needle, outbound }: { text: string; needle: string; outbound: boolean }) {
  if (!needle) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = lower.indexOf(needle, from);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark
        key={idx}
        className={cn("rounded px-0.5", outbound ? "bg-white/30 text-white" : "bg-brand-yellow/40 text-foreground")}
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    from = idx + needle.length;
    idx = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

function StatusTick({ status }: { status: Message["status"] }) {
  switch (status) {
    case "queued":
      return (
        <span className="inline-flex items-center gap-0.5 text-status-sent" title="Sending">
          <Clock size={11} aria-hidden />
          <span className="sr-only">Sending</span>
        </span>
      );
    case "sent":
      return (
        <span className="inline-flex text-status-sent" title="Sent">
          <Check size={13} aria-hidden />
          <span className="sr-only">Sent</span>
        </span>
      );
    case "delivered":
      return (
        <span className="inline-flex text-status-delivered" title="Delivered">
          <CheckCheck size={14} aria-hidden />
          <span className="sr-only">Delivered</span>
        </span>
      );
    case "read":
      return (
        <span className="inline-flex items-center gap-0.5 font-semibold text-status-read" title="Read">
          <CheckCheck size={14} aria-hidden />
          <span>Read</span>
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-0.5 font-semibold text-status-failed" title="Failed">
          <AlertCircle size={12} aria-hidden />
          <span>Failed</span>
        </span>
      );
    default:
      return null;
  }
}

function fileNameFromUrl(url: string) {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : "Document";
  } catch {
    return "Document";
  }
}

function groupMessagesByDay(messages: Message[]) {
  const groups = new Map<string, Message[]>();

  for (const m of messages) {
    const d = new Date(m.sent_at);
    const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, MMM d, yyyy");

    const existing = groups.get(label);
    if (existing) existing.push(m);
    else groups.set(label, [m]);
  }

  return [...groups.entries()].map(([dateLabel, items]) => ({ dateLabel, items }));
}
