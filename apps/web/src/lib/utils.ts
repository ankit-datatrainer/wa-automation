import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** 2000 -> "2.0k", 100000 -> "100k" — matches the messaging-limit card. */
export function formatCompact(value: number) {
  if (!Number.isFinite(value)) return "Unlimited";
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return thousands >= 100
    ? `${Math.round(thousands)}k`
    : `${thousands.toFixed(1)}k`;
}

export function initials(name: string | null | undefined, fallback = "?") {
  if (!name?.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || fallback;
}
