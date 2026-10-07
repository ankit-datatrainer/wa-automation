"use client";

import { Loader2, RotateCcw, TriangleAlert, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(270_40%_98%)_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-primary", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <div className="relative">
        <span aria-hidden className="absolute inset-0 -z-10 rounded-3xl bg-brand-gradient opacity-30 blur-xl" />
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <Icon size={28} />
        </span>
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </motion.div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-rose-600 shadow-soft">
        <TriangleAlert size={18} />
      </span>
      <p className="text-sm font-medium text-rose-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 shadow-soft ring-1 ring-rose-200 transition hover:bg-rose-100"
        >
          <RotateCcw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}
