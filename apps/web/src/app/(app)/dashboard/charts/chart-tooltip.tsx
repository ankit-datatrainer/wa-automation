"use client";

import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

/** Branded tooltip shared by the dashboard charts. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => v.toLocaleString(),
}: TooltipProps<ValueType, NameType> & {
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  const heading =
    label !== undefined && label !== null && label !== ""
      ? labelFormatter
        ? labelFormatter(String(label))
        : String(label)
      : null;

  return (
    <div className="min-w-[160px] rounded-xl border border-border/80 bg-white/95 px-3.5 py-3 text-xs shadow-lift backdrop-blur">
      {heading && <p className="mb-2 font-semibold text-foreground">{heading}</p>}
      <ul className="space-y-1.5">
        {payload.map((entry) => {
          const raw = (entry.payload as { color?: string } | undefined)?.color ?? entry.color;
          // Gradient fills arrive as "url(#id)", which is not a usable CSS background.
          const color = raw && !raw.startsWith("url(") ? raw : "#833ab4";
          const name = String(entry.name ?? entry.dataKey ?? "");
          return (
            <li key={name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums text-foreground">
                {valueFormatter(Number(entry.value ?? 0), name)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
