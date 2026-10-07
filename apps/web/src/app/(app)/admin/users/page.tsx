"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, FadeIn, Stagger, motion, ease } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ConfirmDialog, Modal, Sheet } from "../../platform/_components/overlay";
import { Avatar, KpiTile, MotionTR, relation, timeAgo } from "../../platform/_components/ui";
import { PermissionMatrix, permissionLabel } from "./permission-matrix";

interface Member {
  id: string;
  role: string;
  permissions: string[] | null;
  is_online: boolean;
  last_active_at?: string | null;
  users: unknown;
}

type MemberUser = { id: string; name: string | null; email: string };
type AssignableRole = "admin" | "manager" | "agent";

const ROLE_OPTIONS: { value: AssignableRole; label: string; description: string; icon: LucideIcon }[] = [
  { value: "admin", label: "Admin", description: "Full access to everything", icon: ShieldCheck },
  { value: "manager", label: "Manager", description: "Campaigns, templates & team", icon: UserCog },
  { value: "agent", label: "Agent", description: "Inbox and assigned chats", icon: Users },
];

const hasAllPermissions = (role: string) => role === "owner" || role === "admin";

export default function UserPermissionManagerPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => api.get<{ data: Member[] }>("/admin/members"),
  });

  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.get<{ permissions: string[]; roles: string[] }>("/admin/permissions"),
  });

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user?: { id: string } }>("/me"),
    staleTime: 60_000,
  });
  const myId = me.data?.user?.id;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["members"] });

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
      setRemoving(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not remove"),
  });

  const rows = members.data?.data ?? [];
  const permissionCatalog = catalog.data?.permissions ?? [];
  const admins = rows.filter((m) => hasAllPermissions(m.role)).length;
  const online = rows.filter((m) => m.is_online).length;

  return (
    <>
      <PageHeader
        title="Users & Permissions"
        description="Invite teammates, set their role and fine-tune exactly what each of them can do."
        onRefresh={() => void members.refetch()}
        refreshing={members.isFetching}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} />
            Invite user
          </Button>
        }
      />

      <Stagger className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile icon={Users} label="Team members" value={rows.length} loading={members.isLoading} sublabel="In this workspace" />
        <KpiTile icon={Crown} label="Owners & admins" value={admins} loading={members.isLoading} sublabel="Hold every permission" />
        <KpiTile icon={Wifi} label="Online now" value={online} loading={members.isLoading} tone="success" sublabel="Available right now" />
      </Stagger>

      <FadeIn delay={0.1}>
        <Card className="overflow-hidden">
          {members.isError ? (
            <div className="p-4">
              <ErrorState
                message={
                  members.error instanceof ApiClientError && members.error.status === 403
                    ? "Only workspace admins can manage users and permissions."
                    : "Could not load members."
                }
                onRetry={() => void members.refetch()}
              />
            </div>
          ) : members.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teammates yet"
              description="Invite your team to share the inbox and run campaigns together."
              action={
                <Button onClick={() => setInviteOpen(true)}>
                  <UserPlus size={16} />
                  Invite user
                </Button>
              }
            />
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
                {rows.map((member, index) => {
                  const user = relation<MemberUser>(member.users);
                  const isOwner = member.role === "owner";
                  const isMe = !!myId && user?.id === myId;
                  const perms = member.permissions ?? [];
                  return (
                    <MotionTR key={member.id} index={index}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={user?.name ?? user?.email} online={member.is_online} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-semibold">
                              <span className="max-w-[200px] truncate">{user?.name ?? "Pending invite"}</span>
                              {isMe && <Badge tone="brand">You</Badge>}
                            </p>
                            <p className="max-w-[220px] truncate text-xs text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        {isOwner ? (
                          <Badge tone="brand">
                            <Crown size={12} />
                            Owner
                          </Badge>
                        ) : (
                          <Select
                            aria-label={`Role for ${user?.email ?? "member"}`}
                            className="h-9 w-36 text-sm"
                            value={member.role}
                            disabled={updateRole.isPending && updateRole.variables?.id === member.id}
                            onChange={(e) => updateRole.mutate({ id: member.id, newRole: e.target.value })}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="agent">Agent</option>
                          </Select>
                        )}
                      </TD>
                      <TD>
                        {hasAllPermissions(member.role) ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <ShieldCheck size={14} />
                            All permissions
                          </span>
                        ) : perms.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Role defaults</span>
                        ) : (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {perms.slice(0, 3).map((p) => (
                              <Badge key={p} tone="neutral" title={p}>
                                {permissionLabel(p)}
                              </Badge>
                            ))}
                            {perms.length > 3 && <Badge tone="brand">+{perms.length - 3}</Badge>}
                          </div>
                        )}
                      </TD>
                      <TD>
                        <div className="space-y-0.5">
                          <Badge tone={member.is_online ? "success" : "neutral"}>
                            {member.is_online ? "Online" : "Offline"}
                          </Badge>
                          {!member.is_online && member.last_active_at && (
                            <p className="text-[11px] text-muted-foreground">{timeAgo(member.last_active_at)}</p>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1.5">
                          {!hasAllPermissions(member.role) && (
                            <Button size="sm" variant="secondary" onClick={() => setEditing(member)}>
                              <KeyRound size={14} />
                              Permissions
                            </Button>
                          )}
                          {!isOwner && !isMe && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-destructive hover:bg-rose-50"
                              aria-label={`Remove ${user?.email ?? "member"}`}
                              title="Remove member"
                              onClick={() => setRemoving(member)}
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </TD>
                    </MotionTR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </FadeIn>

      <AnimatePresence>
        {inviteOpen && (
          <InviteDialog
            key="invite"
            catalog={permissionCatalog}
            onClose={() => setInviteOpen(false)}
            onInvited={() => void invalidate()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <PermissionsSheet
            key={`perm-${editing.id}`}
            member={editing}
            catalog={permissionCatalog}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void invalidate();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            key={`remove-${removing.id}`}
            onClose={() => setRemoving(null)}
            onConfirm={() => remove.mutate(removing.id)}
            loading={remove.isPending}
            icon={Trash2}
            tone="destructive"
            title="Remove member?"
            confirmLabel="Remove"
            description={
              <>
                <span className="font-semibold text-foreground">
                  {relation<MemberUser>(removing.users)?.email ?? "This member"}
                </span>{" "}
                will lose access to this workspace immediately. You can invite them again later.
              </>
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}

function RolePicker({ value, onChange }: { value: AssignableRole; onChange: (role: AssignableRole) => void }) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {ROLE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <motion.button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-2xl border bg-white p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              selected ? "border-primary shadow-glow ring-1 ring-primary" : "hover:border-brand-200",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-xl transition-colors",
                selected ? "bg-brand-gradient text-white" : "bg-brand-50 text-primary",
              )}
            >
              <option.icon size={15} />
            </span>
            <p className="mt-2 text-sm font-semibold">{option.label}</p>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}

function InviteDialog({
  catalog,
  onClose,
  onInvited,
}: {
  catalog: string[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("agent");
  const [permissions, setPermissions] = useState<string[]>([]);

  const invite = useMutation({
    mutationFn: () =>
      api.post("/admin/members", {
        email: email.trim(),
        role,
        permissions: role === "admin" ? [] : permissions,
      }),
    onSuccess: () => {
      toast.success("Invitation sent");
      onInvited();
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not invite"),
  });

  return (
    <Modal
      onClose={onClose}
      icon={UserPlus}
      title="Invite a teammate"
      description="They'll get an email invitation to join this workspace."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="invite-member-form" loading={invite.isPending}>
            {!invite.isPending && <Mail size={16} />}
            Send invitation
          </Button>
        </>
      }
    >
      <form
        id="invite-member-form"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate();
        }}
        className="space-y-5"
      >
        <Field label="Email" required>
          {({ id }) => (
            <Input
              id={id}
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
            />
          )}
        </Field>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground/90">
            Role<span className="ml-0.5 text-brand-pink">*</span>
          </p>
          <RolePicker value={role} onChange={setRole} />
        </div>

        <AnimatePresence initial={false} mode="wait">
          {role === "admin" ? (
            <motion.p
              key="admin-note"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-700"
            >
              Admins hold every permission automatically.
            </motion.p>
          ) : (
            <motion.div
              key="matrix"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="space-y-2"
            >
              <p className="text-sm font-semibold text-foreground/90">Additional permissions</p>
              {catalog.length === 0 ? (
                <Skeleton className="h-40" />
              ) : (
                <PermissionMatrix catalog={catalog} value={permissions} onChange={setPermissions} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Modal>
  );
}

function PermissionsSheet({
  member,
  catalog,
  onClose,
  onSaved,
}: {
  member: Member;
  catalog: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const user = relation<MemberUser>(member.users);
  const [permissions, setPermissions] = useState<string[]>(member.permissions ?? []);

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/members/${member.id}`, { permissions }),
    onSuccess: () => {
      toast.success("Permissions saved");
      onSaved();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save permissions"),
  });

  return (
    <Sheet
      onClose={onClose}
      icon={KeyRound}
      size="xl"
      title="Permissions"
      description={`${user?.name ?? user?.email ?? "Member"} · ${member.role}`}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={save.isPending} onClick={() => save.mutate()}>
            Save permissions
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-brand-50/40 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={user?.name ?? user?.email} size="lg" online={member.is_online} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.name ?? "Pending invite"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Badge tone="brand" className="capitalize">
            {permissions.length}/{catalog.length} granted
          </Badge>
        </div>
        {catalog.length === 0 ? (
          <Skeleton className="h-64" />
        ) : (
          <PermissionMatrix catalog={catalog} value={permissions} onChange={setPermissions} disabled={save.isPending} />
        )}
      </div>
    </Sheet>
  );
}
