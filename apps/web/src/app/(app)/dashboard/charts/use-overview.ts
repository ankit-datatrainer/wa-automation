"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface DayBucket {
  date: string;
  inbound: number;
  outbound: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface OverviewResponse {
  series: DayBucket[];
  totals: {
    inbound: number;
    outbound: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
  };
}

export interface CategoryRow {
  category: string;
  count: number;
  totalCost: number;
}

export type PeriodValue = "7" | "30" | "90";

export const PERIOD_TABS: { value: PeriodValue; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
];

/**
 * Same keys the analytics and credit-history pages use for these endpoints, so
 * the dashboard and those pages share cached responses per window.
 */
function analyticsKey(name: string, days: number) {
  return ["analytics", name, { days }] as const;
}

/** GET /api/analytics/overview?days= — daily volume and delivery totals. */
export function useOverview(days: number) {
  return useQuery({
    queryKey: analyticsKey("overview", days),
    queryFn: () => api.get<OverviewResponse>("/analytics/overview", { days }),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/analytics/category-breakdown?days= — billed messages per template category. */
export function useCategoryBreakdown(days: number) {
  return useQuery({
    queryKey: analyticsKey("category-breakdown", days),
    queryFn: () => api.get<{ breakdown: CategoryRow[] }>("/analytics/category-breakdown", { days }),
    placeholderData: keepPreviousData,
  });
}

/** The API only returns days that had traffic; pad the window so charts read as a timeline. */
export function fillSeries(series: DayBucket[] | undefined, days: number): DayBucket[] {
  const byDate = new Map((series ?? []).map((b) => [b.date, b]));
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // The API buckets by the UTC date prefix of `sent_at`, so pad in UTC too.
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push(byDate.get(date) ?? { date, inbound: 0, outbound: 0, delivered: 0, read: 0, failed: 0 });
  }
  return out;
}

/**
 * Percentage change of the second half of a series versus the first half.
 * Both halves are the same length (the middle point of an odd series is skipped)
 * so a 7-day window compares 3 days with 3 days, not 3 with 4.
 */
export function halfTrend(values: number[]): number | null {
  if (values.length < 2) return null;
  const half = Math.floor(values.length / 2);
  const previous = values.slice(0, half).reduce((a, b) => a + b, 0);
  const current = values.slice(values.length - half).reduce((a, b) => a + b, 0);
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function formatDay(date: string) {
  // Parse as a local date so the label never shifts a day in negative UTC offsets.
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export const CHART_COLORS = {
  purple: "#833ab4",
  violet: "#6d28d9",
  magenta: "#c13584",
  pink: "#e1306c",
  lilac: "#b57be0",
  lavender: "#e9d5ff",
  rose: "#f43f5e",
  grid: "hsl(268 25% 93%)",
  axis: "hsl(262 12% 52%)",
} as const;
