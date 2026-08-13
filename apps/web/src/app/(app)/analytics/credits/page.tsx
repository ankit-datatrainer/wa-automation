"use client";

import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { LedgerTable, type Column } from "@/components/data/ledger-table";
import { formatCurrency } from "@/lib/utils";

interface CreditRow {
  id: string;
  category: string;
  cost: number;
  currency: string;
  created_at: string;
}

const columns: Column<CreditRow>[] = [
  {
    key: "date",
    header: "Date",
    render: (row) => new Date(row.created_at).toLocaleString(),
    className: "whitespace-nowrap text-xs text-muted-foreground",
  },
  {
    key: "category",
    header: "Category",
    render: (row) => <Badge className="capitalize">{row.category}</Badge>,
  },
  {
    key: "cost",
    header: "Charge",
    render: (row) => formatCurrency(Number(row.cost), row.currency),
    className: "font-medium",
  },
];

export default function CreditHistoryPage() {
  return (
    <>
      <PageHeader
        title="Credit History"
        description="Every conversation charge, by message category."
      />
      <LedgerTable
        queryKey={["analytics", "credits"]}
        endpoint="/analytics/credits"
        columns={columns}
        emptyIcon={Receipt}
        emptyTitle="No charges yet"
        emptyDescription="Conversation charges appear here once you start sending messages."
      />
    </>
  );
}
