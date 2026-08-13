"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Clock, Inbox } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

interface Reports {
  total: number;
  open: number;
  resolved: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionHours: number;
}

export default function SupportReportsPage() {
  const reports = useQuery({
    queryKey: ["support-reports"],
    queryFn: () => api.get<Reports>("/support/reports"),
  });

  const data = reports.data;

  return (
    <>
      <PageHeader
        title="Support Reports"
        description="Ticket volume, breakdown and average time to resolution."
        onRefresh={() => void reports.refetch()}
        refreshing={reports.isFetching}
      />

      {reports.isError ? (
        <ErrorState message="Could not load support reports." onRetry={() => void reports.refetch()} />
      ) : reports.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Inbox} label="Total tickets" value={String(data.total)} />
            <Metric icon={Clock} label="Currently open" value={String(data.open)} />
            <Metric icon={CheckCircle2} label="Resolved" value={String(data.resolved)} />
            <Metric
              icon={BarChart3}
              label="Avg. resolution"
              value={
                data.averageResolutionHours > 0
                  ? `${data.averageResolutionHours.toFixed(1)} h`
                  : "—"
              }
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Breakdown title="By status" counts={data.byStatus} total={data.total} />
            <Breakdown title="By priority" counts={data.byPriority} total={data.total} />
          </div>
        </>
      )}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

function Breakdown({
  title,
  counts,
  total,
}: {
  title: string;
  counts: Record<string, number>;
  total: number;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map(([key, count]) => (
              <li key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{key.replace("_", " ")}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
