"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { initials } from "@/lib/utils";

interface PlatformUser {
  id: string;
  email: string;
  name: string | null;
  country: string | null;
  is_super_admin: boolean;
  created_at: string;
  memberships: { role: string; organization: { id: string; name: string } | null }[];
}

export default function PlatformUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const users = useQuery({
    queryKey: ["platform", "users", { page, search }],
    queryFn: () =>
      api.get<{ data: PlatformUser[]; page: number; totalPages: number; total: number }>(
        "/platform/users",
        { page, pageSize: 25, search },
      ),
  });

  const toggleSuperAdmin = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      api.post(`/platform/users/${id}/super-admin`, { isSuperAdmin: next }),
    onSuccess: (_, vars) => {
      toast.success(vars.next ? "Platform admin granted" : "Platform admin revoked");
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
        description="Every user across every organization on the platform."
        onRefresh={() => void users.refetch()}
        refreshing={users.isFetching}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {users.isError ? (
          <ErrorState
            message="Could not load users. This area is restricted to platform administrators."
            onRetry={() => void users.refetch()}
          />
        ) : users.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
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
                {rows.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(user.name ?? user.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {user.memberships.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          user.memberships.map((m, i) => (
                            <Badge key={i} title={m.role}>
                              {m.organization?.name ?? "—"}
                              <span className="opacity-60"> · {m.role}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TD>
                    <TD>
                      {user.is_super_admin ? (
                        <Badge tone="success">
                          <ShieldCheck size={12} />
                          Super Admin
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
                          loading={
                            toggleSuperAdmin.isPending &&
                            toggleSuperAdmin.variables?.id === user.id
                          }
                          onClick={() =>
                            toggleSuperAdmin.mutate({ id: user.id, next: !user.is_super_admin })
                          }
                        >
                          {user.is_super_admin ? "Revoke admin" : "Make super admin"}
                        </Button>
                      </div>
                    </TD>
                  </TR>
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
    </>
  );
}
