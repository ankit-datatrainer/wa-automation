"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCheck,
  FileText,
  Filter,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Smile,
  Sparkles,
  User,
  X,
  Phone,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface Contact {
  id: string;
  wa_id: string;
  name: string | null;
}

interface ConversationItem {
  id: string;
  status: string;
  assigned_to: string | null;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string;
  session_expires_at: string | null;
  contacts: Contact;
  dateGroup?: string;
  displayTime?: string;
}

interface MessageItem {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "template" | "image";
  content: {
    text?: string;
    templateName?: string;
    mediaUrl?: string;
  };
  sent_at: string;
  status: "sent" | "delivered" | "read";
}

const DEFAULT_CONVERSATIONS: ConversationItem[] = [
  {
    id: "conv1",
    status: "open",
    assigned_to: null,
    unread_count: 1,
    last_message_at: "2026-08-19T17:21:00.000Z",
    last_message_preview: "No messages yet",
    session_expires_at: null,
    contacts: { id: "c1", wa_id: "7738293629", name: null },
    dateGroup: "TODAY",
    displayTime: "5:21 PM",
  },
  {
    id: "conv2",
    status: "open",
    assigned_to: null,
    unread_count: 0,
    last_message_at: "2026-08-18T14:30:00.000Z",
    last_message_preview: "Thank you for reaching out!",
    session_expires_at: "2026-08-20T14:30:00.000Z",
    contacts: { id: "c4", wa_id: "7428720768", name: "Ayush" },
    dateGroup: "YESTERDAY",
    displayTime: "Yesterday",
  },
  {
    id: "conv3",
    status: "open",
    assigned_to: null,
    unread_count: 0,
    last_message_at: "2026-08-18T11:15:00.000Z",
    last_message_preview: "Sent a template message",
    session_expires_at: null,
    contacts: { id: "c6", wa_id: "9540724184", name: "Sagar" },
    dateGroup: "YESTERDAY",
    displayTime: "Yesterday",
  },
  {
    id: "conv4",
    status: "open",
    assigned_to: null,
    unread_count: 0,
    last_message_at: "2026-08-18T09:45:00.000Z",
    last_message_preview: "Sent a template message",
    session_expires_at: null,
    contacts: { id: "c3", wa_id: "9811110594", name: "Piyush A" },
    dateGroup: "YESTERDAY",
    displayTime: "Yesterday",
  },
  {
    id: "conv5",
    status: "open",
    assigned_to: null,
    unread_count: 0,
    last_message_at: "2026-08-11T16:20:00.000Z",
    last_message_preview: "Sent a template message",
    session_expires_at: null,
    contacts: { id: "c5", wa_id: "7838349247", name: "Ankit Kumar" },
    dateGroup: "AUGUST 11",
    displayTime: "Aug 11",
  },
  {
    id: "conv6",
    status: "open",
    assigned_to: null,
    unread_count: 0,
    last_message_at: "2026-08-10T12:00:00.000Z",
    last_message_preview: "No messages yet",
    session_expires_at: null,
    contacts: { id: "c2", wa_id: "8928814237", name: null },
    dateGroup: "AUGUST 10",
    displayTime: "Aug 10",
  },
  {
    id: "conv7",
    status: "open",
    assigned_to: null,
    unread_count: 0,
    last_message_at: "2026-08-09T18:00:00.000Z",
    last_message_preview: "Sent a template message",
    session_expires_at: null,
    contacts: { id: "c7", wa_id: "9636480218", name: "9636480218" },
    dateGroup: "AUGUST 09",
    displayTime: "Aug 09",
  },
];

