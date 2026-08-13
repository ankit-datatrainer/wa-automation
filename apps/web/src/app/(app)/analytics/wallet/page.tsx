"use client";

import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { LedgerTable, type Column } from "@/components/data/ledger-table";
import { WalletTopUp } from "./top-up";
import { formatCurrency } from "@/lib/utils";

interface WalletRow {
  id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  reference: string | null;
  created_at: string;
}

const columns: Column<WalletRow>[] = [
  {
    key: "date",
    header: "Date",
    render: (row) => new Date(row.created_at).toLocaleString(),
    className: "whitespace-nowrap text-xs text-muted-foreground",
  },
  {
    key: "type",
    header: "Type",
    render: (row) => (
      <Badge tone={row.type === "credit" ? "success" : "neutral"}>{row.type}</Badge>
    ),
  },
  { key: "description", header: "Description", render: (row) => row.description },
  {
    key: "amount",
    header: "Amount",
    render: (row) => (
      <span className={row.type === "credit" ? "font-medium text-primary" : "font-medium"}>
        {row.type === "credit" ? "+" : "−"}
        {formatCurrency(Number(row.amount))}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Balance after",
    render: (row) => formatCurrency(Number(row.balance_after)),
    className: "text-muted-foreground",
  },
];

export default function WalletHistoryPage() {
  return (
    <>
      <PageHeader
        title="Wallet History"
        description="Top-ups and message charges against your balance."
      />
      <WalletTopUp />
      <LedgerTable
        queryKey={["analytics", "wallet"]}
        endpoint="/analytics/wallet"
        columns={columns}
        emptyIcon={Wallet}
        emptyTitle="No wallet activity"
        emptyDescription="Top-ups and debits will be listed here."
      />
    </>
  );
}
