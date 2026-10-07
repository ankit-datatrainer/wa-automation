"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatedNumber, Spotlight, StaggerItem } from "@/components/motion";
import { Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const ACCENTS = {
  brand: "from-brand-600 to-brand-magenta",
  pink: "from-brand-magenta to-brand-pink",
  orange: "from-brand-pink to-brand-orange",
  violet: "from-brand-500 to-brand-700",
  success: "from-emerald-500 to-emerald-600",
} as const;

/**
 * KPI tile with an animated count-up. `value === undefined` renders a skeleton,
 * so tiles can appear before their query resolves. Place inside a `<Stagger>`.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  hint,
  accent = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  format?: (n: number) => string;
  hint?: React.ReactNode;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <StaggerItem>
      <Spotlight className="h-full rounded-2xl border border-border/80 bg-white p-4 shadow-soft sm:p-5 transition-shadow duration-300 hover:shadow-lift">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            {value === undefined ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="truncate font-display text-2xl font-bold leading-none tracking-tight text-foreground sm:text-[28px]">
                <AnimatedNumber value={value} format={format} />
              </p>
            )}
            {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
          </div>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 bg-gradient-to-br text-white shadow-glow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105",
              ACCENTS[accent],
            )}
          >
            <Icon size={18} />
          </span>
        </div>
      </Spotlight>
    </StaggerItem>
  );
}
