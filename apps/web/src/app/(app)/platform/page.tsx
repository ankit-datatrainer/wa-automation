"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Globe,
  LifeBuoy,
  MessageSquare,
  Phone,
  ScrollText,
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
import { LoadingScreen } from "@/components/ui/loading-screen";
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
  openTickets?: number;
}

interface AuditLogRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function PlatformOverviewPage() {
  const stats = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => api.get<PlatformStats>("/platform/stats"),
  });

  const recentAudit = useQuery({
    queryKey: ["platform", "audit-recent"],
    queryFn: () =>
      api.get<{ data: AuditLogRow[] }>("/platform/audit-logs", { page: 1, pageSize: 5 }),
  });

  const s = stats.data;

  return (
    <>
      <LoadingScreen isSuperAdmin={true} isLoading={stats.isLoading} />
      <PageHeader
        title="Platform Overview"
        description="Global system telemetry, active tenants, and WhatsApp Cloud API infrastructure."
        onRefresh={() => {
          void stats.refetch();
          void recentAudit.refetch();
        }}
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
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              icon={Building2}
              label="Organizations"
              value={s.organizations.toLocaleString()}
              sublabel="Active tenants"
            />
            <Metric
              icon={ShieldAlert}
              label="Suspended Orgs"
              value={s.suspendedOrganizations.toLocaleString()}
              tone={s.suspendedOrganizations > 0 ? "danger" : "neutral"}
              sublabel="Access blocked"
            />
            <Metric
              icon={Users}
              label="Platform Users"
              value={s.users.toLocaleString()}
              sublabel="Across all orgs"
            />
            <Metric
              icon={Phone}
              label="Connected Numbers"
              value={s.connectedNumbers.toLocaleString()}
              sublabel="Meta Cloud API"
            />
            <Metric
              icon={Users}
              label="Total Contacts"
              value={s.contacts.toLocaleString()}
              sublabel="Tenant databases"
            />
            <Metric
              icon={Send}
              label="Total Campaigns"
              value={s.campaigns.toLocaleString()}
              sublabel="Broadcasts launched"
            />
            <Metric
              icon={MessageSquare}
              label="Messages Today"
              value={s.messagesToday.toLocaleString()}
              sublabel="Sent since midnight"
            />
            <Metric
              icon={Wallet}
              label="Platform Wallet Balance"
              value={formatCurrency(s.totalWalletBalance)}
              sublabel="Total tenant funds"
            />
          </div>

          {/* Quick Management Hub */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Management Modules
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/platform/organizations" className="group">
                <Card className="flex h-full flex-col justify-between p-5 transition-all hover:border-primary hover:shadow-md">
                  <div className="space-y-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Building2 size={20} />
                    </span>
                    <h3 className="font-bold">Organizations</h3>
                    <p className="text-xs text-muted-foreground">
                      Inspect tenant details, suspend bad actors, adjust wallet credits, and assign subscription plans.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    Manage Tenants <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>

              <Link href="/platform/plans" className="group">
                <Card className="flex h-full flex-col justify-between p-5 transition-all hover:border-primary hover:shadow-md">
                  <div className="space-y-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <CreditCard size={20} />
                    </span>
                    <h3 className="font-bold">Subscription Plans</h3>
                    <p className="text-xs text-muted-foreground">
                      Configure Starter, Pro, and Enterprise pricing tiers, contact limits, and message caps.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    Manage Plans <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>

              <Link href="/platform/waba" className="group">
                <Card className="flex h-full flex-col justify-between p-5 transition-all hover:border-primary hover:shadow-md">
                  <div className="space-y-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Phone size={20} />
                    </span>
                    <h3 className="font-bold">WhatsApp Numbers</h3>
                    <p className="text-xs text-muted-foreground">
                      Monitor global WABA numbers, Meta Cloud API quality scores, messaging tiers, and health status.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    Monitor Numbers <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>

              <Link href="/platform/support" className="group">
                <Card className="flex h-full flex-col justify-between p-5 transition-all hover:border-primary hover:shadow-md">
                  <div className="space-y-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <LifeBuoy size={20} />
                    </span>
                    <h3 className="font-bold">Support Desk</h3>
                    <p className="text-xs text-muted-foreground">
                      Centralized helpdesk for resolving tenant issues, priority tickets, and customer inquiries.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    Open Support Desk <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>

              <Link href="/platform/users" className="group">
                <Card className="flex h-full flex-col justify-between p-5 transition-all hover:border-primary hover:shadow-md">
                  <div className="space-y-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Users size={20} />
                    </span>
                    <h3 className="font-bold">All Users</h3>
                    <p className="text-xs text-muted-foreground">
                      View all platform users and promote or revoke Super Admin privileges with audit logging.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    Manage Users <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>

              <Link href="/platform/audit" className="group">
                <Card className="flex h-full flex-col justify-between p-5 transition-all hover:border-primary hover:shadow-md">
                  <div className="space-y-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ScrollText size={20} />
                    </span>
                    <h3 className="font-bold">Platform Audit Log</h3>
                    <p className="text-xs text-muted-foreground">
                      Full forensic trail of all administrative actions taken across organizations.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    View Audit Logs <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            </div>
          </div>

          {/* Recent Audit Trail Preview */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold">Recent Platform Actions</h3>
                <p className="text-xs text-muted-foreground">
                  Latest administrative operations across all organizations
                </p>
              </div>
              <Link
                href="/platform/audit"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all logs &rarr;
              </Link>
            </div>

            <div className="mt-4 divide-y">
              {recentAudit.isLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : recentAudit.data?.data && recentAudit.data.data.length > 0 ? (
                recentAudit.data.data.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {log.action.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-muted-foreground">
                        Actor: {log.actor?.name || log.actor?.email || "System"} · Target:{" "}
                        {log.target_type} ({log.target_id?.slice(0, 8)}…)
                      </p>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No recent audit records found.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "neutral",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sublabel?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span
        className={
          tone === "danger"
            ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
            : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
        }
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
        {sublabel && <p className="truncate text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {tone === "danger" && value !== "0" && <Badge tone="danger">Action</Badge>}
    </Card>
  );
}
