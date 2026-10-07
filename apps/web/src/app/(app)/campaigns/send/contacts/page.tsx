"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CheckCheck, Loader2, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/table";
import { ease } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { CampaignComposer } from "./_kit/campaign-composer";
import { CheckMark, ChipTray, RollingNumber } from "./_kit/send-ui";
import {
  contactTags,
  displayName,
  formatPhone,
  isUuid,
  type ContactRow,
  type Paginated,
  type SampleContact,
  type TagOption,
} from "./_kit/types";

const PAGE_SIZE = 25;
/** "Select all matching" pulls at most this many contacts into the selection. */
const SELECT_ALL_LIMIT = 1000;

function toSample(c: ContactRow): SampleContact {
  return { id: c.id, name: c.name, waId: c.wa_id };
}

export default function SendToContactsPage() {
  const [selected, setSelected] = useState<Record<string, SampleContact>>({});

  const ids = useMemo(() => Object.keys(selected), [selected]);
  const sample = ids.length ? (selected[ids[0]!] ?? null) : null;
  const hasSampleIds = ids.some((id) => !isUuid(id));

  return (
    <CampaignComposer
      audienceType="contacts"
      title="Send to Contacts"
      description="Hand-pick recipients from your contact book and send them an approved WhatsApp template."
      audienceTitle="Choose recipients"
      audienceDescription="Search, filter by tag and select exactly who should receive this message."
      audienceContent={<ContactPicker selected={selected} onChange={setSelected} />}
      audience={{
        ready: ids.length > 0,
        blocker: hasSampleIds
          ? "Sample contacts can't receive campaigns. Add or import your real contacts first."
          : null,
        recipientCount: ids.length,
        summary: `${ids.length.toLocaleString()} contact${ids.length === 1 ? "" : "s"}`,
        config: { contactIds: ids },
      }}
      sample={sample}
      onReset={() => setSelected({})}
    />
  );
}

