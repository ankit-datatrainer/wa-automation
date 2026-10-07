"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Phone, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, FadeIn, Stagger } from "@/components/motion";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { KpiTile, MotionTR, SearchField, timeAgo, useDebouncedValue } from "../_components/ui";
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
  status: string;
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

type WabaPage = { data: WabaAccountRow[]; page: number; totalPages: number; total: number };

const qualityTone = (q?: string | null) =>
  q === "high" ? "success" : q === "medium" ? "warning" : q === "low" ? "danger" : "neutral";

const QUALITY_BAR: Record<string, string> = {
  high: "w-full bg-emerald-500",
  medium: "w-2/3 bg-amber-500",
  low: "w-1/3 bg-rose-500",
};

/** Platform-wide count for a filter, read from the paginated endpoint's `total`. */
function useWabaCount(filter: { status?: string; quality?: string }) {
  return useQuery({
    queryKey: ["platform", "waba-accounts", "count", filter],
    queryFn: () => api.get<WabaPage>("/platform/waba-accounts", { page: 1, pageSize: 1, ...filter }),
    select: (res) => res.total,
  });
}

export default function PlatformWabaPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState("");
  const [quality, setQuality] = useState("");
  const [inspectOrgId, setInspectOrgId] = useState<string | null>(null);

  const wabas = useQuery({
    queryKey: ["platform", "waba-accounts", { page, search: debouncedSearch, status, quality }],
    queryFn: () =>
      api.get<WabaPage>("/platform/waba-accounts", {
        page,
        pageSize: 25,
        search: debouncedSearch || undefined,
        status: status || undefined,
        quality: quality || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const total = useWabaCount({});
  const connected = useWabaCount({ status: "connected" });
  const high = useWabaCount({ quality: "high" });
  const low = useWabaCount({ quality: "low" });

  const rows = wabas.data?.data ?? [];
  const lowCount = low.data ?? 0;

  return (
    <>
      <PageHeader
        title="WhatsApp Numbers"
        description="Health, quality ratings, messaging tiers and connection status for every tenant number."
        onRefresh={() => {
          void wabas.refetch();
          void total.refetch();
          void connected.refetch();
          void high.refetch();
          void low.refetch();
        }}
        refreshing={wabas.isFetching}
      />

      <Stagger className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={Phone} label="Total numbers" value={total.data ?? 0} loading={total.isLoading} sublabel="Across all tenants" />
        <KpiTile
          icon={CheckCircle2}
          label="Connected & live"
          value={connected.data ?? 0}
          loading={connected.isLoading}
          tone="success"
          sublabel="Sending through Cloud API"
        />
        <KpiTile icon={ShieldCheck} label="High quality" value={high.data ?? 0} loading={high.isLoading} sublabel="Green rating from Meta" />
        <KpiTile
          icon={ShieldAlert}
          label="Low / flagged"
          value={lowCount}
          loading={low.isLoading}
          tone={lowCount > 0 ? "danger" : "neutral"}
          sublabel="Need attention"
          badge={lowCount > 0 ? <Badge tone="danger">Review</Badge> : undefined}
        />
      </Stagger>

      <FadeIn delay={0.1}>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <SearchField
              label="Search numbers"
              placeholder="Search by phone number or verified business name…"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <div className="grid grid-cols-2 gap-3 lg:flex">
              <Select
                aria-label="Filter by status"
                className="lg:w-44"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {/* Must match the waba_status enum, or Postgres rejects the filter. */}
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
                <option value="error">Error</option>
              </Select>
              <Select
                aria-label="Filter by quality"
                className="lg:w-44"
                value={quality}
                onChange={(e) => {
                  setQuality(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All quality</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="unknown">Unknown</option>
              </Select>
            </div>
          </div>

          {wabas.isError ? (
            <div className="p-4">
              <ErrorState message="Could not load WhatsApp numbers." onRetry={() => void wabas.refetch()} />
            </div>
          ) : wabas.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No WhatsApp numbers found"
              description={
                search || status || quality
                  ? "No numbers match the selected filters."
                  : "Numbers appear here once tenants connect their WhatsApp Business accounts."
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>WhatsApp number</TH>
                    <TH>Organization</TH>
                    <TH>Quality</TH>
                    <TH>Messaging tier</TH>
                    <TH>Status</TH>
                    <TH>Last synced</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((row, index) => (
                    <MotionTR key={row.id} index={index}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-inset ring-brand-100">
                            <Phone size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="whitespace-nowrap font-semibold">{row.display_phone || "—"}</p>
                            <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {row.verified_name || "Unverified"}
                            </p>
                          </div>
                        </div>
                      </TD>

                      <TD>
                        {row.organizations ? (
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium">
                              <span className="max-w-[180px] truncate">{row.organizations.name}</span>
                              {row.organizations.is_suspended && <Badge tone="danger">Suspended</Badge>}
                            </p>
                            <p className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                              {row.organizations.slug}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Orphaned</span>
                        )}
                      </TD>

                      <TD>
                        <div className="w-24 space-y-1.5">
                          <Badge tone={qualityTone(row.quality_rating)}>
                            {row.quality_rating?.toUpperCase() || "UNKNOWN"}
                          </Badge>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${QUALITY_BAR[row.quality_rating ?? ""] ?? "w-0"}`}
                            />
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <span className="whitespace-nowrap rounded-lg bg-muted px-2 py-1 font-mono text-xs font-semibold text-muted-foreground">
                          {row.messaging_tier || "—"}
                        </span>
                      </TD>

                      <TD>
                        <Badge tone={statusTone(row.status)} className="capitalize">
                          {row.status === "connected" && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                          )}
                          {row.status}
                        </Badge>
                      </TD>

                      <TD
                        className="whitespace-nowrap text-xs text-muted-foreground"
                        title={row.last_synced_at ? new Date(row.last_synced_at).toLocaleString() : undefined}
                      >
                        {timeAgo(row.last_synced_at)}
                      </TD>

                      <TD>
                        <div className="flex justify-end">
                          {row.organization_id && (
                            <Button size="sm" variant="secondary" onClick={() => setInspectOrgId(row.organization_id)}>
                              Inspect tenant
                            </Button>
                          )}
                        </div>
                      </TD>
                    </MotionTR>
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
      </FadeIn>

      <AnimatePresence>
        {inspectOrgId && (
          <OrgDetailsDrawer
            key={`waba-org-${inspectOrgId}`}
            organizationId={inspectOrgId}
            onClose={() => setInspectOrgId(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
