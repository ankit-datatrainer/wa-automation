"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Eye, Plus, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, FadeIn, SegmentedTabs } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatCurrency, initials } from "@/lib/utils";
import { MotionTR, SearchField, useDebouncedValue } from "../_components/ui";
import { AssignPlanDialog } from "./assign-plan-dialog";
import { CreateOrgDialog } from "./create-org-dialog";
import { OrgDetailsDrawer } from "./org-details-drawer";
import { SuspendDialog, type SuspendTarget } from "./suspend-dialog";
import { WalletDialog, type WalletTarget } from "./wallet-dialog";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  wallet_balance: number;
  currency: string;
  is_demo: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
  memberCount: number;
  contactCount: number;
}

type StatusFilter = "" | "false" | "true";

export default function PlatformOrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [suspended, setSuspended] = useState<StatusFilter>("");
  const [walletTarget, setWalletTarget] = useState<WalletTarget | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null);
  const [planTarget, setPlanTarget] = useState<{ id: string; name: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const orgs = useQuery({
    queryKey: ["platform", "organizations", { page, search: debouncedSearch, suspended }],
    queryFn: () =>
      api.get<{ data: Org[]; page: number; totalPages: number; total: number }>(
        "/platform/organizations",
        { page, pageSize: 25, search: debouncedSearch, suspended: suspended || undefined },
      ),
    placeholderData: (previous) => previous,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform"] });

  const rows = orgs.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Every tenant on the platform. Inspect usage, assign plans, adjust balances or suspend access."
        onRefresh={() => void orgs.refetch()}
        refreshing={orgs.isFetching}
        actions={
          <>
            <Link href="/platform/plans" className={buttonVariants({ variant: "outline" })}>
              <CreditCard size={16} />
              Manage plans
            </Link>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New organization
            </Button>
          </>
        }
      />

      <FadeIn>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <SearchField
              label="Search organizations"
              placeholder="Search organizations by name…"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <div className="scrollbar-none overflow-x-auto">
              <SegmentedTabs<StatusFilter>
                layoutId="org-status-filter"
                value={suspended}
                onChange={(value) => {
                  setSuspended(value);
                  setPage(1);
                }}
                tabs={[
                  { value: "", label: "All" },
                  { value: "false", label: "Active" },
                  { value: "true", label: "Suspended" },
                ]}
              />
            </div>
          </div>

          {orgs.isError ? (
            <div className="p-4">
              <ErrorState
                message="Could not load organizations. This area is restricted to platform administrators."
                onRetry={() => void orgs.refetch()}
              />
            </div>
          ) : orgs.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organizations found"
              description={search || suspended ? "No tenant matches the current filter." : "Create the first tenant to get started."}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus size={16} />
                  New organization
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Organization</TH>
                    <TH>Plan</TH>
                    <TH className="text-right">Members</TH>
                    <TH className="text-right">Contacts</TH>
                    <TH className="text-right">Balance</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((org, index) => (
                    <MotionTR key={org.id} index={index} className="group">
                      <TD>
                        <button
                          type="button"
                          onClick={() => setDetailId(org.id)}
                          className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-primary ring-1 ring-inset ring-brand-100 transition group-hover:bg-brand-gradient group-hover:text-white group-hover:ring-transparent">
                            {initials(org.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[220px] truncate font-semibold">{org.name}</span>
                            <span className="block max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                              {org.slug}
                            </span>
                          </span>
                        </button>
                      </TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone="brand" className="capitalize">
                            {org.plan}
                          </Badge>
                          {org.is_demo && <Badge tone="info">Demo</Badge>}
                        </div>
                      </TD>
                      <TD className="text-right tabular-nums">{org.memberCount.toLocaleString()}</TD>
                      <TD className="text-right tabular-nums">{org.contactCount.toLocaleString()}</TD>
                      <TD className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {formatCurrency(Number(org.wallet_balance), org.currency)}
                      </TD>
                      <TD>
                        {org.is_suspended ? (
                          <div className="space-y-1">
                            <Badge tone="danger">
                              <ShieldAlert size={12} />
                              Suspended
                            </Badge>
                            {org.suspended_reason && (
                              <p className="max-w-40 truncate text-xs text-muted-foreground" title={org.suspended_reason}>
                                {org.suspended_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge tone="success">
                            <ShieldCheck size={12} />
                            Active
                          </Badge>
                        )}
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setDetailId(org.id)}>
                            <Eye size={14} />
                            Inspect
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label={`Assign plan to ${org.name}`}
                            title="Assign plan"
                            onClick={() => setPlanTarget({ id: org.id, name: org.name })}
                          >
                            <CreditCard size={15} />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label={`Adjust wallet of ${org.name}`}
                            title="Adjust wallet"
                            onClick={() => setWalletTarget(org)}
                          >
                            <Wallet size={15} />
                          </Button>
                          <Button
                            size="sm"
                            variant={org.is_suspended ? "outline" : "ghost"}
                            className={org.is_suspended ? undefined : "text-destructive hover:bg-rose-50"}
                            onClick={() => setSuspendTarget(org)}
                          >
                            {org.is_suspended ? "Restore" : "Suspend"}
                          </Button>
                        </div>
                      </TD>
                    </MotionTR>
                  ))}
                </TBody>
              </Table>

              <Pagination
                page={orgs.data!.page}
                totalPages={orgs.data!.totalPages}
                total={orgs.data!.total}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      </FadeIn>

      <AnimatePresence>
        {detailId && (
          <OrgDetailsDrawer
            key={`details-${detailId}`}
            organizationId={detailId}
            onClose={() => setDetailId(null)}
            onOpenWallet={(o) => setWalletTarget(o)}
            onOpenPlan={(o) => {
              setDetailId(null);
              setPlanTarget({ id: o.id, name: o.name });
            }}
            onToggleSuspend={(o) => setSuspendTarget(o)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {planTarget && (
          <AssignPlanDialog
            key={`plan-${planTarget.id}`}
            organizationId={planTarget.id}
            organizationName={planTarget.name}
            onClose={() => setPlanTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen && (
          <CreateOrgDialog key="create-org" onClose={() => setCreateOpen(false)} onCreated={() => void invalidate()} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {walletTarget && (
          <WalletDialog key={`wallet-${walletTarget.id}`} org={walletTarget} onClose={() => setWalletTarget(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suspendTarget && (
          <SuspendDialog
            key={`suspend-${suspendTarget.id}`}
            org={suspendTarget}
            onClose={() => setSuspendTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
