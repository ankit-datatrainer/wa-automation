"use client";

import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { LedgerTable, type Column } from "@/components/data/ledger-table";
import { formatCurrency } from "@/lib/utils";

interface SubscriptionRow {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: string;
  invoice_url: string | null;
}

const columns: Column<SubscriptionRow>[] = [
  { key: "plan", header: "Plan", render: (row) => <span className="font-medium capitalize">{row.plan}</span> },
  {
    key: "period",
    header: "Period",
    render: (row) =>
      `${new Date(row.period_start).toLocaleDateString()} – ${new Date(row.period_end).toLocaleDateString()}`,
    className: "whitespace-nowrap text-xs text-muted-foreground",
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => formatCurrency(Number(row.amount), row.currency),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
  },
  {
    key: "invoice",
    header: "Invoice",
    render: (row) =>
      row.invoice_url ? (
        <a
          href={row.invoice_url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Download
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export default function SubscriptionHistoryPage() {
  return (
    <>
      <PageHeader
        title="Subscription History"
        description="Your billing periods, plan changes and invoices."
      />
      <LedgerTable
        queryKey={["analytics", "subscriptions"]}
        endpoint="/analytics/subscriptions"
        columns={columns}
        emptyIcon={CreditCard}
        emptyTitle="No subscription history"
        emptyDescription="Your billing periods will be listed here once you move onto a paid plan."
      />
    </>
  );
}