function ContactPicker({
  selected,
  onChange,
}: {
  selected: Record<string, SampleContact>;
  onChange: (next: Record<string, SampleContact>) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagId, setTagId] = useState("");
  const [page, setPage] = useState(1);
  const [selectingAll, setSelectingAll] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
  });
  // The contacts API validates tagId as a UUID, so sample tags can't filter.
  const filterTags = (tags.data?.data ?? []).filter((t) => isUuid(t.id));

  const query = { page, pageSize: PAGE_SIZE, search: search || undefined, tagId: tagId || undefined, sortBy: "name", sortDir: "asc" };
  const contacts = useQuery({
    queryKey: ["contacts", "send-picker", query],
    queryFn: () => api.get<Paginated<ContactRow>>("/contacts", query),
    placeholderData: keepPreviousData,
  });

  const rows = contacts.data?.data ?? [];
  const total = contacts.data?.total ?? 0;
  const totalPages = contacts.data?.totalPages ?? 1;
  const selectable = rows.filter((c) => c.opt_in_status !== "opted_out");
  const selectedOnPage = selectable.filter((c) => selected[c.id]).length;
  const allOnPage = selectable.length > 0 && selectedOnPage === selectable.length;
  const selectedCount = Object.keys(selected).length;

  const toggle = (c: ContactRow) => {
    if (c.opt_in_status === "opted_out") return;
    const next = { ...selected };
    if (next[c.id]) delete next[c.id];
    else next[c.id] = toSample(c);
    onChange(next);
  };

  const togglePage = () => {
    const next = { ...selected };
    if (allOnPage) selectable.forEach((c) => delete next[c.id]);
    else selectable.forEach((c) => (next[c.id] = toSample(c)));
    onChange(next);
  };

  const selectAllMatching = useCallback(async () => {
    setSelectingAll(true);
    try {
      const next = { ...selected };
      let added = 0;
      const pages = Math.ceil(Math.min(total, SELECT_ALL_LIMIT) / 100);
      for (let p = 1; p <= pages; p++) {
        const res = await api.get<Paginated<ContactRow>>("/contacts", {
          page: p,
          pageSize: 100,
          search: search || undefined,
          tagId: tagId || undefined,
          sortBy: "name",
          sortDir: "asc",
        });
        for (const c of res.data) {
          if (c.opt_in_status === "opted_out" || next[c.id]) continue;
          next[c.id] = toSample(c);
          added++;
        }
        if (res.data.length < 100) break;
      }
      onChange(next);
      toast.success(`Added ${added.toLocaleString()} contact${added === 1 ? "" : "s"} to the selection`);
    } catch {
      toast.error("Couldn't load every matching contact. Try again.");
    } finally {
      setSelectingAll(false);
    }
  }, [selected, total, search, tagId, onChange]);

  const noContactsAtAll = !contacts.isLoading && !contacts.isError && total === 0 && !search && !tagId;

  if (noContactsAtAll) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30">
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add contacts manually or import a CSV, then come back to send them a campaign."
          action={
            <Link href="/contacts" className={buttonVariants({ size: "sm" })}>
              <UserPlus size={15} />
              Add contacts
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChipTray
        label={`Selected · ${selectedCount.toLocaleString()}`}
        emptyLabel="No one selected yet — tick contacts below."
        items={Object.values(selected).map((c) => ({ id: c.id, label: displayName(c) }))}
        onRemove={(id) => {
          const next = { ...selected };
          delete next[id];
          onChange(next);
        }}
        onClear={() => onChange({})}
      />

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search contacts"
          placeholder="Search by name, phone or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
        {contacts.isFetching && !contacts.isLoading && (
          <Loader2
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-brand-500"
            aria-label="Loading"
          />
        )}
      </div>

      {filterTags.length > 0 && (
        <div className="scrollbar-none mask-fade-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by tag">
          {[{ id: "", name: "All contacts", color: null as string | null | undefined }, ...filterTags].map((t) => {
            const active = tagId === t.id;
            return (
              <button
                key={t.id || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTagId(t.id);
                  setPage(1);
                }}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-transparent text-white"
                    : "border-border bg-white text-foreground/80 hover:border-brand-200 hover:bg-brand-50",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="contacts-tag-filter"
                    className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {t.color && (
                  <span
                    className="relative h-2 w-2 rounded-full ring-1 ring-white/70"
                    style={{ backgroundColor: t.color }}
                  />
                )}
                <span className="relative">{t.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-brand-50/40 px-4 py-2.5">
          <button
            type="button"
            role="checkbox"
            aria-checked={allOnPage ? true : selectedOnPage > 0 ? "mixed" : false}
            onClick={togglePage}
            disabled={selectable.length === 0}
            className="inline-flex items-center gap-2.5 rounded-lg py-1 pr-2 text-sm font-semibold text-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            <CheckMark checked={allOnPage} indeterminate={selectedOnPage > 0} />
            Select page
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              <RollingNumber value={selectedCount} className="font-bold text-brand-700" /> selected
            </span>
            {total > rows.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-brand-700 hover:bg-brand-50"
                onClick={selectAllMatching}
                loading={selectingAll}
                title={total > SELECT_ALL_LIMIT ? `Selects the first ${SELECT_ALL_LIMIT.toLocaleString()}` : undefined}
              >
                {!selectingAll && <CheckCheck size={14} />}
                Select all {Math.min(total, SELECT_ALL_LIMIT).toLocaleString()}
                {total > SELECT_ALL_LIMIT ? " (max)" : ""}
              </Button>
            )}
          </div>
        </div>

        {contacts.isError ? (
          <div className="p-4">
            <ErrorState message="We couldn't load your contacts." onRetry={() => contacts.refetch()} />
          </div>
        ) : contacts.isLoading ? (
          <ul className="divide-y divide-border/70">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No contacts match {search ? `“${search}”` : "this filter"}.
          </p>
        ) : (
          <ul
            className={cn(
              "scrollbar-thin max-h-[520px] divide-y divide-border/70 overflow-y-auto transition-opacity",
              contacts.isPlaceholderData && "opacity-60",
            )}
          >
            {rows.map((c, i) => {
              const optedOut = c.opt_in_status === "opted_out";
              const isSelected = !!selected[c.id];
              const tagList = contactTags(c);
              const label = displayName(c);
              return (
                <motion.li
                  key={`${page}-${c.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease, delay: Math.min(i, 15) * 0.02 }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`${label}${optedOut ? " (opted out)" : ""}`}
                    disabled={optedOut}
                    onClick={() => toggle(c)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:bg-brand-50/70 focus-visible:outline-none",
                      isSelected ? "bg-brand-50/60" : "hover:bg-brand-50/40",
                      optedOut && "cursor-not-allowed",
                    )}
                  >
                    <CheckMark checked={isSelected} disabled={optedOut} />
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-200",
                        isSelected
                          ? "bg-brand-gradient text-white shadow-glow"
                          : "bg-brand-100 text-brand-700",
                        optedOut && "opacity-50",
                      )}
                    >
                      {initials(c.name, "#")}
                    </span>
                    <span className={cn("min-w-0 flex-1", optedOut && "opacity-60")}>
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {c.name?.trim() || "Unnamed contact"}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {formatPhone(c.wa_id)}
                        {c.email ? <span className="font-sans"> · {c.email}</span> : null}
                      </span>
                    </span>
                    <span className="hidden max-w-[45%] flex-wrap justify-end gap-1 md:flex">
                      {tagList.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-semibold text-foreground/70"
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color ?? "#833AB4" }} />
                          {t.name}
                        </span>
                      ))}
                      {tagList.length > 3 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          +{tagList.length - 3}
                        </span>
                      )}
                    </span>
                    {optedOut && <Badge tone="danger">Opted out</Badge>}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}

        {!contacts.isError && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
