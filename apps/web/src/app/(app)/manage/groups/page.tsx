"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Pencil, Plus, Search, Send, Trash2, UserRound, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { ConfirmDialog, Modal, SettingsSection, StatTile } from "../_components/settings-kit";

interface Group {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

const AVATAR_GRADIENTS = [
  "from-brand-600 to-brand-magenta",
  "from-brand-500 to-brand-pink",
  "from-brand-magenta to-brand-orange",
  "from-brand-700 to-brand-400",
  "from-brand-pink to-brand-yellow",
];

function gradientFor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function ManageGroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null);

  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: Group[] }>("/groups"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["groups"] });

  const create = useMutation({
    mutationFn: () =>
      api.post("/groups", {
        name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
      }),
    onSuccess: () => {
      toast.success("Group created");
      setName("");
      setDescription("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the group"),
  });

  const update = useMutation({
    mutationFn: (group: Group) =>
      api.patch(`/groups/${group.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      }),
    onSuccess: () => {
      toast.success("Group updated");
      setEditing(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update the group"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => {
      toast.success("Group deleted");
      setPendingDelete(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = useMemo(() => groups.data?.data ?? [], [groups.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalMembers = rows.reduce((sum, g) => sum + (g.contactCount ?? 0), 0);
  const largest = rows.reduce<Group | null>(
    (best, g) => (!best || g.contactCount > best.contactCount ? g : best),
    null,
  );

  const openEdit = (group: Group) => {
    setEditing(group);
    setEditName(group.name);
    setEditDescription(group.description ?? "");
  };

  return (
    <>
      <PageHeader
        title="Manage Groups"
        description="Organise contacts into groups you can target from Send By Groups."
        actions={
          <Link href="/campaigns/send/groups" className={buttonVariants({ variant: "outline" })}>
            <Send size={16} />
            Send by group
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={UsersRound} label="Groups" value={groups.isSuccess ? rows.length : null} />
        <StatTile
          icon={Users}
          label="Memberships"
          tone="soft"
          value={groups.isSuccess ? totalMembers : null}
          hint="Contacts can belong to several groups"
        />
        <StatTile
          icon={UserRound}
          label="Largest group"
          tone="soft"
          value={groups.isSuccess ? (largest?.contactCount ?? 0) : null}
          hint={largest ? largest.name : "No groups yet"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SettingsSection
          icon={FolderPlus}
          title="Create a group"
          description="Add contacts to it from the Contacts page."
          className="xl:sticky xl:top-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="space-y-4"
          >
            <Field label="Group name" required>
              {({ id }) => (
                <Input
                  id={id}
                  required
                  minLength={1}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Premium customers"
                />
              )}
            </Field>
            <Field label="Description" hint="Optional — helps your team pick the right audience.">
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Customers who purchased more than twice"
                />
              )}
            </Field>
            <Button type="submit" className="w-full" loading={create.isPending} disabled={!name.trim()}>
              {!create.isPending && <Plus size={16} />}
              Add group
            </Button>
          </form>
        </SettingsSection>

        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold">All groups</h2>
              <p className="text-sm text-muted-foreground">Click a card to rename or describe it.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search groups"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups…"
                className="h-10 pl-9"
              />
            </div>
          </div>

          {groups.isError ? (
            <div className="p-5">
              <ErrorState message="Could not load groups." onRetry={() => void groups.refetch()} />
            </div>
          ) : groups.isLoading ? (
            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No groups yet"
              description="Create a group, then add contacts to it from the Contacts page."
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description={`No group matches “${search}”.`} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence>
                {filtered.map((group, i) => (
                  <motion.li
                    key={group.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: Math.min(i, 12) * 0.04 } }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                    whileHover={{ y: -3 }}
                    className="group relative flex flex-col rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:border-brand-200 hover:shadow-lift"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-display text-sm font-bold text-white shadow-soft",
                          gradientFor(group.id),
                        )}
                      >
                        {initials(group.name, "G")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openEdit(group)}
                          className="block max-w-full truncate text-left font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/40"
                        >
                          {group.name}
                        </button>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {group.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
                        <Users size={12} />
                        {group.contactCount.toLocaleString()}{" "}
                        {group.contactCount === 1 ? "contact" : "contacts"}
                      </span>
                      <div className="relative z-10 flex items-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Edit ${group.name}`}
                          onClick={() => openEdit(group)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Delete ${group.name}`}
                          onClick={() => setPendingDelete(group)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit group"
        description="Renaming a group doesn't change its members."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-group-form" loading={update.isPending} disabled={!editName.trim()}>
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="edit-group-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (editing) update.mutate(editing);
          }}
          className="space-y-4"
        >
          <Field label="Group name" required>
            {({ id }) => (
              <Input
                id={id}
                required
                maxLength={120}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Description">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={500}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        loading={remove.isPending}
        title="Delete this group?"
        description={
          pendingDelete ? (
            <>
              <b>{pendingDelete.name}</b> will be removed. Its contacts stay in your workspace.
            </>
          ) : undefined
        }
      />
    </>
  );
}
