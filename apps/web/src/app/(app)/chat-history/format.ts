import { format, isThisWeek, isThisYear, isToday, isYesterday } from "date-fns";

export function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Today", "Yesterday", "Monday", "12 Aug" or "12 Aug 2024". */
export function dayLabel(value: string | null | undefined) {
  const d = safeDate(value);
  if (!d) return "Earlier";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEEE");
  return isThisYear(d) ? format(d, "d MMM") : format(d, "d MMM yyyy");
}

/** Compact timestamp for list rows: time today, weekday this week, else date. */
export function listTime(value: string | null | undefined) {
  const d = safeDate(value);
  if (!d) return "";
  if (isToday(d)) return format(d, "p");
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEE");
  return isThisYear(d) ? format(d, "d MMM") : format(d, "dd/MM/yy");
}

export function sessionInfo(expiresAt: string | null | undefined) {
  const d = safeDate(expiresAt);
  if (!d || d.getTime() <= Date.now()) return { open: false, label: "Session closed" };
  const mins = Math.round((d.getTime() - Date.now()) / 60_000);
  const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
  return { open: true, label };
}
