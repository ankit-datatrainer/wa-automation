"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatedNumber, HoverLift, Spotlight } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * KPI tile used across the analytics and support pages. `featured` renders the
 * gradient hero variant for the headline metric.
 */
export function KpiTile({
  icon: Icon,
  label,
  value,
  format,
  hint,
  featured = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  /** Numeric values count up; strings render as-is. */
  value: number | string;
  format?: (n: number) => string;
  hint?: React.ReactNode;
  featured?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.08em]",
            featured ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]",
            featured
              ? "bg-white/20 text-white ring-1 ring-white/30"
              : "bg-brand-50 text-primary ring-1 ring-brand-100",
          )}
        >
          <Icon size={19} />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-display text-[28px] font-bold leading-none tracking-tight",
          featured ? "text-white" : "text-foreground",
        )}
      >
        {typeof value === "number" ? <AnimatedNumber value={value} format={format} /> : value}
      </p>
      {hint && (
        <p className={cn("mt-2 text-xs", featured ? "text-white/80" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </>
  );

  return (
    <HoverLift className={cn("h-full", className)}>
      {featured ? (
        <div className="group relative h-full overflow-hidden rounded-2xl bg-brand-gradient bg-[length:200%_200%] p-5 shadow-glow animate-gradient-x">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-brand-yellow/20 blur-2xl"
          />
          <div className="relative">{content}</div>
        </div>
      ) : (
        <Spotlight className="h-full rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift">
          <div className="relative">{content}</div>
        </Spotlight>
      )}
    </HoverLift>
  );
}
