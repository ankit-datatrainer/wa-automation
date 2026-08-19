"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Filter,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  Square,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import {
  MediaAttachmentModal,
  TemplatePickerModal,
} from "./inbox-modals";

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

const COMMON_EMOJIS = ["👍", "👋", "❤️", "😊", "🎉", "🔥", "🙏", "✅", "🚀", "💬", "⭐", "💼"];

export function ChatPane({
  conversationId,
  contactId,
  contactName,
  contactWaId,
}: {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  contactWaId: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [searchInChat, setSearchInChat] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState<"image" | "document" | null>(null);

  // Voice note simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get<MessagesResponse>(`/conversations/${conversationId}/messages`),
    refetchInterval: 15_000,
  });

  const canned = useQuery({
    queryKey: ["canned-messages"],
    queryFn: () => api.get<{ data: CannedMessage[] }>("/canned-messages"),
  });

  // Clear unread badge once opened
  useEffect(() => {
    void api
      .patch(`/conversations/${conversationId}`, { markRead: true })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => undefined);
  }, [conversationId, queryClient]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.data.length]);

  // Voice note recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingTimer((t) => t + 1), 1000);
    } else {
      setRecordingTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

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

  const sendVoiceNote = useMutation({
    mutationFn: () =>
      api.post(`/conversations/${conversationId}/messages`, {
        type: "media",
        mediaType: "audio",
        mediaUrl: "https://example.com/audio-voice-note.mp3",
      }),
    onSuccess: () => {
      setIsRecording(false);
      toast.success("Voice note sent");
      void messages.refetch();
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      setIsRecording(false);
      toast.error(error instanceof ApiClientError ? error.message : "Failed to send voice note");
    },
  });

  const canSend = messages.data?.canSendFreeform ?? false;

  // Typing "/shortcode " expands the matching canned message
  const handleDraftChange = (value: string) => {
    const match = /^\/([a-z0-9_-]+)\s$/.exec(value);
    const shortcut = match
      ? canned.data?.data.find((c) => c.shortcode === match[1])
      : undefined;
    setDraft(shortcut ? shortcut.body : value);
  };

  const handleInsertEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    setEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  // Group messages by date for date badges in message history
  const rawMessagesList = messages.data?.data ?? [];
  const filteredMessages = searchInChat.trim()
    ? rawMessagesList.filter((m) => {
        const text =
          (m.content?.text as string) ||
          (m.content?.caption as string) ||
          (m.content?.templateName as string) ||
          "";
        return text.toLowerCase().includes(searchInChat.toLowerCase());
      })
    : rawMessagesList;

  const groupedByDay = groupMessagesByDay(filteredMessages);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background relative">
      {/* 1. Header Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-foreground">
            {initials(contactName, contactWaId.slice(-2))}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">
              {contactName ?? `+${contactWaId}`}
            </h2>
            <p className="font-mono text-xs text-muted-foreground">{contactWaId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            aria-label="Search within chat"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
              isSearching
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Search size={16} />
          </button>

          <button
            type="button"
            aria-label="Conversation options"
            className="grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Filter size={16} />
          </button>

          {/* 24-hr window badge */}
          {messages.data && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold shadow-2xs",
                canSend
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
              )}
            >
              {canSend
                ? `Window open until ${format(new Date(messages.data.sessionExpiresAt!), "HH:mm")}`
                : "24hr window closed"}
            </span>
          )}
        </div>
      </header>

      {/* In-chat Search Bar Overlay */}
      {isSearching && (
        <div className="flex items-center gap-2 border-b bg-muted/40 px-6 py-2 animate-in slide-in-from-top-2 duration-150">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search in this conversation..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {searchInChat && (
            <span className="text-[11px] text-muted-foreground font-medium">
              {filteredMessages.length} {filteredMessages.length === 1 ? "match" : "matches"}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsSearching(false);
              setSearchInChat("");
            }}
            aria-label="Close search"
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Message History Stream */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto bg-[#F0F2F5]/60 dark:bg-zinc-950/60 p-6 space-y-6"
      >
        {messages.isLoading ? (
          <div className="grid h-full place-items-center">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No messages</p>
              <p className="text-xs text-muted-foreground">
                {searchInChat
                  ? "No messages match your search keyword."
                  : "Send an approved template to initiate or restart the conversation."}
              </p>
            </div>
          </div>
        ) : (
          groupedByDay.map(({ dateLabel, items }) => (
            <div key={dateLabel} className="space-y-4">
              {/* Date Separator Pill */}
              <div className="flex justify-center">
                <span className="rounded-full bg-white dark:bg-zinc-800 px-3.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-xs border">
                  {dateLabel}
                </span>
              </div>

              {/* Message items */}
              <ul className="space-y-3">
                {items.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </ul>
            </div>
          ))
        )}

        {/* 24-Hour Messaging Window Closed Banner matching reference */}
        {!canSend && messages.data && (
          <div className="my-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-5 shadow-xs transition-all">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[#00C268]">
                <Clock size={18} />
              </span>
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                  24-hour messaging window closed
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                  The last message from this contact was more than 24 hours ago. Send an approved
                  template message to continue the conversation. Regular messages will be
                  available once the customer responds.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setTemplatePickerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00C268] px-4 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95"
                  >
                    <FileText size={15} />
                    Browse Message Templates
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Chat Input Bar */}
      <footer className="border-t bg-card p-3 relative">
        {/* Emoji Popover */}
        {emojiPickerOpen && (
          <div className="absolute bottom-full left-12 mb-2 w-64 rounded-2xl border bg-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95">
            <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Emojis</p>
            <div className="grid grid-cols-6 gap-2 text-xl text-center">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="rounded-lg p-1.5 hover:bg-muted transition-transform active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plus Action Menu */}
        {plusMenuOpen && (
          <div className="absolute bottom-full left-4 mb-2 w-56 rounded-2xl border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-1">
            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setTemplatePickerOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
            >
              <FileText size={16} className="text-[#00C268]" />
              <span>Message Template</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setMediaModalType("image");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
            >
              <ImageIcon size={16} className="text-blue-500" />
              <span>Send Image</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setMediaModalType("document");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
            >
              <Paperclip size={16} className="text-purple-500" />
              <span>Send Document</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setDraft("/");
                inputRef.current?.focus();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
            >
              <Sparkles size={16} className="text-amber-500" />
              <span>Quick Replies (/)</span>
            </button>
          </div>
        )}

        {/* Voice Note Recording Bar Simulation */}
        {isRecording ? (
          <div className="flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2.5 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-destructive animate-ping" />
              <span className="text-xs font-bold text-destructive">
                Recording Audio Note... {recordingTimer}s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecording(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                loading={sendVoiceNote.isPending}
                onClick={() => sendVoiceNote.mutate()}
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Send Voice Note
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim() && canSend) send.mutate(draft.trim());
            }}
            className="flex items-center gap-2"
          >
            {/* Attachment buttons */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                aria-label="Add attachment"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                <Plus size={18} />
              </button>

              <button
                type="button"
                onClick={() => setMediaModalType("image")}
                aria-label="Attach file"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                onClick={() => setIsRecording(true)}
                aria-label="Record voice note"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                <Mic size={18} />
              </button>
            </div>

            {/* Input textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim() && canSend) send.mutate(draft.trim());
                  }
                }}
                disabled={!canSend}
                rows={1}
                placeholder={
                  canSend
                    ? "Type a message, or / for quick reply..."
                    : "Session expired - Please use template messages"
                }
                className={cn(
                  "w-full resize-none rounded-xl border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px] max-h-28",
                  !canSend && "cursor-not-allowed opacity-80",
                )}
              />
            </div>

            {/* Right action icons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                aria-label="Insert emoji"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Smile size={18} />
              </button>

              <button
                type="submit"
                disabled={!canSend || !draft.trim() || send.isPending}
                aria-label="Send message"
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full bg-[#00C268] text-white shadow-sm transition-all",
                  (!canSend || !draft.trim())
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#00B05D] active:scale-95",
                )}
              >
                {send.isPending ? (
                  <Spinner className="h-4 w-4 text-white" />
                ) : (
                  <Send size={16} className="translate-x-0.5" />
                )}
              </button>
            </div>
          </form>
        )}
      </footer>

      {/* Modals */}
      <TemplatePickerModal
        conversationId={conversationId}
        contactName={contactName}
        isOpen={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
      />

      {mediaModalType && (
        <MediaAttachmentModal
          conversationId={conversationId}
          type={mediaModalType}
          isOpen={true}
          onClose={() => setMediaModalType(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// Message Bubble & Template Cards
// --------------------------------------------------------------------------------

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === "outbound";
  const isTemplate = message.type === "template";
  const isAudio = message.type === "audio";

  const text =
    (message.content?.text as string) ??
    (message.content?.caption as string) ??
    "";

  const mediaUrl = message.content?.mediaUrl as string | undefined;

  return (
    <li className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[72%] rounded-2xl p-3 shadow-xs space-y-1.5 relative",
          outbound
            ? "rounded-tr-xs bg-[#E7FED9] dark:bg-[#005C4B] text-zinc-900 dark:text-zinc-100 border border-emerald-100 dark:border-emerald-900/40"
            : "rounded-tl-xs bg-card text-foreground border shadow-xs",
        )}
      >
        {/* Template message header badge */}
        {isTemplate && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#00C268] border-b pb-1.5">
            <Sparkles size={13} />
            <span>Template Message</span>
          </div>
        )}

        {/* Media Preview (image/logo) */}
        {mediaUrl && (
          <div className="overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt="Attachment"
              className="max-h-56 w-full object-cover"
            />
          </div>
        )}

        {/* Audio / Voice message */}
        {isAudio && (
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full bg-[#00C268] text-white shadow-xs"
            >
              <Volume2 size={15} />
            </button>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-32 rounded-full bg-black/10 dark:bg-white/20">
                <div className="h-full w-1/2 rounded-full bg-[#00C268]" />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">0:14 / 0:28</p>
            </div>
          </div>
        )}

        {/* Text body */}
        {text && (
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
            {text}
          </p>
        )}

        {/* Time and Status Ticks */}
        <div
          className={cn(
            "flex items-center justify-end gap-1 text-[10px] pt-0.5",
            outbound ? "text-zinc-600 dark:text-zinc-300" : "text-muted-foreground",
          )}
        >
          <span>{format(new Date(message.sent_at), "h:mm a")}</span>
          {outbound && <StatusTick status={message.status} />}
        </div>

        {message.error && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-destructive pt-1">
            <AlertCircle size={12} />
            <span>{message.error.title}</span>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusTick({ status }: { status: Message["status"] }) {
  switch (status) {
    case "queued":
      return <Clock size={12} aria-label="Queued" className="text-muted-foreground" />;
    case "sent":
      return <Check size={13} aria-label="Sent" className="text-muted-foreground" />;
    case "delivered":
      return <CheckCheck size={14} aria-label="Delivered" className="text-zinc-600 dark:text-zinc-300" />;
    case "read":
      return <CheckCheck size={14} className="text-[#00C268]" aria-label="Read" />;
    case "failed":
      return <X size={13} className="text-destructive" aria-label="Failed" />;
  }
}

function groupMessagesByDay(messages: Message[]) {
  const groups = new Map<string, Message[]>();

  for (const m of messages) {
    const d = new Date(m.sent_at);
    const label = isToday(d)
      ? "Today"
      : isYesterday(d)
        ? "Yesterday"
        : format(d, "MMM d, yyyy");

    const existing = groups.get(label);
    if (existing) existing.push(m);
    else groups.set(label, [m]);
  }

  return [...groups.entries()].map(([dateLabel, items]) => ({ dateLabel, items }));
}
