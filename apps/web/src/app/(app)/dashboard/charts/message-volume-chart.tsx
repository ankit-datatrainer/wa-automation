"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

interface DayBucket {
  date: string;
  inbound: number;
  outbound: number;
  delivered: number;
  read: number;
  failed: number;
}

interface OverviewResponse {
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

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

export function MessageVolumeChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<OverviewResponse>("/analytics/overview", { days: 30 }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Message Volume</CardTitle>
          <CardDescription>Inbound vs outbound messages over the last 30 days</CardDescription>
        </div>
        {data && (
          <div className="flex gap-5 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "hsl(142, 71%, 40%)" }} />
              Outbound
              <span className="font-bold">{data.totals.outbound.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "hsl(199, 89%, 48%)" }} />
              Inbound
              <span className="font-bold">{data.totals.inbound.toLocaleString()}</span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !data?.series.length ? (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            No message data yet. Start sending to see your volume trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.series} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 40%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 40%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 91%)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                stroke="hsl(215, 16%, 47%)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(215, 16%, 47%)"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(214, 20%, 91%)",
                  borderRadius: "0.5rem",
                  fontSize: 13,
                }}
                labelFormatter={formatDate}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                name="Outbound"
                stroke="hsl(142, 71%, 40%)"
                strokeWidth={2}
                fill="url(#gOutbound)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="inbound"
                name="Inbound"
                stroke="hsl(199, 89%, 48%)"
                strokeWidth={2}
                fill="url(#gInbound)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
