"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Plus, Search, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { AssignPlanDialog } from "./assign-plan-dialog";
import { CreateOrgDialog } from "./create-org-dialog";
import { OrgDetailsDrawer } from "./org-details-drawer";

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

export default function PlatformOrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [suspended, setSuspended] = useState("");
  const [walletTarget, setWalletTarget] = useState<Org | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletNote, setWalletNote] = useState("");
  const [planTarget, setPlanTarget] = useState<Org | null>(null);
  const [detailTarget, setDetailTarget] = useState<Org | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const orgs = useQuery({
    queryKey: ["platform", "organizations", { page, search, suspended }],
    queryFn: () =>
      api.get<{ data: Org[]; page: number; totalPages: number; total: number }>(
        "/platform/organizations",
        { page, pageSize: 25, search, suspended: suspended || undefined },
      ),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform"] });

  const toggleSuspend = useMutation({
    mutationFn: ({ id, next, reason }: { id: string; next: boolean; reason?: string }) =>
      api.post(`/platform/organizations/${id}/suspend`, { suspended: next, reason }),
    onSuccess: (_, vars) => {
      toast.success(vars.next ? "Organization suspended" : "Organization restored");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
  });

  const adjustWallet = useMutation({
    mutationFn: () =>
      api.post(`/platform/organizations/${walletTarget!.id}/wallet`, {
        amount: Number(walletAmount),
        description: walletNote.trim() || "Platform adjustment",
      }),
    onSuccess: () => {
      toast.success("Wallet adjusted");
      setWalletTarget(null);
      setWalletAmount("");
      setWalletNote("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Adjustment failed"),
  });

  const rows = orgs.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Every tenant on the platform. Suspend, adjust balances, or inspect usage."
        onRefresh={() => void orgs.refetch()}
        refreshing={orgs.isFetching}
        actions={
          <>
            <Link href="/platform/plans">
              <Button variant="outline">
                <CreditCard size={16} />
                Manage plans
              </Button>
            </Link>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New organization
            </Button>
          </>
        }
      />

      {walletTarget && (
        <Card className="mb-4 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adjustWallet.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <p className="font-bold">Adjust wallet — {walletTarget.name}</p>
              <p className="text-sm text-muted-foreground">
                Current balance {formatCurrency(Number(walletTarget.wallet_balance), walletTarget.currency)}.
                Use a negative amount to debit.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto]">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason</label>
                <Input
                  value={walletNote}
                  onChange={(e) => setWalletNote(e.target.value)}
                  placeholder="Goodwill credit"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" loading={adjustWallet.isPending}>
                  Apply
                </Button>
                <Button type="button" variant="outline" onClick={() => setWalletTarget(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search organizations..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-48"
            value={suspended}
            onChange={(e) => {
              setSuspended(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All organizations</option>
            <option value="false">Active only</option>
            <option value="true">Suspended only</option>
          </Select>
        </div>

        {orgs.isError ? (
          <ErrorState
            message="Could not load organizations. This area is restricted to platform administrators."
            onRetry={() => void orgs.refetch()}
          />
        ) : orgs.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizations found"
            description="No tenant matches the current filter."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Organization</TH>
                  <TH>Plan</TH>
                  <TH>Members</TH>
                  <TH>Contacts</TH>
                  <TH>Balance</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((org) => (
                  <TR key={org.id}>
                    <TD>
                      <p className="font-medium">{org.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{org.slug}</p>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        <Badge className="capitalize">{org.plan}</Badge>
                        {org.is_demo && <Badge tone="info">Demo</Badge>}
                      </div>
                    </TD>
                    <TD>{org.memberCount}</TD>
                    <TD>{org.contactCount}</TD>
                    <TD className="font-medium">
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
                            <p className="max-w-40 truncate text-xs text-muted-foreground">
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
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDetailTarget(org)}
                        >
                          Inspect
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPlanTarget(org)}>
                          <CreditCard size={14} />
                          Plan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setWalletTarget(org);
                            setWalletAmount("");
                            setWalletNote("");
                          }}
                        >
                          <Wallet size={14} />
                          Wallet
                        </Button>
                        <Button
                          size="sm"
                          variant={org.is_suspended ? "outline" : "destructive"}
                          loading={
                            toggleSuspend.isPending && toggleSuspend.variables?.id === org.id
                          }
                          onClick={() => {
                            const next = !org.is_suspended;
                            const reason = next
                              ? window.prompt("Reason for suspension (shown to the tenant):") ??
                                undefined
                              : undefined;
                            // A cancelled prompt aborts the suspension entirely.
                            if (next && reason === undefined) return;
                            toggleSuspend.mutate({ id: org.id, next, reason });
                          }}
                        >
                          {org.is_suspended ? "Restore" : "Suspend"}
                        </Button>
                      </div>
                    </TD>
                  </TR>
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

      {detailTarget && (
        <OrgDetailsDrawer
          organizationId={detailTarget.id}
          onClose={() => setDetailTarget(null)}
          onOpenWallet={(o) => {
            setDetailTarget(null);
            setWalletTarget(o as Org);
            setWalletAmount("");
            setWalletNote("");
          }}
          onOpenPlan={(o) => {
            setDetailTarget(null);
            setPlanTarget(o as Org);
          }}
          onToggleSuspend={(o) => {
            const next = !o.is_suspended;
            const reason = next
              ? window.prompt("Reason for suspension (shown to the tenant):") ?? undefined
              : undefined;
            if (next && reason === undefined) return;
            toggleSuspend.mutate({ id: o.id, next, reason });
          }}
        />
      )}

      {planTarget && (
        <AssignPlanDialog
          organizationId={planTarget.id}
          organizationName={planTarget.name}
          onClose={() => setPlanTarget(null)}
        />
      )}

      {createOpen && (
        <CreateOrgDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => void invalidate()}
        />
      )}
    </>
  );
}
