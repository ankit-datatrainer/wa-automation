"use client";

import { Reorder, useDragControls } from "motion/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCheck,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, ease } from "@/components/motion";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  END_TARGET,
  type FlowNode,
  NODE_TYPES,
  nodeIssue,
  nodeMeta,
  str,
} from "./flow-model";

// ---------------------------------------------------------------- add-step menu
export function AddStepMenu({
  onAdd,
  variant = "inline",
  label = "Add step",
}: {
  onAdd: (type: string) => void;
  variant?: "inline" | "button";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      {variant === "inline" ? (
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full border bg-white text-muted-foreground shadow-soft transition-all hover:scale-110 hover:border-brand-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            open && "scale-110 border-brand-200 text-primary",
          )}
        >
          <Plus size={14} />
        </button>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-primary hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Plus size={16} />
          {label}
        </button>
      )}
      <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2">
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease }}
            className="pointer-events-auto rounded-2xl border bg-white p-1.5 shadow-lift"
          >
            {NODE_TYPES.map(({ type, label: itemLabel, description, icon: Icon, accent }) => (
              <button
                key={type}
                type="button"
                role="menuitem"
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
              >
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white", accent)}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{itemLabel}</span>
                  <span className="block truncate text-xs text-muted-foreground">{description}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- step card
const TOKENS = ["{{contact.name}}", "{{contact.phone}}"];
const DELAY_UNITS = [
  { value: "seconds", label: "seconds", factor: 1 },
  { value: "minutes", label: "minutes", factor: 60 },
  { value: "hours", label: "hours", factor: 3600 },
] as const;

export function StepItem({
  node,
  index,
  total,
  nodes,
  variables,
  highlight,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  after,
}: {
  after?: React.ReactNode;
  node: FlowNode;
  index: number;
  total: number;
  nodes: FlowNode[];
  variables: string[];
  highlight: boolean;
  onChange: (data: Record<string, unknown>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const meta = nodeMeta(node.type);
  const Icon = meta.icon;
  const issue = nodeIssue(node);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlight) return;
    const frame = requestAnimationFrame(() =>
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [highlight]);

  const insertToken = (token: string) => {
    const el = textRef.current;
    const current = str(node.data.text);
    if (!el) {
      onChange({ text: current + token });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    onChange({ text: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const tokens = [...TOKENS, ...variables.map((v) => `{{${v}}}`)];

  return (
    <Reorder.Item
      value={node.id}
      dragListener={false}
      dragControls={controls}
      className="relative list-none"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, ease }}
      whileDrag={{ scale: 1.02, boxShadow: "0 24px 48px -16px rgba(98,37,160,0.35)", zIndex: 20 }}
    >
      <div
        ref={cardRef}
        id={`step-${node.id}`}
        className={cn(
          "group relative rounded-2xl border bg-white shadow-soft transition-all duration-300 hover:shadow-lift",
          highlight ? "border-primary/50 ring-4 ring-primary/10" : "border-border/80",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            aria-label={`Drag to reorder step ${index + 1}`}
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            className="hidden h-8 w-6 cursor-grab touch-none place-items-center rounded-md text-muted-foreground/70 transition hover:bg-muted hover:text-foreground active:cursor-grabbing sm:grid"
          >
            <GripVertical size={16} />
          </button>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-soft",
              meta.accent,
            )}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
              {meta.label}
            </p>
            <p className="hidden truncate font-mono text-[10px] text-muted-foreground/80 sm:block">{node.id}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton label="Move step up" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUp size={15} />
            </IconButton>
            <IconButton label="Move step down" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDown size={15} />
            </IconButton>
            <IconButton label="Duplicate step" onClick={onDuplicate}>
              <Copy size={14} />
            </IconButton>
            <IconButton label="Remove step" onClick={onRemove} danger>
              <Trash2 size={14} />
            </IconButton>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {(node.type === "send_message" || node.type === "ask_question") && (
            <>
              <Textarea
                ref={textRef}
                rows={3}
                aria-label={node.type === "ask_question" ? "Question text" : "Message text"}
                placeholder={
                  node.type === "ask_question"
                    ? "What should the bot ask? e.g. Please share your order ID."
                    : "What should the bot say? e.g. Hi {{contact.name}}, thanks for reaching out!"
                }
                value={str(node.data.text)}
                onChange={(e) => onChange({ text: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Insert
                </span>
                {tokens.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </>
          )}

          {node.type === "ask_question" && (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <label htmlFor={`${node.id}-var`} className="shrink-0 text-xs font-semibold text-muted-foreground">
                Save the reply as
              </label>
              <Input
                id={`${node.id}-var`}
                className="h-10 font-mono text-sm"
                placeholder="order_id"
                value={str(node.data.variable)}
                onChange={(e) =>
                  onChange({ variable: e.target.value.replace(/[^\w]/g, "_").toLowerCase() })
                }
              />
            </div>
          )}

          {node.type === "condition" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_1fr]">
                <Input
                  aria-label="Variable to check"
                  list={`${node.id}-vars`}
                  className="h-10 font-mono text-sm"
                  placeholder="Variable, e.g. order_id"
                  value={str(node.data.variable)}
                  onChange={(e) => onChange({ variable: e.target.value })}
                />
                <datalist id={`${node.id}-vars`}>
                  {variables.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <Select
                  aria-label="Operator"
                  className="h-10"
                  value={str(node.data.operator) || "equals"}
                  onChange={(e) => onChange({ operator: e.target.value })}
                >
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                  <option value="starts_with">starts with</option>
                  <option value="is_empty">is empty</option>
                </Select>
                {str(node.data.operator) !== "is_empty" && (
                  <Input
                    aria-label="Value to compare"
                    className="h-10"
                    placeholder="Value"
                    value={str(node.data.value)}
                    onChange={(e) => onChange({ value: e.target.value })}
                  />
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 rounded-xl bg-brand-50/50 p-3 text-xs sm:grid-cols-2">
                <p className="flex items-center gap-2 font-medium text-emerald-700">
                  <CheckCheck size={14} />
                  If true → continue to the next step
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor={`${node.id}-false`} className="shrink-0 font-medium text-rose-700">
                    If false →
                  </label>
                  <Select
                    id={`${node.id}-false`}
                    className="h-9 text-xs"
                    value={str(node.data.falseTarget)}
                    onChange={(e) => onChange({ falseTarget: e.target.value })}
                  >
                    <option value="">Continue to the next step</option>
                    <option value={END_TARGET}>End the flow</option>
                    {nodes.map((other, i) =>
                      other.id === node.id ? null : (
                        <option key={other.id} value={other.id}>
                          Jump to step {i + 1} · {nodeMeta(other.type).label}
                        </option>
                      ),
                    )}
                  </Select>
                </div>
              </div>
            </div>
          )}

          {node.type === "api_request" && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr]">
                <Select
                  aria-label="HTTP method"
                  className="h-10"
                  value={str(node.data.method) || "GET"}
                  onChange={(e) => onChange({ method: e.target.value })}
                >
                  <option>GET</option>
                  <option>POST</option>
                </Select>
                <Input
                  type="url"
                  aria-label="Request URL"
                  className="h-10"
                  placeholder="https://api.example.com/orders/{{order_id}}"
                  value={str(node.data.url)}
                  onChange={(e) => onChange({ url: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                POST sends the contact number and saved answers as JSON. Text and number fields in the JSON
                response become variables for later steps.
              </p>
            </div>
          )}

          {node.type === "delay" && <DelayField node={node} onChange={onChange} />}

          {node.type === "add_tag" && (
            <Input
              aria-label="Tag name"
              className="h-10"
              placeholder="Tag name, e.g. hot-lead"
              value={str(node.data.tag)}
              onChange={(e) => onChange({ tag: e.target.value })}
            />
          )}

          {node.type === "assign_agent" && (
            <p className="text-sm text-muted-foreground">
              Hands the conversation to the online agent with the fewest open chats.
            </p>
          )}

          {node.type === "end" && (
            <p className="text-sm text-muted-foreground">Ends the flow for this contact.</p>
          )}

          <AnimatePresence initial={false}>
            {issue && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 overflow-hidden text-xs font-medium text-amber-700"
              >
                <AlertTriangle size={13} className="shrink-0" />
                {issue}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      {after}
    </Reorder.Item>
  );
}

function DelayField({
  node,
  onChange,
}: {
  node: FlowNode;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const seconds = Number(node.data.seconds) || 0;
  const storedUnit = DELAY_UNITS.find((u) => u.value === node.data.delayUnit);
  const unit =
    storedUnit ??
    (seconds && seconds % 3600 === 0 ? DELAY_UNITS[2] : seconds && seconds % 60 === 0 ? DELAY_UNITS[1] : DELAY_UNITS[0]);
  const amount = seconds ? seconds / unit.factor : "";

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        aria-label="Wait amount"
        className="h-10 w-28"
        placeholder="30"
        value={amount}
        onChange={(e) => {
          const value = Number(e.target.value);
          onChange({ seconds: value > 0 ? Math.round(value * unit.factor) : 0, delayUnit: unit.value });
        }}
      />
      <Select
        aria-label="Wait unit"
        className="h-10 w-36"
        value={unit.value}
        onChange={(e) => {
          const next = DELAY_UNITS.find((u) => u.value === e.target.value) ?? DELAY_UNITS[0];
          const value = typeof amount === "number" ? amount : 0;
          onChange({ seconds: Math.round(value * next.factor), delayUnit: next.value });
        }}
      >
        {DELAY_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </Select>
      <span className="text-sm text-muted-foreground">then continue</span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-30",
        danger && "hover:bg-rose-50 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- preview
function renderWithTokens(text: string) {
  const parts = text.split(/(\{\{\s*[\w.]+\s*\}\})/g);
  return parts.map((part, i) =>
    /^\{\{/.test(part) ? (
      <span key={i} className="rounded bg-white/25 px-1 font-mono text-[11px]">
        {part.replace(/\s/g, "")}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** A WhatsApp-style walk-through of what the customer sees, in order. */
export function FlowPreview({ nodes }: { nodes: FlowNode[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex items-center gap-2.5 bg-brand-gradient px-4 py-3 text-white">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
          <Bot size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">Chatbot preview</p>
          <p className="text-[11px] text-white/80">Linear walk-through · true branches</p>
        </div>
      </div>
      <div className="scrollbar-thin max-h-[52vh] space-y-2 overflow-y-auto bg-[linear-gradient(180deg,#faf5ff,#fff)] p-3">
        {nodes.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Add steps to see the conversation here.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {nodes.map((node, i) => (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease, delay: Math.min(i, 10) * 0.03 }}
              >
                <PreviewLine node={node} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function PreviewLine({ node }: { node: FlowNode }) {
  const chip = (text: string) => (
    <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-center text-[11px] font-medium text-muted-foreground shadow-soft ring-1 ring-border">
      {text}
    </p>
  );
  switch (node.type) {
    case "send_message":
    case "ask_question": {
      const text = str(node.data.text).trim();
      return (
        <div className="space-y-2">
          <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-brand-gradient px-3 py-2 text-xs leading-relaxed text-white shadow-soft">
            {text ? renderWithTokens(text) : <span className="italic text-white/70">Empty message</span>}
          </div>
          {node.type === "ask_question" && (
            <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-md bg-white px-3 py-2 text-xs text-muted-foreground shadow-soft ring-1 ring-border">
              Customer replies → saved as{" "}
              <span className="font-mono text-brand-700">{str(node.data.variable).trim() || "answer"}</span>
            </div>
          )}
        </div>
      );
    }
    case "condition":
      return chip(
        `If ${str(node.data.variable) || "…"} ${(str(node.data.operator) || "equals").replace("_", " ")}${
          str(node.data.operator) === "is_empty" ? "" : ` "${str(node.data.value)}"`
        }`,
      );
    case "api_request":
      return chip(`${str(node.data.method) || "GET"} ${str(node.data.url) || "…"}`);
    case "delay": {
      const seconds = Number(node.data.seconds) || 0;
      return chip(
        seconds >= 3600 && seconds % 3600 === 0
          ? `Waits ${seconds / 3600}h`
          : seconds >= 60 && seconds % 60 === 0
            ? `Waits ${seconds / 60} min`
            : `Waits ${seconds}s`,
      );
    }
    case "add_tag":
      return chip(`Tagged “${str(node.data.tag) || "…"}”`);
    case "assign_agent":
      return chip("Handed over to an agent");
    case "end":
      return chip("Conversation ended");
    default:
      return chip(node.type);
  }
}
