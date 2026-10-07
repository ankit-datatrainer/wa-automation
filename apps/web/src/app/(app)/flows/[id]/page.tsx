"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Eye,
  Flag,
  Layers,
  PencilLine,
  PlayCircle,
  Rocket,
  Save,
  Undo2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, FadeIn, SegmentedTabs, motion, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useChatbots } from "../../chatbots/_components/data";
import { triggerMeta } from "../../chatbots/_components/triggers";
import { AddStepMenu, FlowPreview, StepItem } from "./flow-parts";
import {
  buildEdges,
  type Flow,
  type FlowNode,
  hydrateNodes,
  NODE_TYPES,
  newNodeId,
  nodeIssue,
  str,
  variablesBefore,
} from "./flow-model";

type PanelTab = "add" | "preview";

/**
 * Linear flow editor: steps run top to bottom, with edges kept in step with the
 * ordering (conditions can end the flow or jump on false). A free-form canvas
 * can replace this without changing the stored definition shape.
 */
export default function FlowEditorPage() {
  const params = useParams<{ id: string }>();
  const flowId = params.id;
  const queryClient = useQueryClient();
  const chatbots = useChatbots();

  const [name, setName] = useState("");
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [dirty, setDirty] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelTab>("add");

  // Edits made while a save is in flight must keep the page dirty.
  const dirtyRef = useRef(false);
  const editVersion = useRef(0);

  const markDirty = useCallback(() => {
    editVersion.current += 1;
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const flow = useQuery({
    queryKey: ["flow", flowId],
    queryFn: () => api.get<Flow>(`/flows/${flowId}`),
  });

  // Hydrate from the server, but never clobber unsaved local edits.
  useEffect(() => {
    if (!flow.data || dirtyRef.current) return;
    setName(flow.data.name);
    setNodes(hydrateNodes(flow.data.definition));
  }, [flow.data]);

  const nameError =
    name.trim().length < 2 ? "Name needs at least 2 characters" : name.trim().length > 120 ? "Name is too long" : null;

  const definition = () => ({
    nodes: nodes.map((node, index) => ({ ...node, position: { x: 0, y: index * 160 } })),
    edges: buildEdges(nodes),
  });

  const afterWrite = (version: number, patch: Partial<Flow>) => {
    if (editVersion.current === version) {
      dirtyRef.current = false;
      setDirty(false);
    }
    queryClient.setQueryData<Flow>(["flow", flowId], (old) => (old ? { ...old, ...patch } : old));
    void queryClient.invalidateQueries({ queryKey: ["flows"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), definition: definition() };
      return api.patch(`/flows/${flowId}`, payload).then(() => payload);
    },
    onMutate: () => editVersion.current,
    onSuccess: (payload, _vars, version) => {
      toast.success("Flow saved");
      afterWrite(version ?? -1, payload);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the flow"),
  });

  const setStatus = useMutation({
    mutationFn: (status: "published" | "draft") => {
      // Publishing saves pending edits in the same request.
      const payload =
        status === "published"
          ? { name: name.trim(), definition: definition(), status }
          : { status };
      return api.patch(`/flows/${flowId}`, payload).then(() => payload);
    },
    onMutate: () => editVersion.current,
    onSuccess: (payload, status, version) => {
      toast.success(status === "published" ? "Flow published" : "Flow moved back to draft");
      if (status === "published") afterWrite(version ?? -1, payload);
      else {
        queryClient.setQueryData<Flow>(["flow", flowId], (old) => (old ? { ...old, status } : old));
        void queryClient.invalidateQueries({ queryKey: ["flows"] });
      }
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update the status"),
  });

  const canSave = !nameError && !save.isPending && !setStatus.isPending;

  // Cmd/Ctrl+S saves; leaving with unsaved edits asks first.
  const saveRef = useRef<() => void>(() => undefined);
  saveRef.current = () => {
    if (!canSave) {
      if (nameError) toast.error(nameError);
      return;
    }
    save.mutate();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // ---------------------------------------------------------------- editing
  const insertNode = (type: string, at?: number) => {
    const node: FlowNode = { id: newNodeId(nodes.length), type, position: { x: 0, y: 0 }, data: {} };
    setNodes((current) => {
      const index = at === undefined ? current.length : at;
      return [...current.slice(0, index), node, ...current.slice(index)];
    });
    setHighlightId(node.id);
    markDirty();
  };

  const updateNode = (id: string, data: Record<string, unknown>) => {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node)),
    );
    markDirty();
  };

  const removeNode = (id: string) => {
    setNodes((current) =>
      current
        .filter((node) => node.id !== id)
        // Conditions that jumped to the removed step fall back to "continue".
        .map((node) =>
          node.type === "condition" && node.data.falseTarget === id
            ? { ...node, data: { ...node.data, falseTarget: "" } }
            : node,
        ),
    );
    markDirty();
  };

  const duplicateNode = (id: string) => {
    const index = nodes.findIndex((n) => n.id === id);
    const source = nodes[index];
    if (!source) return;
    const copy: FlowNode = { ...source, id: newNodeId(nodes.length), data: { ...source.data } };
    setNodes((current) => {
      const at = current.findIndex((n) => n.id === id);
      return [...current.slice(0, at + 1), copy, ...current.slice(at + 1)];
    });
    setHighlightId(copy.id);
    markDirty();
  };

  const moveNode = (id: string, direction: -1 | 1) => {
    setNodes((current) => {
      const index = current.findIndex((n) => n.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setHighlightId(id);
    markDirty();
  };

  const reorder = (ids: string[]) => {
    setNodes((current) => {
      const byId = new Map(current.map((n) => [n.id, n]));
      return ids.map((id) => byId.get(id)).filter((n): n is FlowNode => Boolean(n));
    });
    markDirty();
  };

  const discard = () => {
    if (!flow.data) return;
    dirtyRef.current = false;
    setDirty(false);
    setName(flow.data.name);
    setNodes(hydrateNodes(flow.data.definition));
    toast.message("Changes discarded");
  };

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 1600);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const issues = useMemo(() => nodes.filter((n) => nodeIssue(n)), [nodes]);
  const attachedBots = (chatbots.data?.data ?? []).filter((bot) => bot.flow_id === flowId);
  const status = flow.data?.status ?? "draft";
  const isPublished = status === "published";

  // ---------------------------------------------------------------- states
  if (flow.isLoading) {
    return (
      <>
        <PageHeader />
        <Skeleton className="mb-6 h-20" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </>
    );
  }

  // Only replace the editor when there is nothing to edit; a failed background
  // refetch must not hide the editor (and its unsaved changes).
  if (!flow.data) {
    return (
      <>
        <PageHeader title="Flow not available" />
        <ErrorState
          message={
            flow.error instanceof ApiClientError && flow.error.status === 404
              ? "This flow doesn't exist or was deleted."
              : "Could not load this flow."
          }
          onRetry={() => void flow.refetch()}
        />
        <div className="mt-4 flex justify-center">
          <Link href="/flows" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft size={16} />
            Back to flows
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader />

      {/* ------------------------------------------------ toolbar */}
      <div className="sticky top-0 z-20 -mx-1 mb-6 px-1 pt-1">
        <FadeIn y={-8}>
          <div className="glass flex flex-col gap-3 rounded-2xl border border-border/80 p-3 shadow-soft sm:p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link
                href="/flows"
                aria-label="Back to flows"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white text-muted-foreground transition hover:border-brand-200 hover:text-primary"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="relative min-w-0 flex-1">
                <label htmlFor="flow-name" className="sr-only">
                  Flow name
                </label>
                <input
                  id="flow-name"
                  value={name}
                  maxLength={120}
                  aria-invalid={Boolean(nameError)}
                  onChange={(e) => {
                    setName(e.target.value);
                    markDirty();
                  }}
                  className={cn(
                    "w-full rounded-xl border border-transparent bg-transparent py-1.5 pl-2 pr-8 font-display text-lg font-bold tracking-tight outline-none transition hover:border-border focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 sm:text-xl",
                    nameError && "border-destructive/60",
                  )}
                />
                <PencilLine
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                {nameError && <p className="mt-1 pl-2 text-xs font-medium text-destructive">{nameError}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isPublished ? "success" : "neutral"}>
                {isPublished ? <Rocket size={12} /> : <PencilLine size={12} />}
                {isPublished ? "Published" : "Draft"}
              </Badge>
              <Badge tone="brand">
                <Layers size={12} />
                {nodes.length} {nodes.length === 1 ? "step" : "steps"}
              </Badge>
              <AnimatePresence>
                {issues.length > 0 && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setHighlightId(issues[0]!.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
                  >
                    <AlertTriangle size={12} />
                    {issues.length} to finish
                  </motion.button>
                )}
                {dirty && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-70" />
                      <span className="relative h-2 w-2 rounded-full bg-primary" />
                    </span>
                    Unsaved
                  </motion.span>
                )}
              </AnimatePresence>

              <div className="ml-auto flex items-center gap-2 lg:ml-2">
                {dirty && (
                  <Button variant="ghost" size="sm" onClick={discard} aria-label="Discard changes">
                    <Undo2 size={15} />
                    <span className="hidden sm:inline">Discard</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  loading={save.isPending}
                  disabled={!dirty || !canSave}
                  onClick={() => save.mutate()}
                  title="Save (Ctrl/⌘ + S)"
                >
                  {!save.isPending && <Save size={15} />}
                  Save
                </Button>
                {isPublished ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={setStatus.isPending}
                    disabled={!canSave}
                    title="Saving a published flow updates it live; unpublish to mark it as a draft."
                    onClick={() => setStatus.mutate("draft")}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={setStatus.isPending}
                    disabled={!canSave || nodes.length === 0}
                    onClick={() => setStatus.mutate("published")}
                  >
                    {!setStatus.isPending && <Rocket size={15} />}
                    {dirty ? "Save & publish" : "Publish"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------------------------ canvas */}
        <div className="min-w-0">
          <FadeIn delay={0.05}>
            <Card className="relative overflow-hidden p-4 sm:p-5">
              <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" />
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  <PlayCircle size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Start</p>
                  {chatbots.isLoading ? (
                    <Skeleton className="mt-1 h-4 w-48" />
                  ) : attachedBots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No chatbot runs this flow yet.{" "}
                      <Link href="/chatbots/mine" className="font-semibold text-primary hover:underline">
                        Attach it to a chatbot
                      </Link>{" "}
                      to choose its trigger.
                    </p>
                  ) : (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {attachedBots.map((bot) => {
                        const trigger = triggerMeta(bot.trigger_type);
                        const keywords = bot.trigger_config?.keywords ?? [];
                        return (
                          <li key={bot.id}>
                            <Link
                              href="/chatbots/mine"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100"
                            >
                              <Bot size={12} />
                              {bot.name}
                              <span className="text-brand-700/70">
                                · {trigger.label}
                                {keywords.length ? `: ${keywords.slice(0, 3).join(", ")}` : ""}
                              </span>
                              {bot.is_active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          </FadeIn>

          <Connector>
            <AddStepMenu label="Insert step at the start" onAdd={(type) => insertNode(type, 0)} />
          </Connector>

          {nodes.length === 0 ? (
            <FadeIn delay={0.1}>
              <Card className="border-dashed">
                <EmptyState
                  icon={Zap}
                  title="This flow is empty"
                  description="Add your first step — most flows start with a message or a question."
                  action={<AddStepMenu variant="button" label="Add first step" onAdd={(type) => insertNode(type)} />}
                />
              </Card>
            </FadeIn>
          ) : (
            <Reorder.Group axis="y" values={nodes.map((n) => n.id)} onReorder={reorder} className="m-0 p-0">
              <AnimatePresence initial={false}>
                {nodes.map((node, index) => (
                  <StepItem
                    key={node.id}
                    node={node}
                    index={index}
                    total={nodes.length}
                    nodes={nodes}
                    variables={variablesBefore(nodes, index)}
                    highlight={highlightId === node.id}
                    onChange={(data) => updateNode(node.id, data)}
                    onRemove={() => removeNode(node.id)}
                    onDuplicate={() => duplicateNode(node.id)}
                    onMove={(direction) => moveNode(node.id, direction)}
                    after={
                      index < nodes.length - 1 ? (
                        <Connector branch={node.type === "condition" && Boolean(str(node.data.falseTarget))}>
                          <AddStepMenu
                            label={`Insert step after step ${index + 1}`}
                            onAdd={(type) => insertNode(type, index + 1)}
                          />
                        </Connector>
                      ) : null
                    }
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}

          {nodes.length > 0 && (
            <>
              <Connector />
              <div className="flex flex-col items-center gap-3">
                <AddStepMenu variant="button" label="Add step" onAdd={(type) => insertNode(type)} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Flag size={12} />
                  Flow ends
                </span>
              </div>
            </>
          )}
        </div>

        {/* ------------------------------------------------ side panel */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <FadeIn delay={0.1}>
            <Card className="p-4">
              <SegmentedTabs<PanelTab>
                layoutId="flow-panel"
                className="mb-4 flex w-full [&>button]:flex-1"
                value={panel}
                onChange={setPanel}
                tabs={[
                  {
                    value: "add",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={14} />
                        Steps
                      </span>
                    ),
                  },
                  {
                    value: "preview",
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Eye size={14} />
                        Preview
                      </span>
                    ),
                  },
                ]}
              />
              <AnimatePresence mode="wait" initial={false}>
                {panel === "add" ? (
                  <motion.div
                    key="add"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, ease }}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Click to add to the end
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {NODE_TYPES.map(({ type, label, icon: Icon, accent }) => (
                        <motion.button
                          key={type}
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => insertNode(type)}
                          className="flex flex-col items-start gap-2 rounded-xl border bg-white p-3 text-left text-sm font-semibold shadow-[0_1px_2px_rgba(40,16,70,0.04)] transition-colors hover:border-brand-200 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white", accent)}>
                            <Icon size={15} />
                          </span>
                          {label}
                        </motion.button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl bg-brand-50/60 p-3 text-xs leading-relaxed text-muted-foreground">
                      <p className="mb-1 font-semibold text-foreground">Tips</p>
                      Use <code className="font-mono text-brand-700">{"{{contact.name}}"}</code> or any saved
                      answer like <code className="font-mono text-brand-700">{"{{order_id}}"}</code> in
                      messages. Drag the grip to reorder. Press{" "}
                      <kbd className="rounded border bg-white px-1 font-mono">Ctrl</kbd>/
                      <kbd className="rounded border bg-white px-1 font-mono">⌘</kbd>+
                      <kbd className="rounded border bg-white px-1 font-mono">S</kbd> to save.
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease }}
                  >
                    <FlowPreview nodes={nodes} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </FadeIn>
        </aside>
      </div>
    </>
  );
}

/** Vertical connector between steps, with an optional insert button. */
function Connector({ children, branch }: { children?: React.ReactNode; branch?: boolean }) {
  return (
    <div className="relative flex h-14 items-center justify-center">
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(131,58,180,0.35)_50%,transparent_50%)] bg-[length:2px_8px]"
      />
      {branch && (
        <span className="absolute left-1/2 top-1/2 ml-6 -translate-y-1/2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
          if true
        </span>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
