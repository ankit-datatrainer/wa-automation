import type { BadgeProps } from "@/components/ui/badge";

export const TICKET_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** "in_progress" -> "In progress". */
export function labelize(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const STATUS_COLORS: Record<string, string> = {
  open: "#833ab4",
  in_progress: "#9a4fd0",
  waiting: "#fcaf45",
  resolved: "#10b981",
  closed: "#94a3b8",
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#e1306c",
  high: "#f77737",
  medium: "#c13584",
  low: "#b57be0",
};

export function statusBadgeTone(status: string): NonNullable<BadgeProps["tone"]> {
  switch (status) {
    case "open":
      return "brand";
    case "in_progress":
      return "info";
    case "waiting":
      return "warning";
    case "resolved":
      return "success";
    default:
      return "neutral";
  }
}

/** Priority needs its own scale — the generic statusTone treats "high" as success. */
export function priorityBadgeTone(priority: string): NonNullable<BadgeProps["tone"]> {
  switch (priority) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}
