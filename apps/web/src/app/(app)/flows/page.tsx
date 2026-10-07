"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  BookOpen,
  Copy,
  FilePen,
  Kanban,
  Pencil,
  Plus,
  Rocket,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion, SegmentedTabs, Spotlight, Stagger, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  type FlowRow,
  humanize,
  timeAgo,
  useChatbots,
  useFlows,
} from "../chatbots/_components/data";
import { ConfirmDialog, Modal } from "../chatbots/_components/modal";
import { StatTile } from "../chatbots/_components/stat-tile";

type Filter = "all" | "published" | "draft";

export default function ManageFlowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const flows = useFlows();
  const chatbots = useChatbots();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("Untitled flow");
  const [deleting, setDeleting] = useState<FlowRow | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (name: string) =>
      api.post<{ id: string }>("/flows", {
        name,
        definition: { nodes: [], edges: [] },
      }),
    onSuccess: (flow) => {
      void queryClient.invalidateQueries({ queryKey: ["flows"] });
      router.push(`/flows/${flow.id}`);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the flow"),
  });

  const duplicate = useMutation({
    mutationFn: async (flow: FlowRow) => {
      const source = await api.get<{ name: string; definition: unknown }>(`/flows/${flow.id}`);
      const name = `${source.name} (copy)`.slice(0, 120);
      return api.post<{ id: string }>("/flows", { name, definition: source.definition });
    },
    onMutate: (flow) => setDuplicatingId(flow.id),
    onSuccess: () => {
      toast.success("Flow duplicated");
      void queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not duplicate the flow"),
    onSettled: () => setDuplicatingId(null),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/flows/${id}`),
    onSuccess: () => {
      toast.success("Flow deleted");
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["flows"] });
      void queryClient.invalidateQueries({ queryKey: ["chatbots"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = flows.data?.data ?? [];

  /** Which chatbots run each flow, so cards can show usage and deletes can warn. */
  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const bot of chatbots.data?.data ?? []) {
      if (!bot.flow_id) continue;
      map.set(bot.flow_id, [...(map.get(bot.flow_id) ?? []), bot.name]);
    }
    return map;
  }, [chatbots.data]);

  const published = rows.filter((r) => r.status === "published").length;
  const visible = rows
    .filter((r) => (filter === "all" ? true : filter === "published" ? r.status === "published" : r.status !== "published"))
    .filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()));

  const openCreate = () => {
    setNewName("Untitled flow");
    setCreateOpen(true);
  };
  const nameValid = newName.trim().length >= 2 && newName.trim().length <= 120;
  const deletingUsage = deleting ? (usage.get(deleting.id) ?? []) : [];

  return (
    <>
      <PageHeader
        title="Manage Flows"
        description="Conversation flows that power your chatbots — messages, questions, branches and handoffs."
        actions={
          <>
            <Link href="/chatbots/library" className={buttonVariants({ variant: "outline" })}>
              <BookOpen size={16} />
              Templates
            </Link>
            <Button onClick={openCreate}>
              <Plus size={16} />
              New flow
            </Button>
          </>
        }
      />

      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={Workflow} label="Flows" value={flows.data ? rows.length : undefined} hint="All conversation flows" />
        <StatTile icon={Rocket} label="Published" accent="success" value={flows.data ? published : undefined} hint="Ready for customers" />
        <StatTile icon={FilePen} label="Drafts" accent="orange" value={flows.data ? rows.length - published : undefined} hint="Still being edited" />
        <StatTile
          icon={Bot}
          label="In use"
          accent="pink"
          value={flows.data && chatbots.data ? rows.filter((r) => usage.has(r.id)).length : undefined}
          hint="Attached to a chatbot"
        />
      </Stagger>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs<Filter>
          layoutId="flow-filter"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
          ]}
        />
        <div className="relative sm:w-72">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search flows"
            placeholder="Search flows…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {flows.isError ? (
        <ErrorState message="Could not load flows." onRetry={() => void flows.refetch()} />
      ) : flows.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Kanban}
            title="No flows yet"
            description="Build a flow from scratch, or clone one from the Chatbot Library."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  Create your first flow
                </Button>
                <Link href="/chatbots/library" className={buttonVariants({ variant: "outline" })}>
                  Browse templates
                </Link>
              </div>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No flows match"
            description="Try another search or status."
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
        <motion.ul layout className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((flow, index) => {
              const bots = usage.get(flow.id) ?? [];
              const isPublished = flow.status === "published";
              return (
                <motion.li
                  key={flow.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: Math.min(index, 12) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                >
                  <Spotlight className="flex h-full flex-col rounded-2xl border border-border/80 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="relative flex items-start gap-3.5">
                      <span
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white",
                          isPublished ? "bg-brand-gradient shadow-glow" : "bg-gradient-to-br from-brand-300 to-brand-400",
                        )}
                      >
                        <Workflow size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/flows/${flow.id}`}
                          className="block truncate font-display text-base font-semibold hover:text-primary focus-visible:outline-none focus-visible:underline"
                        >
                          {flow.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">Updated {timeAgo(flow.updated_at)}</p>
                      </div>
                      <Badge tone={isPublished ? "success" : statusTone(flow.status)}>{humanize(flow.status)}</Badge>
                    </div>

                    <div className="relative mt-4 min-h-[2rem]">
                      {bots.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Used by</span>
                          {bots.slice(0, 2).map((name) => (
                            <Badge key={name} tone="brand">
                              <Bot size={11} />
                              <span className="max-w-[9rem] truncate">{name}</span>
                            </Badge>
                          ))}
                          {bots.length > 2 && (
                            <span className="text-xs font-semibold text-muted-foreground">+{bots.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not attached to a chatbot yet.</p>
                      )}
                    </div>

                    <div aria-hidden className="flex-1" />
                    <div className="relative mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
                      <Link
                        href={`/flows/${flow.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                      >
                        <Pencil size={14} />
                        Open editor
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        aria-label={`Duplicate ${flow.name}`}
                        loading={duplicatingId === flow.id}
                        disabled={duplicate.isPending}
                        onClick={() => duplicate.mutate(flow)}
                      >
                        {duplicatingId !== flow.id && <Copy size={15} />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive hover:bg-rose-50"
                        aria-label={`Delete ${flow.name}`}
                        onClick={() => setDeleting(flow)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </Spotlight>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New flow"
        description="Name it now — you'll add the steps in the editor."
        icon={<Workflow size={20} />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-flow-form" loading={create.isPending} disabled={!nameValid}>
              Create & open editor
            </Button>
          </>
        }
      >
        <form
          id="new-flow-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameValid) create.mutate(newName.trim());
          }}
        >
          <Field
            label="Flow name"
            required
            error={newName.trim().length > 0 && !nameValid ? "Use 2–120 characters" : undefined}
          >
            {({ id }) => (
              <Input
                id={id}
                value={newName}
                maxLength={120}
                onChange={(e) => setNewName(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this flow?"
        icon={<Trash2 size={18} />}
        description={
          <div className="space-y-2">
            <p>
              <span className="font-semibold text-foreground">{deleting?.name}</span>, its steps and
              its collected submissions will be permanently removed.
            </p>
            {deletingUsage.length > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-amber-800 ring-1 ring-inset ring-amber-200">
                {deletingUsage.length === 1 ? "1 chatbot uses" : `${deletingUsage.length} chatbots use`} this
                flow ({deletingUsage.join(", ")}). They will stop replying until you attach another flow.
              </p>
            )}
          </div>
        }
      />
    </>
  );
}
