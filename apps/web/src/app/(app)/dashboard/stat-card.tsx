"use client";

import { Info, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
  tooltip: string;
  badge?: { text: string; tone: NonNullable<BadgeProps["tone"]> };
  /** 0–1; drives the bar under the value. */
  progress?: number;
  progressClassName?: string;
  valueClassName?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  tooltip,
  badge,
  progress = 0,
  progressClassName,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted">
          <Icon size={20} className="text-muted-foreground" />
        </span>
        {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
      </div>

      <div className="space-y-1">
        <p className="flex items-start gap-1.5 text-xs font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          {label}
          <span title={tooltip} className="cursor-help">
            <Info size={13} />
          </span>
        </p>
        <p className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{value}</p>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-primary transition-all", progressClassName)}
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </Card>
  );
}
