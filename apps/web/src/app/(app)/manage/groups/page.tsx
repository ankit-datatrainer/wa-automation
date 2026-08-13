"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface Group {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

export default function ManageGroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => {
      toast.success("Group deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = groups.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Manage Groups"
        description="Organise contacts into groups you can target from Send By Groups."
      />

      <Card className="mb-4 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-48 flex-1 space-y-1.5">
            <label className="text-sm font-medium">Group name</label>
            <Input
              required
              minLength={1}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Premium customers"
            />
          </div>
          <div className="min-w-48 flex-1 space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" loading={create.isPending}>
            <Plus size={16} />
            Add group
          </Button>
        </form>
      </Card>

      <Card>
        {groups.isError ? (
          <ErrorState message="Could not load groups." onRetry={() => void groups.refetch()} />
        ) : groups.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group above, then add contacts to it from the Contacts page."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Group</TH>
                <TH>Description</TH>
                <TH>Contacts</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((group) => (
                <TR key={group.id}>
                  <TD className="font-medium">{group.name}</TD>
                  <TD className="text-sm text-muted-foreground">{group.description ?? "—"}</TD>
                  <TD className="font-medium">{group.contactCount}</TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${group.name}`}
                        onClick={() => remove.mutate(group.id)}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
