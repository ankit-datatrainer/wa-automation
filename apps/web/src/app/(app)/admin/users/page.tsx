"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { relation } from "@/components/data/ledger-table";
import { api, ApiClientError } from "@/lib/api-client";
import { initials } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  permissions: string[];
  is_online: boolean;
  users: unknown;
}

export default function UserPermissionManagerPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [permissions, setPermissions] = useState<string[]>([]);

  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => api.get<{ data: Member[] }>("/admin/members"),
  });

  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.get<{ permissions: string[]; roles: string[] }>("/admin/permissions"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["members"] });

  const invite = useMutation({
    mutationFn: () => api.post("/admin/members", { email: email.trim(), role, permissions }),
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setEmail("");
      setPermissions([]);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not invite"),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: string }) =>
      api.patch(`/admin/members/${id}`, { role: newRole }),
    onSuccess: () => {
      toast.success("Role updated");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update the role"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/members/${id}`),
    onSuccess: () => {
      toast.success("Member removed");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not remove"),
  });

  const rows = members.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="User and Permission Manager"
        description="Invite teammates and control what each of them can do."
        actions={
          <Button onClick={() => setInviteOpen((open) => !open)}>
            <UserPlus size={16} />
            Invite user
          </Button>
        }
      />

      {inviteOpen && (
        <Card className="mb-4 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@company.com"
                  />
                )}
              </Field>
              <Field label="Role" required>
                {({ id }) => (
                  <Select id={id} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="admin">Admin — full access</option>
                    <option value="manager">Manager — campaigns and templates</option>
                    <option value="agent">Agent — inbox only</option>
                  </Select>
                )}
              </Field>
            </div>

            {role === "agent" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Additional permissions</p>
                <div className="flex flex-wrap gap-2">
                  {catalog.data?.permissions.map((permission) => {
                    const active = permissions.includes(permission);
                    return (
                      <button
                        key={permission}
                        type="button"
                        onClick={() =>
                          setPermissions((current) =>
                            active
                              ? current.filter((p) => p !== permission)
                              : [...current, permission],
                          )
                        }
                        className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        {permission}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" loading={invite.isPending}>
                Send invitation
              </Button>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {members.isError ? (
          <ErrorState message="Could not load members." onRetry={() => void members.refetch()} />
        ) : members.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Member</TH>
                <TH>Role</TH>
                <TH>Permissions</TH>
                <TH>Presence</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((member) => {
                const user = relation<{ name: string | null; email: string }>(member.users);
                const isOwner = member.role === "owner";
                return (
                  <TR key={member.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(user?.name ?? user?.email)}
                        </span>
                        <div>
                          <p className="font-medium">{user?.name ?? "Pending invite"}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      {isOwner ? (
                        <Badge tone="success">
                          <ShieldCheck size={12} />
                          Owner
                        </Badge>
                      ) : (
                        <Select
                          className="h-9 w-36"
                          value={member.role}
                          onChange={(e) =>
                            updateRole.mutate({ id: member.id, newRole: e.target.value })
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="agent">Agent</option>
                        </Select>
                      )}
                    </TD>
                    <TD>
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {member.role === "owner" || member.role === "admin"
                          ? "All permissions"
                          : member.permissions.length > 0
                            ? member.permissions.join(", ")
                            : "Role defaults"}
                      </p>
                    </TD>
                    <TD>
                      <Badge tone={member.is_online ? "success" : "neutral"}>
                        {member.is_online ? "Online" : "Offline"}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {!isOwner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${user?.email}`}
                            onClick={() => remove.mutate(member.id)}
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
