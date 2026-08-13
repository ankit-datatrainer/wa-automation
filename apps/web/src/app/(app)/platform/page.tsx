"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Globe,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

interface PlatformStats {
  organizations: number;
  suspendedOrganizations: number;
  users: number;
  contacts: number;
  campaigns: number;
  messagesToday: number;
  connectedNumbers: number;
  totalWalletBalance: number;
}

export default function PlatformOverviewPage() {
  const stats = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => api.get<PlatformStats>("/platform/stats"),
  });

  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Platform Overview"
        description="Every organization on this deployment, across all tenants."
        onRefresh={() => void stats.refetch()}
        refreshing={stats.isFetching}
      />

      {stats.isError ? (
        <ErrorState
          message="Could not load platform statistics. This area is restricted to platform administrators."
          onRetry={() => void stats.refetch()}
        />
      ) : stats.isLoading || !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Building2} label="Organizations" value={s.organizations.toLocaleString()} />
            <Metric
              icon={ShieldAlert}
              label="Suspended"
              value={s.suspendedOrganizations.toLocaleString()}
              tone={s.suspendedOrganizations > 0 ? "danger" : "neutral"}
            />
            <Metric icon={Users} label="Users" value={s.users.toLocaleString()} />
            <Metric icon={Phone} label="Connected numbers" value={s.connectedNumbers.toLocaleString()} />
            <Metric icon={Users} label="Contacts" value={s.contacts.toLocaleString()} />
            <Metric icon={Send} label="Campaigns" value={s.campaigns.toLocaleString()} />
            <Metric icon={MessageSquare} label="Messages today" value={s.messagesToday.toLocaleString()} />
            <Metric
              icon={Wallet}
              label="Total wallet balance"
              value={formatCurrency(s.totalWalletBalance)}
            />
          </div>

          <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Globe size={20} />
              </span>
              <div>
                <p className="font-bold">Manage the platform</p>
                <p className="text-sm text-muted-foreground">
                  Suspend tenants, adjust wallets and grant administrator access.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/platform/organizations"
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Organizations
              </Link>
              <Link
                href="/platform/users"
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                All users
              </Link>
              <Link
                href="/platform/audit"
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Audit log
              </Link>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span
        className={
          tone === "danger"
            ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
            : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
        }
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      {tone === "danger" && value !== "0" && <Badge tone="danger">Action needed</Badge>}
    </Card>
  );
}
