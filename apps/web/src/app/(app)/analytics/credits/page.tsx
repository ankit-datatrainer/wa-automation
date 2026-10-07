"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Headphones, KeyRound, Megaphone, Receipt, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { LedgerTable, type Column } from "@/components/data/ledger-table";
import { Stagger, StaggerItem } from "@/components/motion";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { KpiTile } from "../_components/kpi-tile";

interface CreditRow {
  id: string;
  category: string;
  cost: number;
  currency: string;
  created_at: string;
}

interface CategoryRow {
  category: string;
  count: number;
  totalCost: number;
}

const CATEGORY_META: Record<
  string,
  { icon: typeof Megaphone; tone: "brand" | "info" | "warning" | "neutral" }
> = {
  marketing: { icon: Megaphone, tone: "brand" },
  utility: { icon: Wrench, tone: "info" },
  authentication: { icon: KeyRound, tone: "warning" },
  service: { icon: Headphones, tone: "neutral" },
};

const columns: Column<CreditRow>[] = [
  {
    key: "date",
    header: "Date",
    render: (row) => (
      <div className="whitespace-nowrap">
        <p className="text-sm font-medium text-foreground">
          {new Date(row.created_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    render: (row) => {
      const meta = CATEGORY_META[row.category];
      const Icon = meta?.icon ?? Receipt;
      return (
        <Badge tone={meta?.tone ?? "neutral"} className="capitalize">
          <Icon size={12} />
          {row.category}
        </Badge>
      );
    },
  },
  {
    key: "cost",
    header: "Charge",
    render: (row) => (
      <span className="font-semibold tabular-nums">
        {formatCurrency(Number(row.cost), row.currency)}
      </span>
    ),
    className: "text-right",
  },
];

export default function CreditHistoryPage() {
  const breakdown = useQuery({
    queryKey: ["analytics", "category-breakdown", { days: 30 }],
    queryFn: () =>
      api.get<{ breakdown: CategoryRow[] }>("/analytics/category-breakdown", { days: 30 }),
  });

  const balance = useQuery({
    queryKey: ["billing", "balance"],
    queryFn: () => api.get<{ balance: number; currency: string }>("/billing/balance"),
  });

  const rows = breakdown.data?.breakdown ?? [];
  const currency = balance.data?.currency ?? "INR";
  const totalSpend = rows.reduce((sum, r) => sum + r.totalCost, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <>
      <PageHeader
        title="Credit History"
        description="Every conversation charge, by message category."
      />

      {breakdown.isError ? (
        <div className="mb-6">
          <ErrorState
            message="Could not load the 30-day spend summary."
            onRetry={() => void breakdown.refetch()}
          />
        </div>
      ) : breakdown.isLoading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
      ) : (
        breakdown.data && (
          <Stagger className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StaggerItem className="sm:col-span-2 xl:col-span-1">
              <KpiTile
                featured
                icon={BadgeCheck}
                label="Spend · 30 days"
                value={totalSpend}
                format={(n) => formatCurrency(n, currency)}
                hint={`${totalCount.toLocaleString()} billed conversations`}
              />
            </StaggerItem>
            {rows.map((row) => (
              <StaggerItem key={row.category}>
                <KpiTile
                  icon={CATEGORY_META[row.category]?.icon ?? Receipt}
                  label={row.category}
                  value={row.count}
                  hint={formatCurrency(row.totalCost, currency)}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )
      )}

      <LedgerTable
        queryKey={["analytics", "credits"]}
        endpoint="/analytics/credits"
        columns={columns}
        title="Charges"
        description="Newest first"
        emptyIcon={Receipt}
        emptyTitle="No charges yet"
        emptyDescription="Conversation charges appear here once you start sending messages."
      />
    </>
  );
}
