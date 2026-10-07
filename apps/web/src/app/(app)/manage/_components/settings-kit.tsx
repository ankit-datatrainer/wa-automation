"use client";

/**
 * Building blocks shared by the Manage + Settings pages: section cards, a
 * sticky save bar, copy buttons, masked secrets, code blocks, stat tiles and
 * an animated modal. Kept inside this route group so other areas stay
 * independent of it.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Eye, EyeOff, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedNumber, ease } from "@/components/motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ clipboard */

export async function copyToClipboard(value: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
    return true;
  } catch {
    toast.error("Could not access the clipboard");
    return false;
  }
}

/** Icon button that copies `value` and briefly morphs into a check mark. */
export function CopyButton({
  value,
  label = "Copy",
  toastLabel,
  className,
  showLabel = false,
  variant = "ghost",
}: {
  value: string;
  label?: string;
  toastLabel?: string;
  className?: string;
  showLabel?: boolean;
  variant?: "ghost" | "outline" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = async () => {
    if (!value) return;
    if (await copyToClipboard(value, toastLabel)) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? "sm" : "icon"}
      onClick={onCopy}
      disabled={!value}
      aria-label={showLabel ? undefined : label}
      className={cn(!showLabel && "h-8 w-8 rounded-lg", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "done" : "copy"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="grid place-items-center"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
        </motion.span>
      </AnimatePresence>
      {showLabel && (copied ? "Copied" : label)}
    </Button>
  );
}

/* --------------------------------------------------------------- secret value */

/**
 * Read-only display for a stored secret: masked by default, with an eye toggle
 * to reveal it and a copy button.
 */
export function SecretValue({
  value,
  label,
  masked = true,
  copyLabel,
  className,
}: {
  value: string;
  label: string;
  masked?: boolean;
  copyLabel?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(!masked);
  const shown = visible ? value : "•".repeat(Math.min(Math.max(value.length, 12), 32));

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-xl border bg-brand-50/40 py-1 pl-3.5 pr-1",
        className,
      )}
    >
      <code
        aria-label={label}
        className={cn(
          "min-w-0 flex-1 truncate font-mono text-xs text-foreground/90",
          !visible && "tracking-[0.15em]",
        )}
      >
        {value ? shown : "—"}
      </code>
      {masked && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </Button>
      )}
      <CopyButton value={value} label={`Copy ${label}`} toastLabel={copyLabel} className="shrink-0" />
    </div>
  );
}

/* --------------------------------------------------------------- code block */

export function CodeBlock({
  code,
  language,
  title,
  className,
}: {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-[#fcfaff]", className)}>
      <div className="flex items-center justify-between gap-2 border-b bg-white/80 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-pink/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-400/70" />
          </span>
          <span className="truncate text-xs font-semibold text-muted-foreground">
            {title ?? language}
          </span>
        </div>
        <CopyButton value={code} label="Copy code" toastLabel="Code copied" />
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-brand-900">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------ section card */

export function SettingsSection({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  delay = 0,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      className={cn("min-w-0", className)}
    >
      <Card className="h-full overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-brand-100">
                <Icon size={18} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        <div className={cn("p-5 sm:p-6", contentClassName)}>{children}</div>
      </Card>
    </motion.section>
  );
}

/* --------------------------------------------------------- sticky save bar */

export function StickySaveBar({
  visible,
  saving,
  onSave,
  onDiscard,
  message = "You have unsaved changes",
  saveLabel = "Save changes",
  formId,
}: {
  visible: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard: () => void;
  message?: string;
  saveLabel?: string;
  /** When set, the save button submits that form instead of calling onSave. */
  formId?: string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          className="sticky bottom-4 z-30 mt-6"
          role="region"
          aria-label="Unsaved changes"
        >
          <div className="glass mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-white/90 px-4 py-3 shadow-lift">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-pink/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-pink" />
              </span>
              {message}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
                Discard
              </Button>
              <Button
                type={formId ? "submit" : "button"}
                form={formId}
                size="sm"
                loading={saving}
                onClick={formId ? undefined : onSave}
              >
                {saveLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------- stat tile */

export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  hint,
  tone = "brand",
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null | undefined;
  format?: (n: number) => string;
  hint?: string;
  tone?: "brand" | "soft" | "success" | "danger" | "warning";
  loading?: boolean;
}) {
  const tones = {
    brand: "bg-brand-gradient text-white shadow-glow",
    soft: "bg-brand-50 text-primary ring-1 ring-brand-100",
    success: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
    danger: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
    warning: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  } as const;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
      <Card className="flex items-center gap-4 p-5 hover:shadow-lift">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tones[tone])}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-bold tracking-tight">
            {loading || value == null ? (
              <span className="text-muted-foreground/60">—</span>
            ) : (
              <AnimatedNumber value={value} format={format} />
            )}
          </p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Callers usually pass an inline closure; keep the latest without re-running
  // the focus effect (which would yank focus on every parent render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the dialog so keyboard users land inside it.
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button:not([data-close])",
      );
      (target ?? panelRef.current)?.focus();
    }, 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

  // Portalled to <body> so a transformed ancestor (the page transition)
  // can't become the containing block for the fixed overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-brand-900/25 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.3, ease }}
            className={cn(
              "relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border bg-white shadow-lift outline-none sm:rounded-3xl",
              widths[size],
            )}
          >
            <div aria-hidden className="h-1 w-full bg-brand-gradient" />
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              <button
                type="button"
                data-close
                onClick={onClose}
                aria-label="Close dialog"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X size={18} />
              </button>
            </div>
            {children ? <div className="px-6 pb-6 pt-2">{children}</div> : <div className="h-4" />}
            {footer && (
              <div className="flex flex-wrap justify-end gap-2 border-t bg-muted/30 px-6 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/* ------------------------------------------------------------- misc bits */

/** A labelled key/value row with optional copy action. */
export function InfoRow({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copy?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "flex min-w-0 items-center gap-1 text-right text-sm font-semibold",
          mono && "font-mono text-xs",
        )}
      >
        <span className="truncate">{value}</span>
        {copy && <CopyButton value={copy} label={`Copy ${label}`} />}
      </dd>
    </div>
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const ratio = value.length / max;
  return (
    <span
      className={cn(
        "tabular-nums text-[11px] font-medium",
        ratio >= 1 ? "text-destructive" : ratio > 0.85 ? "text-amber-600" : "text-muted-foreground",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDateTime(iso: string | null | undefined, fallback = "—") {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined, fallback = "—") {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/** Relative "3 days ago" style label. */
export function timeAgo(iso: string | null | undefined, fallback = "Never") {
  if (!iso) return fallback;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return fallback;
  const diff = (Date.now() - then) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = diff;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return rtf.format(-Math.round(value), unit);
    value /= size;
  }
  return fallback;
}
