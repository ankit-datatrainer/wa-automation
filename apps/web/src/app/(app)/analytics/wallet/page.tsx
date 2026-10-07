"use client";

import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { LedgerTable, type Column } from "@/components/data/ledger-table";
import { FadeIn } from "@/components/motion";
import { WalletTopUp } from "./top-up";
import { cn, formatCurrency } from "@/lib/utils";

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
    key: "description",
    header: "Transaction",
    render: (row) => {
      const credit = row.type === "credit";
      const Icon = credit ? ArrowDownLeft : ArrowUpRight;
      return (
        <div className="flex min-w-[200px] items-center gap-3">
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1",
              credit
                ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                : "bg-brand-50 text-primary ring-brand-100",
            )}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.description}</p>
            {row.reference && (
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {row.reference}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    key: "type",
    header: "Type",
    render: (row) => (
      <Badge tone={row.type === "credit" ? "success" : "neutral"} className="capitalize">
        {row.type}
      </Badge>
    ),
  },
  {
    key: "date",
    header: "Date",
    render: (row) => new Date(row.created_at).toLocaleString(),
    className: "whitespace-nowrap text-xs text-muted-foreground",
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right",
    render: (row) => (
      <span
        className={cn(
          "whitespace-nowrap font-semibold tabular-nums",
          row.type === "credit" ? "text-emerald-600" : "text-foreground",
        )}
      >
        {row.type === "credit" ? "+" : "−"}
        {formatCurrency(Number(row.amount))}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Balance after",
    render: (row) => formatCurrency(Number(row.balance_after)),
    className: "whitespace-nowrap text-right tabular-nums text-muted-foreground",
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
      <FadeIn delay={0.12}>
        <LedgerTable
          queryKey={["analytics", "wallet"]}
          endpoint="/analytics/wallet"
          columns={columns}
          title="Transactions"
          description="Credits and debits, newest first"
          emptyIcon={Wallet}
          emptyTitle="No wallet activity"
          emptyDescription="Top-ups and debits will be listed here."
        />
      </FadeIn>
    </>
  );
}
