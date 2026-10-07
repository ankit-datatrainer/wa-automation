"use client";

import Link from "next/link";
import { Info, KeyRound, MessageCircle, Plus, Receipt, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatedNumber, Stagger, StaggerItem } from "@/components/motion";
import { cn, formatCurrency } from "@/lib/utils";
import type { ChargesData } from "./types";

const CATEGORY_META: Record<string, { title: string; subtitle: string; icon: LucideIcon; tile: string }> = {
  marketing: {
    title: "Marketing",
    subtitle: "Promotions, offers and announcements",
    icon: TrendingUp,
    tile: "from-[#833ab4] to-[#c13584]",
  },
  utility: {
    title: "Utility",
    subtitle: "Order updates and account alerts",
    icon: MessageCircle,
    tile: "from-[#6d28d9] to-[#833ab4]",
  },
  authentication: {
    title: "Authentication",
    subtitle: "One-time passcodes and verification",
    icon: KeyRound,
    tile: "from-[#c13584] to-[#e1306c]",
  },
  service: {
    title: "Service",
    subtitle: "Replies inside the 24-hour window",
    icon: MessageCircle,
    tile: "from-[#e1306c] to-[#f77737]",
  },
};

/** Per-message rates are fractions of a rupee, so keep up to four decimals. */
function formatRate(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  } catch {
    return `${amount.toFixed(4)} ${currency}`;
  }
}

/** Per-message pricing for the account's country, plus the wallet balance it draws from. */
export function PricingCard({
  charges,
  loading,
  error,
  onRetry,
  balance,
  currency,
}: {
  charges: ChargesData | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  balance: number | null;
  currency: string;
}) {
  const rows = charges?.charges ?? [];

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-primary">
              <Receipt size={16} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight">Message pricing</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-message cost by template category{charges?.country ? ` · ${charges.country}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 flex-1">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message="Could not load message pricing." onRetry={onRetry} />
        ) : rows.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-4 text-sm text-muted-foreground">
            <Info size={16} className="mt-0.5 shrink-0 text-primary" />
            Pricing for your country hasn&apos;t been published yet. Contact support for current rates.
          </div>
        ) : (
          <Stagger className="space-y-2.5" stagger={0.05}>
            {rows.map((row) => {
              const meta = CATEGORY_META[row.category] ?? {
                title: row.category,
                subtitle: row.description ?? "",
                icon: MessageCircle,
                tile: "from-[#6d28d9] to-[#833ab4]",
              };
              const Icon = meta.icon;
              return (
                <StaggerItem
                  key={row.category}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white transition-transform group-hover:scale-105",
                        meta.tile,
                      )}
                    >
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold capitalize">{meta.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.description ?? meta.subtitle}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-base font-bold tabular-nums">
                      {formatRate(Number(row.price), row.currency || currency)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">per message</p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-inset ring-brand-100">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary shadow-soft">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Wallet balance</p>
            <p className="font-display text-xl font-bold">
              {balance === null ? (
                "—"
              ) : (
                <AnimatedNumber value={balance} format={(n) => formatCurrency(n, currency)} />
              )}
            </p>
          </div>
        </div>
        <Link href="/analytics/wallet" className={buttonVariants({ size: "sm" })}>
          <Plus size={15} />
          Add funds
        </Link>
      </div>
    </Card>
  );
}
