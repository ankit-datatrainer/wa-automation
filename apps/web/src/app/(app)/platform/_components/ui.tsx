"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, X, type LucideIcon } from "lucide-react";
import { AnimatedNumber, HoverLift, Spotlight, StaggerItem, ease, motion } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { cn, initials } from "@/lib/utils";

/**
 * Supabase embeds a to-one relation as either an object or a one-element
 * array depending on how the FK is inferred — normalise it to an object.
 */
export function relation<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

/** Returns `value` once it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Table row that fades in on mount. Only the first ~20 rows are staggered so
 * long tables don't feel sluggish.
 */
export function MotionTR({
  index,
  className,
  children,
  onClick,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease, delay: Math.min(index, 20) * 0.025 }}
      onClick={onClick}
      className={cn("transition-colors duration-150 hover:bg-brand-50/50", className)}
    >
      {children}
    </motion.tr>
  );
}

export type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

const toneTile: Record<Tone, string> = {
  brand: "bg-brand-gradient text-white shadow-glow",
  success: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200",
  danger: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200",
  neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

/** Animated KPI tile. Intended to live inside a `<Stagger>` container. */
export function KpiTile({
  icon: Icon,
  label,
  value,
  format,
  sublabel,
  tone = "brand",
  href,
  loading,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  sublabel?: React.ReactNode;
  tone?: Tone;
  href?: string;
  loading?: boolean;
  badge?: React.ReactNode;
}) {
  const body = (
    <Spotlight className="h-full rounded-2xl border border-border/80 bg-white p-4 shadow-soft transition-shadow duration-300 hover:shadow-lift sm:p-5">
      <div className="relative flex items-start justify-between gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", toneTile[tone])}>
          <Icon size={20} />
        </span>
        {badge}
      </div>
      <p className="relative mt-4 truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="relative mt-1 font-display text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-[28px]">
        {loading ? (
          <span className="inline-block h-7 w-20 animate-pulse rounded-lg bg-muted align-middle" />
        ) : (
          <AnimatedNumber value={value} format={format} />
        )}
      </div>
      {sublabel && <p className="relative mt-1 truncate text-xs text-muted-foreground">{sublabel}</p>}
    </Spotlight>
  );

  return (
    <StaggerItem className="h-full">
      <HoverLift className="h-full">
        {href ? (
          <Link
            href={href}
            className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {body}
          </Link>
        ) : (
          body
        )}
      </HoverLift>
    </StaggerItem>
  );
}

/** Search input with a leading icon and a clear button. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 flex-1 sm:min-w-64", className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={label}
        placeholder={placeholder}
        className="pl-10 pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

const avatarPalette = [
  "from-brand-500 to-brand-magenta",
  "from-brand-magenta to-brand-pink",
  "from-brand-600 to-brand-400",
  "from-brand-pink to-brand-orange",
  "from-brand-700 to-brand-pink",
];

/** Gradient initials avatar with an optional presence dot. */
export function Avatar({
  name,
  size = "md",
  online,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const seed = (name ?? "?").split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white shadow-soft",
        avatarPalette[seed % avatarPalette.length],
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-10 w-10 text-xs",
        size === "lg" && "h-12 w-12 text-sm",
      )}
    >
      {initials(name)}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white",
            online ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
          aria-hidden
        />
      )}
    </span>
  );
}

/** Small uppercase section label with an optional trailing action. */
export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="font-display text-base font-semibold tracking-tight text-foreground">{children}</h2>
      {action}
    </div>
  );
}

/** Human-friendly label for dotted audit actions: "organization.wallet_adjusted" → "Organization wallet adjusted". */
export function humanizeAction(action: string) {
  const text = action.replace(/[._]/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "3m ago" style relative time. */
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
