"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Info, Minus, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { AnimatedNumber, HoverLift, Spotlight, motion } from "@/components/motion";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  /** Numeric value, animated on entry. `null` renders a dash (no data). */
  value: number | null;
  format?: (value: number) => string;
  /** Rendered instead of the animated number when set (e.g. "Unlimited"). */
  displayValue?: string;
  caption: string;
  tooltip: string;
  badge?: { text: string; tone: NonNullable<BadgeProps["tone"]> };
  /** Percentage change for the trend chip (shown when there is no badge); `null` hides it. */
  trend?: number | null;
  /** Points for the background sparkline. */
  spark?: number[];
  /** 0–1; drives the meter under the value. */
  progress?: number;
  href?: string;
  loading?: boolean;
  accent?: "brand" | "magenta" | "pink" | "orange";
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, { tile: string; stroke: string }> = {
  brand: { tile: "from-[#6d28d9] to-[#833ab4]", stroke: "#833ab4" },
  magenta: { tile: "from-[#833ab4] to-[#c13584]", stroke: "#c13584" },
  pink: { tile: "from-[#c13584] to-[#e1306c]", stroke: "#e1306c" },
  orange: { tile: "from-[#e1306c] to-[#f77737]", stroke: "#f77737" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  format,
  displayValue,
  caption,
  tooltip,
  badge,
  trend,
  spark,
  progress,
  href,
  loading,
  accent = "brand",
}: StatCardProps) {
  const tone = ACCENTS[accent];

  const body = (
    <Spotlight className="flex h-full flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift">
      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-glow",
            tone.tile,
          )}
        >
          <Icon size={20} />
        </span>
        {badge ? (
          <Badge tone={badge.tone}>{badge.text}</Badge>
        ) : trend !== undefined && trend !== null ? (
          <TrendChip value={trend} />
        ) : null}
      </div>

      <div className="relative min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="truncate">{label}</span>
          <span title={tooltip} aria-label={tooltip} className="cursor-help text-muted-foreground/70">
            <Info size={12} />
          </span>
        </p>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="truncate font-display text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]">
            {displayValue ?? (value === null ? "—" : <AnimatedNumber value={value} format={format} />)}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {caption}
        </p>
      </div>

      {spark && spark.length > 1 ? (
        <Sparkline points={spark} color={tone.stroke} />
      ) : progress !== undefined ? (
        <div className="relative mt-auto h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-brand-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        </div>
      ) : (
        <div className="mt-auto h-1.5" />
      )}
    </Spotlight>
  );

  return (
    <HoverLift className="h-full">
      {href ? (
        <Link
          href={href}
          className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </HoverLift>
  );
}

export function TrendChip({ value, className }: { value: number; className?: string }) {
  const flat = Math.abs(value) < 0.5;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        flat
          ? "bg-muted text-muted-foreground ring-border"
          : up
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-rose-50 text-rose-700 ring-rose-200",
        className,
      )}
    >
      <Icon size={12} />
      {flat ? "0%" : `${up ? "+" : ""}${Math.abs(value) >= 1000 ? "999+" : value.toFixed(0)}%`}
    </span>
  );
}

/** Lightweight SVG sparkline that draws itself in. */
export function Sparkline({ points, color, className }: { points: number[]; color: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const width = 120;
  const height = 32;
  const max = Math.max(...points, 1);
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => [i * step, height - 2 - (p / max) * (height - 6)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("relative mt-auto h-8 w-full overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#spark-${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
