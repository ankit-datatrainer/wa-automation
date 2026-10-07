"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Filter, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { isUuid, Modal, TagChip, type TagOption } from "./ui";

export const TAG_COLORS = [
  "#833AB4",
  "#C13584",
  "#E1306C",
  "#F77737",
  "#FCAF45",
  "#2563EB",
  "#0EA5E9",
  "#10B981",
  "#64748B",
];

/** Inline "name + colour" form that creates a tag via POST /tags. */
export function NewTagForm({
  onCreated,
  compact,
}: {
  onCreated?: (tag: TagOption) => void;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]!);

  const create = useMutation({
    mutationFn: () => api.post<TagOption>("/tags", { name: name.trim(), color }),
    onSuccess: (tag) => {
      toast.success(`Tag “${tag.name}” created`);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      onCreated?.(tag);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the tag"),
  });

  const submit = () => {
    if (name.trim() && !create.isPending) create.mutate();
  };

  // A div rather than a <form>: this is also rendered inside the contact
  // drawer's form, and nested forms are invalid HTML.
  return (
    <div className={cn("space-y-2.5", !compact && "rounded-2xl border border-brand-100 bg-brand-50/40 p-3.5")}>
      <div className="flex gap-2">
        <Input
          aria-label="New tag name"
          placeholder="New tag name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="h-10"
        />
        <Button
          type="button"
          size="sm"
          className="h-10 shrink-0"
          disabled={!name.trim()}
          loading={create.isPending}
          onClick={submit}
        >
          {!create.isPending && <Plus size={15} />}
          Add
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Tag colour">
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Colour ${c}`}
            onClick={() => setColor(c)}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
              color === c && "ring-2 ring-offset-2",
            )}
            style={{ backgroundColor: c, ...(color === c ? { ["--tw-ring-color" as string]: c } : {}) }}
          >
            {color === c && <Check size={12} className="text-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TagsModal({
  open,
  onClose,
  activeTagId,
  onFilter,
}: {
  open: boolean;
  onClose: () => void;
  activeTagId: string;
  onFilter: (tagId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
    enabled: open,
  });
  const list = (tags.data?.data ?? []).filter((t) => isUuid(t.id));

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: (_data, id) => {
      toast.success("Tag deleted");
      setConfirmId(null);
      if (activeTagId === id) onFilter("");
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete the tag"),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Tags}
      title="Tags"
      description="Label contacts to segment them and target campaigns with “Send By Tags”."
    >
      <div className="space-y-5">
        <NewTagForm />

        {tags.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No tags yet. Create your first tag above.
          </p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {list.map((tag) => (
                <motion.li
                  key={tag.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5 transition hover:border-brand-200 hover:shadow-soft"
                >
                  <TagChip tag={tag} className="min-w-0" />
                  <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                    {(tag.contactCount ?? 0).toLocaleString()} contact{tag.contactCount === 1 ? "" : "s"}
                  </span>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {confirmId === tag.id ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          loading={remove.isPending}
                          onClick={() => remove.mutate(tag.id)}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant={activeTagId === tag.id ? "secondary" : "ghost"}
                          className="h-8"
                          onClick={() => {
                            onFilter(activeTagId === tag.id ? "" : tag.id);
                            onClose();
                          }}
                        >
                          <Filter size={13} />
                          {activeTagId === tag.id ? "Filtering" : "Filter"}
                        </Button>
                        <button
                          type="button"
                          aria-label={`Delete tag ${tag.name}`}
                          onClick={() => setConfirmId(tag.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Modal>
  );
}