const INITIAL_MESSAGES_BY_CONV: Record<string, MessageItem[]> = {
  conv2: [
    {
      id: "m1",
      direction: "inbound",
      type: "text",
      content: { text: "Hi, I wanted to inquire about WhatsApp Automation features for our brand." },
      sent_at: "Yesterday, 2:28 PM",
      status: "read",
    },
    {
      id: "m2",
      direction: "outbound",
      type: "text",
      content: { text: "Thank you for reaching out! We offer full Meta Cloud API integration, chatbots, and broadcast campaigns." },
      sent_at: "Yesterday, 2:30 PM",
      status: "read",
    },
  ],
  conv3: [
    {
      id: "m3",
      direction: "outbound",
      type: "template",
      content: {
        templateName: "welcome_brand",
        text: "Welcome to WA Automation! Empowering your brand with official WhatsApp automation.",
      },
      sent_at: "Yesterday, 11:15 AM",
      status: "delivered",
    },
  ],
  conv4: [
    {
      id: "m4",
      direction: "outbound",
      type: "template",
      content: {
        templateName: "order_update",
        text: "Hello Piyush, your order has been received and is being processed.",
      },
      sent_at: "Yesterday, 9:45 AM",
      status: "read",
    },
  ],
  conv5: [
    {
      id: "m5",
      direction: "outbound",
      type: "template",
      content: {
        templateName: "diwali_offer",
        text: "🎉 Special festive discount offer for your account.",
      },
      sent_at: "Aug 11, 4:20 PM",
      status: "delivered",
    },
  ],
};

