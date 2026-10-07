"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, FadeIn } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { ConfirmDialog } from "../_components/overlay";
import { Avatar, MotionTR, SearchField, relation, useDebouncedValue } from "../_components/ui";

interface PlatformUser {
  id: string;
  email: string;
  name: string | null;
  country: string | null;
  is_super_admin: boolean;
  created_at: string;
  memberships: { role: string; organization: unknown }[];
}

export default function PlatformUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [target, setTarget] = useState<PlatformUser | null>(null);

  const users = useQuery({
    queryKey: ["platform", "users", { page, search: debouncedSearch }],
    queryFn: () =>
      api.get<{ data: PlatformUser[]; page: number; totalPages: number; total: number }>("/platform/users", {
        page,
        pageSize: 25,
        search: debouncedSearch,
      }),
    placeholderData: (previous) => previous,
  });

  const toggleSuperAdmin = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      api.post(`/platform/users/${id}/super-admin`, { isSuperAdmin: next }),
    onSuccess: (_, vars) => {
      toast.success(vars.next ? "Platform admin granted" : "Platform admin revoked");
      setTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
  });

  const rows = users.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="All Users"
        description="Every user across every organization, and who holds platform administrator rights."
        onRefresh={() => void users.refetch()}
        refreshing={users.isFetching}
      />

      <FadeIn>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchField
              label="Search users"
              placeholder="Search by name or email…"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              className="sm:max-w-md"
            />
            {users.data && (
              <p className="shrink-0 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{users.data.total.toLocaleString()}</span> users
              </p>
            )}
          </div>

          {users.isError ? (
            <div className="p-4">
              <ErrorState
                message="Could not load users. This area is restricted to platform administrators."
                onRetry={() => void users.refetch()}
              />
            </div>
          ) : users.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="Nobody matches that search." />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>User</TH>
                    <TH>Organizations</TH>
                    <TH>Joined</TH>
                    <TH>Platform role</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((user, index) => (
                    <MotionTR key={user.id} index={index}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name ?? user.email} />
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold">{user.name ?? "Unnamed"}</p>
                            <p className="max-w-[220px] truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex max-w-sm flex-wrap gap-1">
                          {user.memberships.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            user.memberships.map((m, i) => {
                              const org = relation<{ id: string; name: string }>(m.organization);
                              return (
                                <Badge key={`${org?.id ?? i}-${m.role}`} tone="neutral" title={m.role}>
                                  <span className="max-w-[140px] truncate">{org?.name ?? "—"}</span>
                                  <span className="capitalize opacity-60">· {m.role}</span>
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TD>
                      <TD>
                        {user.is_super_admin ? (
                          <Badge tone="brand">
                            <ShieldCheck size={12} />
                            Super admin
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Standard</span>
                        )}
                      </TD>
                      <TD>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={user.is_super_admin ? "outline" : "secondary"}
                            className={user.is_super_admin ? "text-destructive" : undefined}
                            onClick={() => setTarget(user)}
                          >
                            {user.is_super_admin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                            {user.is_super_admin ? "Revoke admin" : "Make super admin"}
                          </Button>
                        </div>
                      </TD>
                    </MotionTR>
                  ))}
                </TBody>
              </Table>

              <Pagination
                page={users.data!.page}
                totalPages={users.data!.totalPages}
                total={users.data!.total}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      </FadeIn>

      <AnimatePresence>
        {target && (
          <ConfirmDialog
            key={`admin-${target.id}`}
            onClose={() => setTarget(null)}
            onConfirm={() => toggleSuperAdmin.mutate({ id: target.id, next: !target.is_super_admin })}
            loading={toggleSuperAdmin.isPending}
            icon={target.is_super_admin ? ShieldOff : ShieldCheck}
            tone={target.is_super_admin ? "destructive" : "primary"}
            title={target.is_super_admin ? "Revoke platform admin?" : "Grant platform admin?"}
            confirmLabel={target.is_super_admin ? "Revoke access" : "Grant access"}
            description={
              target.is_super_admin ? (
                <>
                  <span className="font-semibold text-foreground">{target.name ?? target.email}</span> will lose
                  access to the platform console. The last remaining administrator cannot be revoked.
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{target.name ?? target.email}</span> will be
                  able to see and manage every tenant, wallet and plan on the platform. This is recorded in the
                  audit log.
                </>
              )
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
