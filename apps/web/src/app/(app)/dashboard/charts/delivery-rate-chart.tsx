"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

interface OverviewResponse {
  series: unknown[];
  totals: {
    inbound: number;
    outbound: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
  };
}

const SEGMENTS = [
  { key: "read", label: "Read", color: "hsl(199, 89%, 48%)" },
  { key: "deliveredOnly", label: "Delivered", color: "hsl(142, 71%, 40%)" },
  { key: "sentOnly", label: "Sent (undelivered)", color: "hsl(215, 16%, 60%)" },
  { key: "failed", label: "Failed", color: "hsl(0, 72%, 51%)" },
] as const;

export function DeliveryRateChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<OverviewResponse>("/analytics/overview", { days: 30 }),
  });

  const totals = data?.totals;
  const pie = totals
    ? [
        { name: "Read", value: totals.read, color: SEGMENTS[0].color },
        {
          name: "Delivered",
          value: totals.delivered - totals.read,
          color: SEGMENTS[1].color,
        },
        {
          name: "Sent (undelivered)",
          value: Math.max(0, totals.outbound - totals.delivered - totals.failed),
          color: SEGMENTS[2].color,
        },
        { name: "Failed", value: totals.failed, color: SEGMENTS[3].color },
      ].filter((s) => s.value > 0)
    : [];

  const rate = totals?.deliveryRate ?? 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Delivery Rate</CardTitle>
          <CardDescription>Message delivery breakdown over the last 30 days</CardDescription>
        </div>
        {totals && (
          <span className="text-2xl font-bold text-primary">
            {(rate * 100).toFixed(1)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : pie.length === 0 ? (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            No outbound messages yet to calculate delivery rate.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <ResponsiveContainer width={220} height={220} className="shrink-0">
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {pie.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(214, 20%, 91%)",
                    borderRadius: "0.5rem",
                    fontSize: 13,
                  }}
                  formatter={(value: number) => value.toLocaleString()}
                />
              </PieChart>
            </ResponsiveContainer>

            <ul className="space-y-3 text-sm">
              {pie.map((segment) => (
                <li key={segment.name} className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ background: segment.color }}
                  />
                  <span className="text-muted-foreground">{segment.name}</span>
                  <span className="ml-auto font-semibold tabular-nums">
                    {segment.value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
