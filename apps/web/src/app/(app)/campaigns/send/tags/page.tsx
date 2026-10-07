"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  GitMerge,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tag as TagIcon,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Stagger, StaggerItem, ease } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { CampaignComposer } from "../contacts/_kit/campaign-composer";
import { ChipTray, RollingNumber } from "../contacts/_kit/send-ui";
import {
  displayName,
  isUuid,
  type ContactRow,
  type Paginated,
  type SampleContact,
  type TagOption,
} from "../contacts/_kit/types";

/** Contacts fetched per selected tag to de-duplicate the audience estimate. */
const ESTIMATE_PAGE = 100;

const TAG_COLORS = ["#833AB4", "#C13584", "#E1306C", "#F77737", "#FCAF45", "#6D28D9", "#0EA5E9", "#64748B"];

function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
  });
}

/**
 * Resolves the selected tags to a de-duplicated contact list, mirroring the
 * API's "any of these tags, minus opted-out" audience rule.
 */
function useTagAudience(tagIds: string[]) {
  const results = useQueries({
    queries: tagIds.map((tagId) => ({
      queryKey: ["contacts", "send-tag-audience", tagId],
      queryFn: () =>
        api.get<Paginated<ContactRow>>("/contacts", {
          tagId,
          pageSize: ESTIMATE_PAGE,
          sortBy: "name",
          sortDir: "asc",
        }),
    })),
  });

  return useMemo(() => {
    const union = new Map<string, ContactRow>();
    let rawTotal = 0;
    let unfetched = 0;
    for (const r of results) {
      if (!r.data) continue;
      rawTotal += r.data.total;
      unfetched += Math.max(0, r.data.total - r.data.data.length);
      for (const c of r.data.data) union.set(c.id, c);
    }
    const all = [...union.values()];
    const reachable = all.filter((c) => c.opt_in_status !== "opted_out");
    return {
      loading: results.some((r) => r.isLoading),
      fetching: results.some((r) => r.isFetching),
      error: results.some((r) => r.isError),
      reachable,
      optedOut: all.length - reachable.length,
      duplicates: Math.max(0, rawTotal - unfetched - all.length),
      /** When a tag has more contacts than we fetched, the count is an upper bound. */
      approximate: unfetched > 0,
      estimate: reachable.length + unfetched,
    };
  }, [results]);
}

export default function SendByTagsPage() {
  const tags = useTags();
  const [rawSelectedIds, setSelectedIds] = useState<string[]>([]);

  const tagList = tags.data?.data ?? [];
  // Drop selections whose tag no longer exists (deleted elsewhere, or the API's
  // sample tags disappearing once the first real tag is created) so a stale id
  // can't silently block sending or end up in audienceConfig.
  const selectedIds = useMemo(() => {
    if (!tags.data) return rawSelectedIds;
    const known = new Set(tagList.map((t) => t.id));
    return rawSelectedIds.filter((id) => known.has(id));
  }, [rawSelectedIds, tags.data, tagList]);
  const selectedTags = tagList.filter((t) => selectedIds.includes(t.id));
  const realIds = selectedIds.filter(isUuid);
  const hasSampleTags = selectedIds.some((id) => !isUuid(id));
  const audience = useTagAudience(realIds);

  const first = audience.reachable[0];
  const sample: SampleContact | null = first ? { id: first.id, name: first.name, waId: first.wa_id } : null;

  const toggle = (id: string) =>
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <CampaignComposer
      audienceType="tags"
      title="Send By Tags"
      description="Target everyone carrying one or more tags — VIPs, leads, customers — with a single approved template."
      audienceTitle="Choose tags"
      audienceDescription="Contacts with any of the selected tags get the message once."
      audienceActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void tags.refetch()}
          disabled={tags.isFetching}
          aria-label="Refresh tags"
        >
          <RefreshCw size={14} className={cn(tags.isFetching && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
      audienceContent={
        <TagPicker
          tags={tagList}
          loading={tags.isLoading}
          error={tags.isError}
          onRetry={() => void tags.refetch()}
          selectedIds={selectedIds}
          onToggle={toggle}
          onSelect={(id) => setSelectedIds((cur) => (cur.includes(id) ? cur : [...cur, id]))}
          onClear={() => setSelectedIds([])}
          audience={audience}
          hasSampleTags={hasSampleTags}
        />
      }
      audience={{
        ready: selectedIds.length > 0,
        blocker: hasSampleTags
          ? "Sample tags can't be used. Create your own tags and assign them to contacts first."
          : audience.error
            ? "We couldn't check the contacts in these tags. Try refreshing."
            : audience.loading
              ? "Counting contacts in the selected tags…"
              : null,
        recipientCount: hasSampleTags ? 0 : audience.estimate,
        approximate: audience.approximate,
        summary: `${selectedTags.length} tag${selectedTags.length === 1 ? "" : "s"}${
          selectedTags.length ? ` · ${selectedTags.map((t) => t.name).slice(0, 3).join(", ")}${selectedTags.length > 3 ? "…" : ""}` : ""
        }`,
        config: { tagIds: realIds },
      }}
      sample={sample}
      onReset={() => setSelectedIds([])}
    />
  );
}

