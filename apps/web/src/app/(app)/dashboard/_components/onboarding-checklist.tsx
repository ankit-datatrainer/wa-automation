"use client";

import Link from "next/link";
import { Check, ChevronRight, Rocket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { Stagger, StaggerItem, motion } from "@/components/motion";
import { cn } from "@/lib/utils";

export interface ChecklistStep {
  title: string;
  description: string;
  href: string;
  done: boolean;
}

/** Getting-started steps, each derived from what the account has actually set up. */
export function OnboardingChecklist({ steps, loading }: { steps: ChecklistStep[]; loading: boolean }) {
  const completed = steps.filter((s) => s.done).length;
  const ratio = steps.length ? completed / steps.length : 0;
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <Rocket size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Get set up</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Checking your workspace…" : `${completed} of ${steps.length} steps complete`}
          </p>
        </div>
        <span className="font-display text-2xl font-bold text-gradient tabular-nums">
          {loading ? "" : `${Math.round(ratio * 100)}%`}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-brand-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <Stagger className="mt-4 space-y-1.5" stagger={0.05}>
          {steps.map((step, index) => {
            const isNext = index === nextIndex;
            return (
              <StaggerItem key={step.title}>
                <Link
                  href={step.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isNext
                      ? "border-brand-200 bg-brand-50/70 shadow-soft hover:shadow-lift"
                      : "border-transparent hover:border-border hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                      step.done
                        ? "bg-emerald-500 text-white"
                        : isNext
                          ? "bg-brand-gradient text-white"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.done ? (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                        <Check size={14} strokeWidth={3} />
                      </motion.span>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold",
                        step.done && "text-muted-foreground line-through decoration-muted-foreground/40",
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{step.description}</span>
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </Card>
  );
}
