"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ease } from "@/components/motion";
import { cn } from "@/lib/utils";

export type DeliveryMode = "now" | "schedule";

export interface DeliveryState {
  mode: DeliveryMode;
  /** Local "YYYY-MM-DDTHH:mm" value from the datetime-local input. */
  at: string;
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Returns an error message, or null when the delivery choice is valid. */
export function deliveryError(delivery: DeliveryState): string | null {
  if (delivery.mode === "now") return null;
  if (!delivery.at) return "Pick a date and time to schedule.";
  const when = new Date(delivery.at);
  if (Number.isNaN(when.getTime())) return "That date isn't valid.";
  if (when.getTime() <= Date.now() + 60_000) return "Scheduled time must be in the future.";
  return null;
}

export function deliveryLabel(delivery: DeliveryState): string {
  if (delivery.mode === "now") return "Immediately";
  if (!delivery.at) return "Not set";
  const when = new Date(delivery.at);
  return Number.isNaN(when.getTime())
    ? "Not set"
    : when.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const PRESETS: { label: string; make: () => Date }[] = [
  {
    label: "In 1 hour",
    make: () => {
      const d = new Date(Date.now() + 60 * 60_000);
      d.setSeconds(0, 0);
      return d;
    },
  },
  {
    label: "Tonight 7 PM",
    make: () => {
      const d = new Date();
      d.setHours(19, 0, 0, 0);
      if (d.getTime() <= Date.now() + 5 * 60_000) d.setDate(d.getDate() + 1);
      return d;
    },
  },
  {
    label: "Tomorrow 10 AM",
    make: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Next Monday 10 AM",
    make: () => {
      const d = new Date();
      const add = ((8 - d.getDay()) % 7) || 7;
      d.setDate(d.getDate() + add);
      d.setHours(10, 0, 0, 0);
      return d;
    },
  },
];

export function DeliveryPicker({
  value,
  onChange,
  layoutId,
}: {
  value: DeliveryState;
  onChange: (value: DeliveryState) => void;
  layoutId: string;
}) {
  const error = deliveryError(value);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options: { mode: DeliveryMode; title: string; text: string; icon: typeof Zap }[] = [
    { mode: "now", title: "Send now", text: "Start delivering the moment you confirm.", icon: Zap },
    { mode: "schedule", title: "Schedule", text: "Pick a date and time — we'll send it then.", icon: CalendarClock },
  ];

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Delivery timing" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = value.mode === o.mode;
          const Icon = o.icon;
          return (
            <button
              key={o.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...value, mode: o.mode })}
              className={cn(
                "relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
                active ? "border-primary" : "border-border/80 bg-white hover:border-brand-200",
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-white"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-300",
                  active ? "bg-brand-gradient text-white shadow-glow" : "bg-brand-50 text-brand-600",
                )}
              >
                <Icon size={18} />
              </span>
              <span className="relative">
                <span className="block font-semibold text-foreground">{o.title}</span>
                <span className="block text-sm text-muted-foreground">{o.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {value.mode === "schedule" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/30 p-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onChange({ mode: "schedule", at: toLocalInput(p.make()) })}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="send-at" className="text-sm font-semibold text-foreground/90">
                  Send at <span className="text-brand-pink">*</span>
                </label>
                <Input
                  id="send-at"
                  type="datetime-local"
                  value={value.at}
                  min={toLocalInput(new Date())}
                  onChange={(e) => onChange({ mode: "schedule", at: e.target.value })}
                  aria-invalid={(!!value.at && !!error) || undefined}
                  className="sm:max-w-xs"
                />
                {value.at && error ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {error}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Times are in your local timezone ({tz}).</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
