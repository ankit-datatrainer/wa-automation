"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ease } from "@/components/motion";
import { cn, initials } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Avatar                                                                     */
/* -------------------------------------------------------------------------- */

// Brand-family gradients so each contact gets a stable, distinguishable avatar.
const AVATAR_GRADIENTS = [
  "from-[#6d28d9] via-[#833ab4] to-[#c13584]",
  "from-[#833ab4] to-[#e1306c]",
  "from-[#c13584] via-[#e1306c] to-[#f77737]",
  "from-[#5b21b6] to-[#9a4fd0]",
  "from-[#9a4fd0] via-[#c13584] to-[#e1306c]",
  "from-[#e1306c] to-[#f77737]",
  "from-[#6c2d96] via-[#833ab4] to-[#b57be0]",
];

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ContactAvatar({
  name,
  waId,
  seed,
  size = "md",
  online,
  className,
}: {
  name: string | null | undefined;
  waId: string | null | undefined;
  seed?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Shows a small "session open" dot on the rim. */
  online?: boolean;
  className?: string;
}) {
  const gradient = AVATAR_GRADIENTS[hash(seed ?? waId ?? name ?? "?") % AVATAR_GRADIENTS.length];
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-11 w-11 text-sm",
    lg: "h-12 w-12 text-sm",
    xl: "h-20 w-20 text-2xl",
  } as const;
  const dot = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
    xl: "h-4 w-4",
  } as const;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-full bg-gradient-to-br font-display font-semibold text-white shadow-[0_4px_14px_-4px_rgba(131,58,180,0.55)] ring-2 ring-white",
          gradient,
          sizes[size],
        )}
      >
        {initials(name, waId?.slice(-2) ?? "?")}
      </span>
      {online && (
        <span
          title="24-hour window open"
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500",
            dot[size],
          )}
        />
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal shell                                                                */
/* -------------------------------------------------------------------------- */

export function ModalShell({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  size = "md",
  children,
  footer,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  size?: "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Callers usually pass an inline closure; keep the latest one without
  // re-running the open effect (which would steal focus on every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape closes; focus moves into the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])") ??
        panel.querySelector<HTMLElement>("button:not([disabled])");
      target?.focus();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const widths = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-5xl" } as const;

  // Portal to <body> so transformed / overflow-hidden ancestors (page enter
  // animations, the inbox card) can never clip or re-anchor the fixed overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-brand-900/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease }}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border/80 bg-white shadow-lift sm:rounded-3xl",
              widths[size],
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-50/90 to-transparent"
            />
            <div className="relative flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6">
              {Icon && (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  <Icon size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className={cn(
                "relative min-h-0 flex-1 overflow-y-auto px-5 pb-5 scrollbar-thin sm:px-6",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="relative flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3.5 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Selectable row with a check indicator, used by the tag/group/agent pickers. */
export function SelectRow({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60",
        selected
          ? "border-brand-300 bg-brand-50/80 shadow-[0_0_0_3px_rgba(131,58,180,0.08)]"
          : "border-border/80 bg-white hover:border-brand-200 hover:bg-brand-50/40",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <span
        aria-hidden
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all",
          selected ? "border-transparent bg-brand-gradient text-white" : "border-border bg-white",
        )}
      >
        {selected && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </motion.button>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground/90">
        {children}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Debounces a fast-changing value (search boxes). */
export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** SSR-safe media query subscription. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Closes a popover when the pointer goes down outside `ref`. */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOutside();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, active, onOutside]);
}

export const popoverMotion = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.18, ease },
} as const;
