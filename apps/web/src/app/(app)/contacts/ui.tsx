"use client";

/**
 * Small building blocks shared by the Contacts and Chat History screens:
 * avatars, tag chips, an animated modal, and a portal-based row menu that
 * cannot be clipped by the table's horizontal scroll container.
 */
import { X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string | null | undefined) => !!value && UUID_RE.test(value);

export type OptInStatus = "opted_in" | "opted_out" | "unknown";

export interface TagOption {
  id: string;
  name: string;
  color: string;
  contactCount?: number;
}

export interface GroupOption {
  id: string;
  name: string;
  description?: string | null;
  contactCount?: number;
}

/** supabase-js types embedded to-one relations as arrays; normalize both. */
export function toOne<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

export function formatPhone(waId: string | null | undefined) {
  if (!waId) return "—";
  return `+${waId}`;
}

// ---------------------------------------------------------------- avatar
const AVATAR_GRADIENTS = [
  "from-brand-500 to-brand-pink",
  "from-brand-600 to-brand-magenta",
  "from-brand-magenta to-brand-orange",
  "from-violet-500 to-brand-600",
  "from-brand-pink to-brand-orange",
  "from-brand-700 to-brand-400",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ContactAvatar({
  name,
  waId,
  seed,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  waId: string | null | undefined;
  seed?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const gradient = AVATAR_GRADIENTS[hash(seed ?? waId ?? name ?? "?") % AVATAR_GRADIENTS.length];
  const label = initials(name && name !== waId ? name : null, waId ? waId.slice(-2) : "?");
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-16 w-16 text-lg",
  } as const;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-[0_4px_12px_-4px_rgba(131,58,180,0.55)] ring-2 ring-white",
        gradient,
        sizes[size],
        className,
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------- chips
export function TagChip({
  tag,
  onRemove,
  className,
}: {
  tag: Pick<TagOption, "name" | "color">;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[10rem] items-center gap-1.5 rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold text-foreground/80",
        className,
      )}
      style={{ borderColor: `${tag.color}55`, backgroundColor: `${tag.color}12` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${tag.name}`}
          className="-mr-1 grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-white hover:text-foreground"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

const OPT_IN_LABEL: Record<OptInStatus, string> = {
  opted_in: "Opted in",
  opted_out: "Opted out",
  unknown: "Unknown",
};

export function OptInBadge({ status }: { status: OptInStatus }) {
  const tone = status === "opted_in" ? "success" : status === "opted_out" ? "danger" : "neutral";
  return (
    <Badge tone={tone} className="whitespace-nowrap">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "opted_in" ? "bg-emerald-500" : status === "opted_out" ? "bg-rose-500" : "bg-muted-foreground/60",
        )}
      />
      {OPT_IN_LABEL[status] ?? status}
    </Badge>
  );
}

export function optInLabel(status: OptInStatus) {
  return OPT_IN_LABEL[status] ?? status;
}

// ---------------------------------------------------------------- escape key
// Layers (drawer → confirm dialog → menu) stack; Escape closes only the
// top-most one instead of every open layer at once.
const escapeStack: { current: () => void }[] = [];

function handleEscapeKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  escapeStack[escapeStack.length - 1]?.current();
}

export function useEscape(active: boolean, onEscape: () => void) {
  const latest = useRef(onEscape);
  useEffect(() => {
    latest.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    const entry = { current: () => latest.current() };
    escapeStack.push(entry);
    if (escapeStack.length === 1) window.addEventListener("keydown", handleEscapeKey);
    return () => {
      const index = escapeStack.indexOf(entry);
      if (index >= 0) escapeStack.splice(index, 1);
      if (escapeStack.length === 0) window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [active]);
}

// ---------------------------------------------------------------- modal
export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  tone = "brand",
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "brand" | "danger";
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const titleId = useId();
  useEscape(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <div key="modal" className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-brand-900/25 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border/80 bg-white shadow-lift sm:rounded-3xl",
              className,
            )}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="flex items-start gap-3.5 border-b border-border/70 px-5 py-4 sm:px-6">
              {Icon && (
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white",
                    tone === "danger" ? "bg-gradient-to-br from-rose-500 to-brand-pink" : "bg-brand-gradient shadow-glow",
                  )}
                >
                  <Icon size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-lg font-semibold leading-tight">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <X size={18} />
              </button>
            </div>
            {children && <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
            {footer && (
              <div className="flex flex-wrap justify-end gap-2.5 border-t border-border/70 bg-brand-50/30 px-5 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- popover menu
export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  tone?: "default" | "danger" | "brand";
  disabled?: boolean;
}

/**
 * Icon trigger + floating menu rendered in a portal with fixed positioning so
 * it is never clipped by an `overflow-x-auto` table wrapper.
 */
export function PopoverMenu({
  label,
  trigger,
  items,
  align = "end",
  triggerClassName,
}: {
  label: string;
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useEscape(open, close);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 208;
    const estimatedHeight = items.length * 40 + 12;
    const up = rect.bottom + estimatedHeight + 8 > window.innerHeight && rect.top > estimatedHeight;
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: up ? window.innerHeight - rect.top + 6 : rect.bottom + 6, left, up });
  }, [align, items.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          open && "bg-brand-50 text-primary",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                key="menu"
                ref={menuRef}
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="fixed z-[70] w-52 rounded-2xl border border-border/80 bg-white p-1.5 shadow-lift"
                style={pos.up ? { bottom: pos.top, left: pos.left } : { top: pos.top, left: pos.left }}
                initial={{ opacity: 0, scale: 0.95, y: pos.up ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: pos.up ? 6 : -6 }}
                transition={{ duration: 0.18, ease }}
              >
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(false);
                        item.onSelect();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
                        item.tone === "danger"
                          ? "text-rose-600 hover:bg-rose-50"
                          : item.tone === "brand"
                            ? "text-primary hover:bg-brand-50"
                            : "text-foreground/85 hover:bg-brand-50/70",
                      )}
                    >
                      {ItemIcon && <ItemIcon size={15} className="shrink-0" />}
                      {item.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
