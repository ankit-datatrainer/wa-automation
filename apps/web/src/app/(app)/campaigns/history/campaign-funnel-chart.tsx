"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

interface FunnelData {
  id: string;
  name: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
}

interface FunnelResponse {
  funnels: FunnelData[];
}

const COLORS = {
  total: "hsl(215, 16%, 70%)",
  sent: "hsl(215, 16%, 55%)",
  delivered: "hsl(142, 71%, 40%)",
  read: "hsl(199, 89%, 48%)",
  replied: "hsl(262, 60%, 55%)",
  failed: "hsl(0, 72%, 51%)",
} as const;

const STAGE_ORDER = ["total", "sent", "delivered", "read", "replied", "failed"] as const;

function buildFunnelBars(funnel: FunnelData) {
  return STAGE_ORDER.map((stage) => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: funnel[stage],
    fill: COLORS[stage],
  }));
}

export function CampaignFunnelChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "campaign-funnel"],
    queryFn: () => api.get<FunnelResponse>("/analytics/campaign-funnel"),
  });

  const funnel = data?.funnels?.[0];
  const bars = funnel ? buildFunnelBars(funnel) : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Campaign Performance</CardTitle>
          <CardDescription>
            {funnel
              ? `Delivery funnel for "${funnel.name}"`
              : "Delivery funnel for your most recent campaign"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : bars.length === 0 ? (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            No completed campaigns yet. Run your first campaign to see its delivery funnel.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 4, right: 30, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214, 20%, 91%)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(215, 16%, 47%)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="stage"
                  type="category"
                  width={100}
                  tick={{ fontSize: 13, fontWeight: 500 }}
                  stroke="hsl(215, 16%, 47%)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(214 20% 91% / 0.4)" }}
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 100%)",
                    border: "1px solid hsl(214, 20%, 91%)",
                    borderRadius: "0.5rem",
                    fontSize: 13,
                  }}
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Bar dataKey="value" name="Messages" radius={[0, 6, 6, 0]} barSize={28}>
                  {bars.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary row */}
            {funnel && (
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm">
                {STAGE_ORDER.map((stage) => (
                  <span key={stage} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: COLORS[stage] }}
                    />
                    <span className="capitalize text-muted-foreground">{stage}</span>
                    <span className="font-semibold tabular-nums">
                      {funnel[stage].toLocaleString()}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
