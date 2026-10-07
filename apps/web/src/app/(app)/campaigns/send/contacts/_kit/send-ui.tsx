"use client";

import { useEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion } from "motion/react";
import { Check, Minus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ease } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Numbered section card used for each step of the composer. */
export function StepCard({
  step,
  title,
  description,
  complete,
  actions,
  children,
  className,
}: {
  step: number;
  title: string;
  description?: string;
  complete?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-visible", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={cn(
              "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition-colors duration-300",
              complete
                ? "bg-brand-gradient text-white shadow-glow"
                : "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {complete ? (
                <motion.span
                  key="done"
                  initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  <Check size={17} strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span
                  key="num"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {step}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  );
}

/** Horizontal step tracker with an animated gradient fill. */
export function StepProgress({ steps }: { steps: { label: string; complete: boolean }[] }) {
  const done = steps.filter((s) => s.complete).length;
  const pct = steps.length ? (done / steps.length) * 100 : 0;
  const current = steps.findIndex((s) => !s.complete);

  return (
    <div className="mb-6 rounded-2xl border border-border/80 bg-white/80 p-4 shadow-soft backdrop-blur sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-foreground">
          {done === steps.length ? "Everything looks good" : "Set up your campaign"}
        </span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 tabular-nums">
          {done}/{steps.length} complete
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease }}
        />
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold transition-colors",
              s.complete ? "text-brand-700" : i === current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] transition-all duration-300",
                s.complete
                  ? "bg-brand-gradient text-white"
                  : i === current
                    ? "bg-white text-brand-700 ring-2 ring-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s.complete ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Number that tweens from its previous value to the next one — for counts that
 * change while the user works (selection totals, live delivery stats).
 */
export function RollingNumber({
  value,
  className,
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const prev = useRef(0);
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.45,
      ease,
      onUpdate: (v) => setDisplay(format(v)),
    });
    prev.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={cn("tabular-nums", className)}>{display}</span>;
}

/** Visual checkbox (the clickable element is its parent row/button). */
export function CheckMark({
  checked,
  indeterminate,
  disabled,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const on = checked || indeterminate;
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-200",
        on ? "border-transparent bg-brand-gradient text-white shadow-[0_2px_8px_-2px_rgba(131,58,180,0.55)]" : "border-input bg-white",
        disabled && "opacity-40",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 26 }}
          >
            {indeterminate && !checked ? <Minus size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Removable selection chips with an overflow counter. */
export function ChipTray({
  items,
  onRemove,
  onClear,
  max = 24,
  emptyLabel,
  label,
}: {
  items: { id: string; label: string; color?: string | null }[];
  onRemove: (id: string) => void;
  onClear: () => void;
  max?: number;
  emptyLabel: string;
  label: string;
}) {
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;

  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">{label}</span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-white hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Clear all
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <motion.ul layout className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, ease }}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-white py-1 pl-2.5 pr-1 text-xs font-semibold text-brand-800 shadow-[0_1px_2px_rgba(40,16,70,0.05)]"
              >
                {item.color && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                )}
                <span className="truncate">{item.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-brand-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X size={12} />
                </button>
              </motion.li>
            ))}
            {overflow > 0 && (
              <motion.li
                key="__overflow"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center rounded-full bg-brand-gradient px-2.5 py-1 text-xs font-bold text-white"
              >
                +{overflow.toLocaleString()} more
              </motion.li>
            )}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}

/** Small "x of y" style info row. */
export function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-sm font-semibold text-foreground">{children}</span>
    </div>
  );
}
