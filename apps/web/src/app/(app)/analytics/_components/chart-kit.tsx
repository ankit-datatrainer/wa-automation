"use client";

/** Brand-consistent chart palette and helpers shared by the analytics charts. */
export const CHART = {
  purple: "#833ab4",
  violet: "#9a4fd0",
  magenta: "#c13584",
  pink: "#e1306c",
  orange: "#f77737",
  yellow: "#fcaf45",
  grid: "hsl(270 30% 93%)",
  axis: "hsl(260 10% 50%)",
} as const;

export const SERIES_COLORS = [
  CHART.purple,
  CHART.magenta,
  CHART.pink,
  CHART.orange,
  CHART.violet,
  CHART.yellow,
];

export const axisProps = {
  tick: { fontSize: 11, fill: CHART.axis },
  tickLine: false,
  axisLine: false,
} as const;

export const formatShortDate = (date: string | number) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  // Bare "YYYY-MM-DD" buckets are UTC days; format them in UTC so viewers west of
  // UTC don't see every label shifted back a day.
  const dateOnly = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    ...(dateOnly && { timeZone: "UTC" }),
  });
};

interface TooltipEntry {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
  payload?: Record<string, unknown>;
}

/** Glassy custom tooltip; recharts injects active/payload/label. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => v.toLocaleString(),
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => React.ReactNode;
  valueFormatter?: (value: number, entry: TooltipEntry) => React.ReactNode;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[160px] rounded-xl border border-brand-100 bg-white/95 p-3 shadow-lift backdrop-blur-md">
      {label !== undefined && label !== "" && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="space-y-1.5">
        {payload.map((entry, i) => {
          const raw = entry.color ?? (entry.payload?.fill as string | undefined);
          // Gradient fills arrive as "url(#id)", which can't paint a legend swatch.
          const color = raw && !raw.startsWith("url(") ? raw : CHART.purple;
          const value = Array.isArray(entry.value) ? entry.value[0] : entry.value;
          return (
            <li
              key={`${String(entry.name)}-${i}`}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <span className="capitalize">{entry.name}</span>
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {typeof value === "number" ? valueFormatter(value, entry) : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Small coloured legend chip. */
export function LegendDot({
  color,
  label,
  value,
}: {
  color: string;
  label: React.ReactNode;
  value?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="capitalize text-muted-foreground">{label}</span>
      {value !== undefined && <span className="font-semibold tabular-nums">{value}</span>}
    </span>
  );
}
