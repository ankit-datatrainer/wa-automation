"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BookOpen,
  Plus,
  Search,
  Settings2,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion, SegmentedTabs, Spotlight, ease } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ChatbotEditor } from "./chatbot-editor";
import { type Chatbot, timeAgo, useChatbots, useFlows } from "./_components/data";
import { ConfirmDialog } from "./_components/modal";
import { triggerMeta } from "./_components/triggers";

type Filter = "all" | "active" | "paused";

/**
 * Chatbot cards with search, status filter, inline activate switch and the
 * create/edit dialog. `limit` shows a compact preview (used on the overview).
 */
export function ChatbotList({ limit }: { limit?: number }) {
  const queryClient = useQueryClient();
  const chatbots = useChatbots();
  const flows = useFlows();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Chatbot | null>(null);
  const [deleting, setDeleting] = useState<Chatbot | null>(null);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["chatbots"] });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/chatbots/${id}`, { isActive }),
    onMutate: ({ id }) => setPendingToggle(id),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "Chatbot activated" : "Chatbot paused");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
    onSettled: () => setPendingToggle(null),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/chatbots/${id}`),
    onSuccess: () => {
      toast.success("Chatbot deleted");
      setDeleting(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = chatbots.data?.data ?? [];
  const flowNames = useMemo(
    () => new Map((flows.data?.data ?? []).map((f) => [f.id, f.name])),
    [flows.data],
  );

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.is_active).length,
    paused: rows.filter((r) => !r.is_active).length,
  };

  const visible = rows
    .filter((r) => (filter === "all" ? true : filter === "active" ? r.is_active : !r.is_active))
    .filter((r) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle) ||
        (r.trigger_config?.keywords ?? []).some((k) => k.toLowerCase().includes(needle))
      );
    });
  const shown = limit ? visible.slice(0, limit) : visible;

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (chatbot: Chatbot) => {
    setEditing(chatbot);
    setEditorOpen(true);
  };

  const handleToggle = (chatbot: Chatbot) => {
    const next = !chatbot.is_active;
    // Mirror the server-side runtime: an active bot without a flow does nothing.
    if (next && !chatbot.flow_id) {
      toast.info("Pick a flow for this chatbot first");
      openEdit(chatbot);
      return;
    }
    if (next && chatbot.trigger_type === "keyword" && !chatbot.trigger_config?.keywords?.length) {
      toast.info("Add at least one keyword before activating");
      openEdit(chatbot);
      return;
    }
    toggle.mutate({ id: chatbot.id, isActive: next });
  };

  if (chatbots.isError) {
    return <ErrorState message="Could not load chatbots." onRetry={() => void chatbots.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs<Filter>
          layoutId={limit ? "chatbot-filter-compact" : "chatbot-filter"}
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: <TabLabel label="All" count={counts.all} /> },
            { value: "active", label: <TabLabel label="Active" count={counts.active} /> },
            { value: "paused", label: <TabLabel label="Paused" count={counts.paused} /> },
          ]}
        />
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search chatbots"
              placeholder="Search chatbots or keywords…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={openCreate} aria-label="New chatbot" className="shrink-0">
            <Plus size={16} />
            <span className="hidden sm:inline">New chatbot</span>
          </Button>
        </div>
      </div>

      {chatbots.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: limit ? Math.min(limit, 4) : 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bot}
            title="No chatbots yet"
            description="Start from a prebuilt template in the Chatbot Library, or create one around a flow you built."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/chatbots/library" className={buttonVariants()}>
                  <BookOpen size={16} />
                  Browse the library
                </Link>
                <Button variant="outline" onClick={openCreate}>
                  <Plus size={16} />
                  New chatbot
                </Button>
              </div>
            }
          />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="Nothing matches"
            description="Try a different search or switch the status filter."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <motion.ul layout className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={true}>
            {shown.map((chatbot, index) => (
              <motion.li
                key={chatbot.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: Math.min(index, 12) * 0.04 } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              >
                <ChatbotCard
                  chatbot={chatbot}
                  flowName={chatbot.flow_id ? flowNames.get(chatbot.flow_id) : undefined}
                  toggling={pendingToggle === chatbot.id}
                  onToggle={() => handleToggle(chatbot)}
                  onEdit={() => openEdit(chatbot)}
                  onDelete={() => setDeleting(chatbot)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {limit && visible.length > limit && (
        <div className="flex justify-center">
          <Link href="/chatbots/mine" className={buttonVariants({ variant: "outline" })}>
            View all {visible.length} chatbots
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      <ChatbotEditor open={editorOpen} onClose={() => setEditorOpen(false)} chatbot={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this chatbot?"
        icon={<Trash2 size={18} />}
        description={
          <>
            <span className="font-semibold text-foreground">{deleting?.name}</span> will stop
            answering customers and its run history will be removed. The flow it uses is kept.
          </>
        }
      />
    </div>
  );
}

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="rounded-md bg-brand-100/70 px-1.5 text-[11px] font-bold text-brand-700">
        {count}
      </span>
    </span>
  );
}

function ChatbotCard({
  chatbot,
  flowName,
  toggling,
  onToggle,
  onEdit,
  onDelete,
}: {
  chatbot: Chatbot;
  flowName?: string;
  toggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const trigger = triggerMeta(chatbot.trigger_type);
  const TriggerIcon = trigger.icon;
  const keywords = chatbot.trigger_config?.keywords ?? [];
  const needsKeywords = chatbot.trigger_type === "keyword" && keywords.length === 0;
  const needsFlow = !chatbot.flow_id;

  return (
    <Spotlight
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift",
        chatbot.is_active ? "border-brand-200/80" : "border-border/80",
      )}
    >
      <div className="relative flex items-start gap-3.5">
        <span className="relative shrink-0">
          <span
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl text-white transition-all",
              chatbot.is_active ? "bg-brand-gradient shadow-glow" : "bg-gradient-to-br from-slate-300 to-slate-400",
            )}
          >
            <Bot size={22} />
          </span>
          {chatbot.is_active && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold">{chatbot.name}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {chatbot.description || "No description yet."}
          </p>
        </div>
        <Switch
          checked={chatbot.is_active}
          disabled={toggling}
          onCheckedChange={onToggle}
          aria-label={`${chatbot.is_active ? "Pause" : "Activate"} ${chatbot.name}`}
        />
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
        <Badge tone="brand">
          <TriggerIcon size={12} />
          {trigger.label}
        </Badge>
        <Badge tone={chatbot.is_active ? "success" : "neutral"}>
          {chatbot.is_active ? "Active" : "Paused"}
        </Badge>
        {keywords.slice(0, 4).map((keyword) => (
          <span
            key={keyword}
            className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground/80"
          >
            {keyword}
          </span>
        ))}
        {keywords.length > 4 && (
          <span className="text-xs font-semibold text-muted-foreground">+{keywords.length - 4}</span>
        )}
      </div>

      {(needsKeywords || needsFlow) && (
        <button
          type="button"
          onClick={onEdit}
          className="relative mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
        >
          <AlertTriangle size={14} className="shrink-0" />
          {needsFlow
            ? "No flow attached — pick one so this chatbot can reply."
            : "Add keywords so this chatbot knows when to answer."}
        </button>
      )}

      <div aria-hidden className="flex-1" />
      <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
        <div className="min-w-0 text-xs text-muted-foreground">
          {flowName ? (
            <span className="inline-flex max-w-full items-center gap-1.5">
              <Workflow size={13} className="shrink-0 text-primary" />
              <span className="truncate">{flowName}</span>
            </span>
          ) : (
            <span>Created {timeAgo(chatbot.created_at)}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {chatbot.flow_id && (
            <Link
              href={`/flows/${chatbot.flow_id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Workflow size={14} />
              Edit flow
            </Link>
          )}
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Settings for ${chatbot.name}`} onClick={onEdit}>
            <Settings2 size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-destructive hover:bg-rose-50"
            aria-label={`Delete ${chatbot.name}`}
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </Spotlight>
  );
}
