"use client";

import { CalendarRange, CreditCard, Download, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { LedgerTable, type Column } from "@/components/data/ledger-table";
import { FadeIn } from "@/components/motion";
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

const fmtDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const columns: Column<SubscriptionRow>[] = [
  {
    key: "plan",
    header: "Plan",
    render: (row) => (
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
          <Sparkles size={15} />
        </span>
        <span className="font-semibold capitalize">{row.plan}</span>
      </div>
    ),
  },
  {
    key: "period",
    header: "Billing period",
    render: (row) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
        <CalendarRange size={14} className="text-primary/70" />
        {fmtDate(row.period_start)} – {fmtDate(row.period_end)}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => (
      <span className="font-semibold tabular-nums">
        {formatCurrency(Number(row.amount), row.currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge tone={statusTone(row.status)} className="capitalize">
        {row.status.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    key: "invoice",
    header: "Invoice",
    className: "text-right",
    render: (row) =>
      row.invoice_url ? (
        <a
          href={row.invoice_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primary transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Download size={14} />
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
      <FadeIn>
        <LedgerTable
          queryKey={["analytics", "subscriptions"]}
          endpoint="/analytics/subscriptions"
          columns={columns}
          title="Billing periods"
          description="Most recent period first"
          emptyIcon={CreditCard}
          emptyTitle="No subscription history"
          emptyDescription="Your billing periods will be listed here once you move onto a paid plan."
        />
      </FadeIn>
    </>
  );
}
