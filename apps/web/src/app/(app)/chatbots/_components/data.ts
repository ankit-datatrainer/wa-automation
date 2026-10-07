"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

// ---------------------------------------------------------------- types
export interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: { keywords?: string[] } | null;
  flow_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FlowRow {
  id: string;
  name: string;
  status: string;
  meta_flow_id: string | null;
  created_at?: string;
  updated_at: string;
}

export interface ExecutionRow {
  id: string;
  current_node: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  chatbots: unknown;
  contacts: unknown;
}

// ---------------------------------------------------------------- queries
// Keys and fetchers are shared so every page reads the same cache entries.
export function useChatbots() {
  return useQuery({
    queryKey: ["chatbots"],
    queryFn: () => api.get<{ data: Chatbot[] }>("/chatbots"),
  });
}

export function useChatbotHistory() {
  return useQuery({
    queryKey: ["chatbot-history"],
    queryFn: () => api.get<{ data: ExecutionRow[] }>("/chatbots/history"),
  });
}

export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: () => api.get<{ data: FlowRow[] }>("/flows"),
  });
}

// ---------------------------------------------------------------- helpers
/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human label for a snake_case status or trigger. */
export function humanize(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Wraps a CSV field, neutralising spreadsheet formula injection. */
export function csvField(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([rows.map((row) => row.map(csvField).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so Safari has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