function TagPicker({
  tags,
  loading,
  error,
  onRetry,
  selectedIds,
  onToggle,
  onSelect,
  onClear,
  audience,
  hasSampleTags,
}: {
  tags: TagOption[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  audience: ReturnType<typeof useTagAudience>;
  hasSampleTags: boolean;
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  }, [tags, search]);

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id));

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message="We couldn't load your tags." onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      {tags.length === 0 && !creating ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30">
          <EmptyState
            icon={TagIcon}
            title="No tags yet"
            description="Tags group contacts so you can message them together. Create one, then tag contacts from the Contacts page."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus size={15} />
                  Create a tag
                </Button>
                <Link href="/contacts" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Users size={15} />
                  Go to contacts
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <ChipTray
            label={`Selected tags · ${selectedTags.length}`}
            emptyLabel="Pick one or more tags below."
            items={selectedTags.map((t) => ({ id: t.id, label: t.name, color: t.color }))}
            onRemove={onToggle}
            onClear={onClear}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search tags"
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {!creating && (
              <Button variant="secondary" onClick={() => setCreating(true)}>
                <Plus size={16} />
                New tag
              </Button>
            )}
          </div>
        </>
      )}

      <AnimatePresence initial={false}>
        {creating && (
          <NewTagForm
            existing={tags}
            onCancel={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              onSelect(id);
            }}
          />
        )}
      </AnimatePresence>

      {tags.length > 0 &&
        (filtered.length === 0 ? (
          <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No tags match “{search}”.
          </p>
        ) : (
          <Stagger
            role="group"
            aria-label="Tags"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
            stagger={0.04}
          >
            {filtered.map((t) => {
              const active = selectedIds.includes(t.id);
              const count = t.contactCount ?? 0;
              const color = t.color || "#833AB4";
              return (
                <StaggerItem key={t.id}>
                  <motion.button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(t.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-white p-3.5 text-left transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
                      active
                        ? "border-primary bg-brand-50/50 shadow-lift ring-1 ring-primary/30"
                        : "border-border/80 hover:border-brand-200 hover:shadow-soft",
                    )}
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-soft"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                    >
                      <TagIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{t.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {count.toLocaleString()} contact{count === 1 ? "" : "s"}
                        {!isUuid(t.id) && " · sample"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all duration-200",
                        active
                          ? "border-transparent bg-brand-gradient text-white"
                          : "border-input text-transparent group-hover:border-brand-300",
                      )}
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </motion.button>
                </StaggerItem>
              );
            })}
          </Stagger>
        ))}

      <AnimatePresence initial={false}>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <AudiencePreview audience={audience} hasSampleTags={hasSampleTags} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AudiencePreview({
  audience,
  hasSampleTags,
}: {
  audience: ReturnType<typeof useTagAudience>;
  hasSampleTags: boolean;
}) {
  if (hasSampleTags) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Sample tags come from the demo workspace and don&apos;t contain real contacts. Create your own tags to send.
      </div>
    );
  }

  const people = audience.reachable.slice(0, 6);
  const more = audience.estimate - people.length;

  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-brand-50/70 via-white to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-700">Audience preview</p>
          <p className="mt-1 flex items-baseline gap-2 font-display text-3xl font-bold text-foreground">
            {audience.approximate && <span className="text-xl text-muted-foreground">≈</span>}
            <RollingNumber value={audience.estimate} />
            <span className="text-sm font-semibold text-muted-foreground">unique recipients</span>
            {audience.fetching && <Loader2 size={16} className="animate-spin text-brand-500" aria-label="Updating" />}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">
            <GitMerge size={12} />
            {audience.duplicates.toLocaleString()} duplicate{audience.duplicates === 1 ? "" : "s"} merged
          </Badge>
          <Badge tone={audience.optedOut ? "danger" : "neutral"}>
            <UserMinus size={12} />
            {audience.optedOut.toLocaleString()} opted out
          </Badge>
        </div>
      </div>

      {audience.loading ? (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      ) : audience.error ? (
        <p className="mt-3 text-sm text-destructive">Couldn&apos;t load contacts for these tags.</p>
      ) : audience.estimate === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No reachable contacts carry these tags yet.{" "}
          <Link href="/contacts" className="font-semibold text-primary underline-offset-2 hover:underline">
            Tag some contacts
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {people.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease }}
                className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3 text-xs font-semibold text-foreground/80 shadow-[0_1px_2px_rgba(40,16,70,0.05)]"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
                  {initials(c.name, "#")}
                </span>
                <span className="truncate">{displayName(c)}</span>
              </motion.li>
            ))}
            {more > 0 && (
              <motion.li
                key="__more"
                layout
                className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                +{more.toLocaleString()} more
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function NewTagForm({
  existing,
  onCancel,
  onCreated,
}: {
  existing: TagOption[];
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]!);
  const trimmed = name.trim();
  // Only the org's own tags count — the API's sample tags aren't stored rows.
  const duplicate = existing.some((t) => isUuid(t.id) && t.name.toLowerCase() === trimmed.toLowerCase());
  const error = duplicate ? "A tag with this name already exists." : trimmed.length > 60 ? "Keep it under 60 characters." : null;

  const create = useMutation({
    mutationFn: () => api.post<{ id: string; name: string; color: string }>("/tags", { name: trimmed, color }),
    onSuccess: async (tag) => {
      toast.success(`Tag “${tag.name}” created`);
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      onCreated(tag.id);
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : "Could not create the tag"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || error) return;
    create.mutate();
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease }}
      className="overflow-hidden"
    >
      <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Create a new tag</p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel new tag"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-tag-name" className="text-xs font-semibold text-foreground/80">
            Tag name
          </label>
          <Input
            id="new-tag-name"
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer promo"
            aria-invalid={!!error || undefined}
          />
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground/80" id="new-tag-color">
            Color
          </p>
          <div role="radiogroup" aria-labelledby="new-tag-color" className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  color === c && "ring-2 ring-foreground/70",
                )}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={14} className="text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          New tags start empty — assign them to contacts on the{" "}
          <Link href="/contacts" className="font-semibold text-primary hover:underline">
            Contacts
          </Link>{" "}
          page.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={!trimmed || !!error}>
            {!create.isPending && <Plus size={15} />}
            Create tag
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