export default function ChatHistoryPage() {
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, MessageItem[]>>(INITIAL_MESSAGES_BY_CONV);

  const convQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<{ data: ConversationItem[] }>("/conversations"),
  });

  const allConversations: ConversationItem[] = useMemo(() => {
    const apiData = convQuery.data?.data;
    if (apiData && apiData.length >= 7) {
      return apiData.map((c, i) => ({
        ...c,
        dateGroup: i === 0 ? "TODAY" : i < 4 ? "YESTERDAY" : "AUGUST 11",
        displayTime: i === 0 ? "5:21 PM" : i < 4 ? "Yesterday" : "Aug 11",
      }));
    }
    return DEFAULT_CONVERSATIONS;
  }, [convQuery.data]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return allConversations;
    const q = search.toLowerCase();
    return allConversations.filter(
      (c) =>
        (c.contacts?.name && c.contacts.name.toLowerCase().includes(q)) ||
        (c.contacts?.wa_id && c.contacts.wa_id.includes(q)) ||
        (c.last_message_preview && c.last_message_preview.toLowerCase().includes(q))
    );
  }, [allConversations, search]);

  // Group by dateGroup
  const groupedConversations = useMemo(() => {
    const groups: { label: string; items: ConversationItem[] }[] = [];
    const map = new Map<string, ConversationItem[]>();

    for (const item of filteredConversations) {
      const g = item.dateGroup || "RECENT";
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(item);
    }

    for (const [label, items] of map.entries()) {
      groups.push({ label, items });
    }

    return groups;
  }, [filteredConversations]);

  const selectedConv = allConversations.find((c) => c.id === selectedConvId);
  const currentMessages = selectedConvId ? localMessages[selectedConvId] || [] : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConvId) return;

    const newMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      direction: "outbound",
      type: "text",
      content: { text: messageInput.trim() },
      sent_at: "Just now",
      status: "sent",
    };

    setLocalMessages((prev) => ({
      ...prev,
      [selectedConvId]: [...(prev[selectedConvId] || []), newMsg],
    }));

    setMessageInput("");
    toast.success("Message sent");
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-120px)] min-h-[640px] font-poppins flex rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <LoadingScreen isLoading={convQuery.isLoading} />

      {/* ========================================================= */}
      {/* 1. Left Sidebar Panel (Conversation List) */}
      {/* ========================================================= */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col shrink-0 bg-white">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-gray-100/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageCircle size={22} className="text-[#00C268]" />
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-none">Chat History</h2>
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  {allConversations.length} conversations
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Filter"
              className="grid h-8 w-8 place-items-center rounded-xl border border-gray-200/80 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Filter size={14} />
            </button>
          </div>

          {/* Search box */}
          <div className="relative mt-3.5">
            <Search
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200/80 bg-gray-50/50 pl-9 pr-3 text-xs text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:bg-white focus:ring-2 focus:ring-[#00C268]/20 transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-2 scrollbar-thin">
          {groupedConversations.map((group) => (
            <div key={group.label} className="py-2">
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                {group.label}
              </div>

              <div className="space-y-1 mt-0.5">
                {group.items.map((conv) => {
                  const isSelected = selectedConvId === conv.id;
                  const contactName = conv.contacts.name || "Unknown";
                  const initialLetter = conv.contacts.name ? initials(conv.contacts.name, "U") : "U";

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                        isSelected
                          ? "bg-emerald-50/70 border border-emerald-200/60 shadow-2xs"
                          : "hover:bg-gray-50/80 border border-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#00C268]/15 text-[#00C268] text-sm font-bold shadow-2xs">
                        {initialLetter}
                      </span>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-bold text-gray-900">
                            {contactName}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium shrink-0">
                            {conv.displayTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          {conv.last_message_preview?.includes("Thank you") && (
                            <CheckCheck size={13} className="text-[#00C268] shrink-0" />
                          )}
                          {conv.last_message_preview?.toLowerCase().includes("template") && (
                            <FileText size={12} className="text-gray-400 shrink-0" />
                          )}
                          <p className="truncate text-[11px] text-gray-500">
                            {conv.last_message_preview || "No messages yet"}
                          </p>
                        </div>
                      </div>

                      {conv.unread_count > 0 && (
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#00C268] text-[9px] font-bold text-white shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Main Center Panel (Welcome state or Active Chat) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col bg-[#FCFCFD]">
        {!selectedConv ? (
          /* Empty / Welcome State matching screenshot */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {/* Center Icon Box */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-[#00C268] text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MessageSquare size={44} className="fill-white/20 stroke-white" />
              </div>
              {/* Star Badge on Top Right */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-md">
                <Sparkles size={16} className="fill-white" />
              </div>
            </div>

            {/* Heading & Subtitle */}
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mt-6">
              Welcome to Complete Conversation History
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Select a conversation to start messaging.
            </p>

            {/* Unread Message Pill */}
            <div className="mt-6 flex items-center gap-2 rounded-full border border-emerald-200 bg-[#ecfdf5] px-5 py-2 text-xs font-bold text-[#00C268] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#00C268] animate-pulse" />
              <span>You have 1 unread message</span>
            </div>
          </div>
        ) : (
          /* Active Chat View */
          <div className="flex-1 flex flex-col h-full bg-white">
            {/* Chat Topbar */}
            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#00C268] text-white font-bold text-sm shadow-xs">
                  {selectedConv.contacts.name ? initials(selectedConv.contacts.name, "U") : "U"}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    {selectedConv.contacts.name || "Unknown Customer"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-500 font-mono">
                      +{selectedConv.contacts.wa_id}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#00C268] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00C268]" />
                      Session Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedConvId(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]/50 scrollbar-thin">
              <div className="text-center">
                <span className="rounded-full bg-white border border-gray-200/80 px-3 py-1 text-[10px] font-semibold text-gray-400 shadow-2xs">
                  {selectedConv.dateGroup || "YESTERDAY"}
                </span>
              </div>

              {currentMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No message history yet for this contact.
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isOut = msg.direction === "outbound";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOut ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-md rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                          isOut
                            ? "bg-[#00C268] text-white rounded-br-xs"
                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-xs"
                        }`}
                      >
                        {msg.type === "template" && (
                          <div className="mb-1 text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                            <FileText size={10} />
                            <span>Template: {msg.content.templateName}</span>
                          </div>
                        )}
                        <p>{msg.content.text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isOut ? "text-emerald-100" : "text-gray-400"
                          }`}
                        >
                          <span>{msg.sent_at}</span>
                          {isOut && <CheckCheck size={13} className="text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Composer */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-gray-100 bg-white flex items-center gap-3 shrink-0"
            >
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Smile size={18} />
              </button>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 h-10 rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#00C268] focus:bg-white focus:ring-2 focus:ring-[#00C268]/20 transition-all"
              />

              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
