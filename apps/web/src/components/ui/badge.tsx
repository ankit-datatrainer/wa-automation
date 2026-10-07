import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground ring-border",
        brand: "bg-brand-50 text-brand-700 ring-brand-200",
        success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        warning: "bg-amber-50 text-amber-700 ring-amber-200",
        danger: "bg-rose-50 text-rose-700 ring-rose-200",
        info: "bg-violet-50 text-violet-700 ring-violet-200",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Maps the statuses used across templates, campaigns and messages to a tone. */
export function statusTone(status: string): NonNullable<BadgeProps["tone"]> {
  switch (status) {
    case "approved":
    case "completed":
    case "delivered":
    case "connected":
    case "opted_in":
    case "high":
    case "resolved":
      return "success";
    case "pending":
    case "scheduled":
    case "paused":
    case "queued":
    case "waiting":
    case "medium":
      return "warning";
    case "rejected":
    case "failed":
    case "disabled":
    case "error":
    case "opted_out":
    case "low":
      return "danger";
    case "running":
    case "sent":
    case "read":
    case "open":
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}
