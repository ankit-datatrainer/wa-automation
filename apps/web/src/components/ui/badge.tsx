import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-accent text-accent-foreground",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        danger: "bg-destructive/10 text-destructive",
        info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
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
