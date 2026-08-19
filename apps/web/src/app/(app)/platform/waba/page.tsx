"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  CheckCircle2,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { OrgDetailsDrawer } from "../organizations/org-details-drawer";

interface WabaAccountRow {
  id: string;
  organization_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone: string;
  verified_name: string | null;
  quality_rating: "high" | "medium" | "low" | "unknown" | null;
  messaging_tier: string | null;
  status: "connected" | "offline" | "pending" | string;
  last_synced_at: string | null;
  created_at: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    is_suspended: boolean;
  } | null;
}

export default function PlatformWabaPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [quality, setQuality] = useState("");
  const [inspectOrgId, setInspectOrgId] = useState<string | null>(null);

  const wabas = useQuery({
    queryKey: ["platform", "waba-accounts", { page, search, status, quality }],
    queryFn: () =>
      api.get<{ data: WabaAccountRow[]; page: number; totalPages: number; total: number }>(
        "/platform/waba-accounts",
        {
          page,
          pageSize: 25,
          search: search || undefined,
          status: status || undefined,
          quality: quality || undefined,
        },
      ),
  });

  const rows = wabas.data?.data ?? [];

  const qualityTone = (q?: string | null) => {
    switch (q) {
      case "high":
        return "success";
      case "medium":
        return "warning";
      case "low":
        return "danger";
      default:
        return "neutral";
    }
  };

  const connectedCount = rows.filter((r) => r.status === "connected").length;
  const highQualityCount = rows.filter((r) => r.quality_rating === "high").length;
  const flaggedCount = rows.filter((r) => r.quality_rating === "low").length;

  return (
    <>
      <PageHeader
        title="WhatsApp Numbers"
        description="Global health, quality ratings, messaging limits and connection status across all tenants."
        onRefresh={() => void wabas.refetch()}
        refreshing={wabas.isFetching}
      />

      {/* Top summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Phone size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Accounts
            </p>
            <p className="text-2xl font-bold">{wabas.data?.total ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected & Live
            </p>
            <p className="text-2xl font-bold">{connectedCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              High Quality
            </p>
            <p className="text-2xl font-bold">{highQualityCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              flaggedCount > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <ShieldAlert size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low / Flagged
            </p>
            <p className="text-2xl font-bold">{flaggedCount}</p>
          </div>
        </Card>
      </div>

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by phone number or verified business name..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            className="w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="connected">Connected</option>
            <option value="offline">Offline</option>
            <option value="pending">Pending</option>
          </Select>

          <Select
            className="w-40"
            value={quality}
            onChange={(e) => {
              setQuality(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Quality</option>
            <option value="high">High (Good)</option>
            <option value="medium">Medium (Fair)</option>
            <option value="low">Low (Poor)</option>
          </Select>
        </div>

        {wabas.isError ? (
          <ErrorState
            message="Could not load WhatsApp numbers. Please retry."
            onRetry={() => void wabas.refetch()}
          />
        ) : wabas.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Phone}
            title="No WhatsApp numbers found"
            description="No WABA accounts match the selected filter."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>WhatsApp Number</TH>
                  <TH>Tenant Organization</TH>
                  <TH>Quality Rating</TH>
                  <TH>Messaging Tier</TH>
                  <TH>Status</TH>
                  <TH>Last Synced</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Phone size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm">{row.display_phone || "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.verified_name || "Unverified"}
                          </p>
                        </div>
                      </div>
                    </TD>

                    <TD>
                      {row.organizations ? (
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{row.organizations.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.organizations.slug}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Orphaned</span>
                      )}
                    </TD>

                    <TD>
                      <Badge tone={qualityTone(row.quality_rating)}>
                        {row.quality_rating?.toUpperCase() || "UNKNOWN"}
                      </Badge>
                    </TD>

                    <TD>
                      <span className="font-semibold text-xs text-muted-foreground">
                        {row.messaging_tier || "TIER_1K"}
                      </span>
                    </TD>

                    <TD>
                      <Badge tone={row.status === "connected" ? "success" : "neutral"}>
                        {row.status}
                      </Badge>
                    </TD>

                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.last_synced_at
                        ? new Date(row.last_synced_at).toLocaleDateString()
                        : "—"}
                    </TD>

                    <TD>
                      <div className="flex justify-end">
                        {row.organization_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setInspectOrgId(row.organization_id)}
                          >
                            Inspect Tenant
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={wabas.data!.page}
              totalPages={wabas.data!.totalPages}
              total={wabas.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {inspectOrgId && (
        <OrgDetailsDrawer
          organizationId={inspectOrgId}
          onClose={() => setInspectOrgId(null)}
          onOpenWallet={() => {}}
          onOpenPlan={() => {}}
          onToggleSuspend={() => {}}
        />
      )}
    </>
  );
}
