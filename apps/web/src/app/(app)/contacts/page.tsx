"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FilterX,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  AnimatedNumber,
  AnimatePresence,
  ease,
  motion,
  SegmentedTabs,
  Spotlight,
  Stagger,
  StaggerItem,
} from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { BulkBar, type BulkAction } from "./bulk-bar";
import { ContactDrawer } from "./contact-drawer";
import { downloadCsv, toCsv } from "./csv";
import { ImportContactsModal } from "./import-modal";
import { TagsModal } from "./tags-modal";
import {
  ContactAvatar,
  formatPhone,
  isUuid,
  Modal,
  optInLabel,
  OptInBadge,
  PopoverMenu,
  TagChip,
  useDebounced,
  type GroupOption,
  type OptInStatus,
  type TagOption,
} from "./ui";
import { useStartConversation } from "./use-start-conversation";

interface ContactRow {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  attributes?: Record<string, unknown> | null;
  opt_in_status: OptInStatus;
  source: string | null;
  last_seen_at?: string | null;
  created_at: string;
  contact_tags?: { tag_id?: string; tags: TagOption | null }[];
}

interface ContactsResponse {
  data: ContactRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type OptInFilter = "all" | OptInStatus;
type SortKey = "newest" | "oldest" | "name" | "phone";

const SORTS: Record<SortKey, { label: string; sortBy: string; sortDir: "asc" | "desc" }> = {
  newest: { label: "Newest first", sortBy: "created_at", sortDir: "desc" },
  oldest: { label: "Oldest first", sortBy: "created_at", sortDir: "asc" },
  name: { label: "Name (A–Z)", sortBy: "name", sortDir: "asc" },
  phone: { label: "Phone number", sortBy: "wa_id", sortDir: "asc" },
};

const PAGE_SIZES = [10, 25, 50, 100];

function rowTags(contact: ContactRow) {
  return (contact.contact_tags ?? []).map((ct) => ct.tags).filter((t): t is TagOption => !!t);
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const startConversation = useStartConversation();

  const [searchInput, setSearchInput] = useState("");
  // The API embeds the term in a PostgREST or() filter, where , ( ) * % \ are
  // syntax — strip them so e.g. "Smith, John" searches instead of erroring.
  const search = useDebounced(searchInput.replace(/[,()*%\\]/g, " ").replace(/\s+/g, " ").trim(), 300);
  const [optIn, setOptIn] = useState<OptInFilter>("all");
  const [tagId, setTagId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [drawer, setDrawer] = useState<{ open: boolean; contactId: string | null }>({
    open: false,
    contactId: null,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState(false);

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      optInStatus: optIn === "all" ? undefined : optIn,
      tagId: isUuid(tagId) ? tagId : undefined,
      groupId: isUuid(groupId) ? groupId : undefined,
      sortBy: SORTS[sort].sortBy,
      sortDir: SORTS[sort].sortDir,
    }),
    [search, optIn, tagId, groupId, sort],
  );

  // Any change to what is listed resets paging and selection.
  useEffect(() => {
    setPage(1);
  }, [filterParams, pageSize]);
  useEffect(() => {
    setSelected(new Set());
  }, [filterParams, page, pageSize]);

  const contacts = useQuery({
    queryKey: ["contacts", { page, pageSize, ...filterParams }],
    queryFn: () => api.get<ContactsResponse>("/contacts", { page, pageSize, ...filterParams }),
    placeholderData: keepPreviousData,
  });

  const stats = useQuery({
    queryKey: ["contacts", "stats"],
    queryFn: async () => {
      const [all, optedIn, optedOut] = await Promise.all([
        api.get<ContactsResponse>("/contacts", { page: 1, pageSize: 1 }),
        api.get<ContactsResponse>("/contacts", { page: 1, pageSize: 1, optInStatus: "opted_in" }),
        api.get<ContactsResponse>("/contacts", { page: 1, pageSize: 1, optInStatus: "opted_out" }),
      ]);
      return { total: all.total, optedIn: optedIn.total, optedOut: optedOut.total };
    },
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
  });
  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: GroupOption[] }>("/groups"),
  });
  const tagOptions = useMemo(() => (tagsQuery.data?.data ?? []).filter((t) => isUuid(t.id)), [tagsQuery.data]);
  const groupOptions = useMemo(
    () => (groupsQuery.data?.data ?? []).filter((g) => isUuid(g.id)),
    [groupsQuery.data],
  );

  const rows = contacts.data?.data ?? [];
  const total = contacts.data?.total ?? 0;
  const totalPages = Math.max(1, contacts.data?.totalPages ?? 1);
  const hasFilters = !!(search || optIn !== "all" || tagId || groupId);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
    void queryClient.invalidateQueries({ queryKey: ["groups"] });
  }, [queryClient]);

  // -------------------------------------------------------------- selection
  const headerCheckbox = useRef<HTMLInputElement>(null);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPage = rows.some((r) => selected.has(r.id));
  useEffect(() => {
    if (headerCheckbox.current) headerCheckbox.current.indeterminate = someOnPage && !allOnPage;
  }, [someOnPage, allOnPage]);

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));

  // -------------------------------------------------------------- mutations
  const persistedIds = (ids: string[]) => {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) toast.error("These are sample contacts and can't be changed.");
    return valid;
  };

  const bulk = useMutation({
    mutationFn: (input: BulkAction & { contactIds: string[] }) =>
      api.post<{ affected: number }>("/contacts/bulk", input),
    onSuccess: (data, input) => {
      const verb =
        input.action === "add_tags"
          ? "Tagged"
          : input.action === "remove_tags"
            ? "Untagged"
            : input.action === "add_groups"
              ? "Added to group:"
              : `Marked ${optInLabel(input.optInStatus).toLowerCase()}:`;
      toast.success(`${verb} ${data.affected} contact${data.affected === 1 ? "" : "s"}`);
      setSelected(new Set());
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Bulk update failed"),
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1) {
        await api.delete(`/contacts/${ids[0]}`);
        return ids.length;
      }
      const res = await api.post<{ affected: number }>("/contacts/bulk", { contactIds: ids, action: "delete" });
      return res.affected;
    },
    onSuccess: (count, ids) => {
      toast.success(`Deleted ${count} contact${count === 1 ? "" : "s"}`);
      setConfirmDelete(null);
      setSelected(new Set());
      if (drawer.contactId && ids.includes(drawer.contactId)) setDrawer({ open: false, contactId: null });
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete contacts"),
  });

  const requestDelete = (ids: string[]) => {
    const valid = persistedIds(ids);
    if (valid.length) setConfirmDelete(valid);
  };

  const runBulk = (action: BulkAction) => {
    const ids = persistedIds([...selected]);
    if (ids.length) bulk.mutate({ ...action, contactIds: ids });
  };

  // -------------------------------------------------------------- export
  const exportRows = (list: ContactRow[], label: string) => {
    const attrKeys = [...new Set(list.flatMap((c) => Object.keys(c.attributes ?? {})))];
    const csv = toCsv(
      ["Name", "Phone", "Email", "Opt-in status", "Tags", "Source", "Created at", ...attrKeys],
      list.map((c) => [
        c.name ?? "",
        c.wa_id,
        c.email ?? "",
        c.opt_in_status,
        rowTags(c)
          .map((t) => t.name)
          .join("; "),
        c.source ?? "",
        c.created_at,
        ...attrKeys.map((k) => {
          const v = c.attributes?.[k];
          return v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        }),
      ]),
    );
    downloadCsv(`contacts_${label}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${list.length.toLocaleString()} contact${list.length === 1 ? "" : "s"}`);
  };

  const exportAll = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const all: ContactRow[] = [];
      let p = 1;
      let pages = 1;
      // 100 per page is the API maximum; cap at 10k rows for the browser.
      do {
        const res = await api.get<ContactsResponse>("/contacts", { ...filterParams, page: p, pageSize: 100 });
        all.push(...res.data);
        pages = res.totalPages;
        p++;
      } while (p <= pages && p <= 100);
      if (all.length === 0) {
        toast.info("There are no contacts to export");
        return;
      }
      exportRows(all, hasFilters ? "filtered" : "all");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const copyNumber = async (waId: string) => {
    try {
      await navigator.clipboard.writeText(`+${waId}`);
      toast.success("Number copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setOptIn("all");
    setTagId("");
    setGroupId("");
  };

  const openDrawer = (contactId: string | null) => setDrawer({ open: true, contactId });
  const activeTag = tagOptions.find((t) => t.id === tagId);
  const activeGroup = groupOptions.find((g) => g.id === groupId);
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  const statTiles = [
    {
      label: "Total contacts",
      value: stats.data?.total,
      icon: Users,
      tint: "from-brand-600 to-brand-magenta",
      hint: "In your audience",
    },
    {
      label: "Opted in",
      value: stats.data?.optedIn,
      icon: UserCheck,
      tint: "from-emerald-500 to-teal-500",
      hint:
        stats.data && stats.data.total > 0
          ? `${Math.round((stats.data.optedIn / stats.data.total) * 100)}% can receive marketing`
          : "Can receive marketing",
    },
    {
      label: "Opted out",
      value: stats.data?.optedOut,
      icon: UserX,
      tint: "from-brand-pink to-brand-orange",
      hint: "Excluded from campaigns",
    },
    {
      label: "Tags",
      value: tagsQuery.isLoading ? undefined : tagOptions.length,
      icon: Tags,
      tint: "from-violet-500 to-brand-600",
      hint: "Manage segments",
      onClick: () => setTagsOpen(true),
    },
  ];

  return (
    <>
      <LoadingScreen isLoading={contacts.isLoading} minDurationMs={600} />

      <PageHeader
        title="Contacts"
        description="Everyone you can reach on WhatsApp — segment with tags and groups, import from CSV, and keep opt-in status up to date."
        onRefresh={() => {
          invalidate();
        }}
        refreshing={contacts.isFetching && !contacts.isLoading}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)} aria-label="Import contacts from CSV">
              <Upload size={16} />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => void exportAll()}
              loading={exporting}
              aria-label={hasFilters ? "Export filtered contacts to CSV" : "Export all contacts to CSV"}
            >
              {!exporting && <Download size={16} />}
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={() => openDrawer(null)}>
              <Plus size={16} strokeWidth={2.5} />
              Add contact
            </Button>
          </>
        }
      />

      {/* KPI tiles */}
      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" stagger={0.07}>
        {statTiles.map((tile) => {
          const Icon = tile.icon;
          const body = (
            <Spotlight className="h-full rounded-2xl border border-border/80 bg-white p-4 shadow-soft transition-shadow duration-300 hover:shadow-lift sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{tile.label}</p>
                  <div className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {tile.value === undefined ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <AnimatedNumber value={tile.value} />
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_20px_-8px_rgba(131,58,180,0.6)] sm:h-11 sm:w-11",
                    tile.tint,
                  )}
                >
                  <Icon size={19} />
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">{tile.hint}</p>
            </Spotlight>
          );
          return (
            <StaggerItem key={tile.label} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
              {tile.onClick ? (
                <button
                  type="button"
                  onClick={tile.onClick}
                  className="block h-full w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {body}
                </button>
              ) : (
                body
              )}
            </StaggerItem>
          );
        })}
      </Stagger>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: 0.15 }}
      >
        <Card className="overflow-hidden">
          {/* Toolbar */}
          <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search contacts"
                  placeholder="Search by name, phone or email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-brand-50 hover:text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
                <SegmentedTabs<OptInFilter>
                  layoutId="contacts-optin"
                  value={optIn}
                  onChange={setOptIn}
                  className="whitespace-nowrap"
                  tabs={[
                    { value: "all", label: "All" },
                    { value: "opted_in", label: "Opted in" },
                    { value: "opted_out", label: "Opted out" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Filter by tag"
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="h-10 w-auto min-w-[9.5rem] flex-1 text-sm sm:flex-none"
              >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </Select>
              {groupOptions.length > 0 && (
                <Select
                  aria-label="Filter by group"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="h-10 w-auto min-w-[9.5rem] flex-1 text-sm sm:flex-none"
                >
                  <option value="">All groups</option>
                  {groupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              )}
              <div className="relative flex-1 sm:flex-none">
                <ArrowDownUp
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
                />
                <Select
                  aria-label="Sort contacts"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-10 w-full min-w-[10.5rem] pl-9 text-sm sm:w-auto"
                >
                  {(Object.keys(SORTS) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORTS[key].label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="ghost" size="sm" className="h-10" onClick={() => setTagsOpen(true)}>
                <Tags size={15} />
                Manage tags
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {hasFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="font-semibold text-muted-foreground">
                      {contacts.isFetching ? "Filtering…" : `${total.toLocaleString()} match${total === 1 ? "" : "es"}`}
                    </span>
                    {search && <FilterChip label={`“${search}”`} onRemove={() => setSearchInput("")} />}
                    {optIn !== "all" && <FilterChip label={optInLabel(optIn)} onRemove={() => setOptIn("all")} />}
                    {activeTag && <FilterChip label={`Tag: ${activeTag.name}`} onRemove={() => setTagId("")} />}
                    {activeGroup && <FilterChip label={`Group: ${activeGroup.name}`} onRemove={() => setGroupId("")} />}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-primary hover:bg-brand-50"
                    >
                      <FilterX size={13} />
                      Clear all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Table */}
          {contacts.isError ? (
            <div className="p-6">
              <ErrorState
                message={
                  contacts.error instanceof ApiClientError
                    ? contacts.error.message
                    : "Could not load your contacts."
                }
                onRetry={() => void contacts.refetch()}
              />
            </div>
          ) : contacts.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={Search}
                title="No contacts match"
                description="Try a different search term or remove some filters."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    <FilterX size={16} />
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Your audience starts here"
                description="Add contacts one by one or import a CSV. Contacts who message you on WhatsApp appear here automatically."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                      <Upload size={16} />
                      Import CSV
                    </Button>
                    <Button onClick={() => openDrawer(null)}>
                      <Plus size={16} />
                      Add contact
                    </Button>
                  </div>
                }
              />
            )
          ) : (
            <div
              className={cn(
                "scrollbar-thin relative w-full overflow-x-auto transition-opacity",
                contacts.isPlaceholderData && "opacity-60",
              )}
            >
              <table className="w-full text-sm md:min-w-[720px]">
                <thead className="border-b bg-brand-50/40">
                  <tr>
                    <th className="w-12 py-3 pl-4 pr-2 text-left">
                      <input
                        ref={headerCheckbox}
                        type="checkbox"
                        checked={allOnPage}
                        onChange={toggleAll}
                        aria-label="Select all contacts on this page"
                        className="h-4 w-4 cursor-pointer rounded border-brand-300 accent-[#833ab4]"
                      />
                    </th>
                    {[
                      { label: "Contact" },
                      { label: "Phone", className: "hidden sm:table-cell" },
                      { label: "Tags", className: "hidden md:table-cell" },
                      { label: "Opt-in", className: "hidden sm:table-cell" },
                      { label: "Source", className: "hidden xl:table-cell" },
                      { label: "Added", className: "hidden lg:table-cell" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className={cn(
                          "whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground",
                          col.className,
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="w-14 px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {rows.map((contact, index) => {
                    const isSelected = selected.has(contact.id);
                    const tags = rowTags(contact);
                    const label = contact.name || formatPhone(contact.wa_id);
                    return (
                      <motion.tr
                        key={contact.id}
                        initial={index < 20 ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease, delay: index < 20 ? index * 0.025 : 0 }}
                        onClick={() => openDrawer(contact.id)}
                        className={cn(
                          "group cursor-pointer transition-colors duration-150",
                          isSelected ? "bg-brand-50/80" : "hover:bg-brand-50/40",
                        )}
                      >
                        <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(contact.id)}
                            aria-label={`Select ${label}`}
                            className="h-4 w-4 cursor-pointer rounded border-brand-300 accent-[#833ab4]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ContactAvatar name={contact.name} waId={contact.wa_id} seed={contact.id} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                                {contact.name || <span className="text-muted-foreground">Unnamed</span>}
                              </p>
                              <p className="hidden max-w-[14rem] truncate text-xs text-muted-foreground sm:block">
                                {contact.email || "No email"}
                              </p>
                              {/* Phones hide the Phone column, so the number moves under the name. */}
                              <p className="truncate font-mono text-xs text-muted-foreground sm:hidden">
                                {formatPhone(contact.wa_id)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 font-mono text-[13px] text-foreground/80 sm:table-cell">
                          {formatPhone(contact.wa_id)}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {tags.length ? (
                            <div className="flex max-w-[16rem] flex-wrap gap-1">
                              {tags.slice(0, 3).map((tag) => (
                                <TagChip key={tag.id} tag={tag} />
                              ))}
                              {tags.length > 3 && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                  +{tags.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/70">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <OptInBadge status={contact.opt_in_status} />
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs capitalize text-muted-foreground xl:table-cell">
                          {contact.source ? contact.source.replace(/_/g, " ") : "—"}
                        </td>
                        <td
                          className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground lg:table-cell"
                          title={new Date(contact.created_at).toLocaleString()}
                        >
                          {formatDistanceToNowStrict(new Date(contact.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <PopoverMenu
                            label={`Actions for ${label}`}
                            trigger={<MoreHorizontal size={17} />}
                            items={[
                              { label: "Edit contact", icon: Pencil, onSelect: () => openDrawer(contact.id) },
                              {
                                label: "Send message",
                                icon: MessageCircle,
                                tone: "brand",
                                onSelect: () => startConversation.mutate(contact.id),
                              },
                              { label: "Copy number", icon: Copy, onSelect: () => void copyNumber(contact.wa_id) },
                              {
                                label: "Delete",
                                icon: Trash2,
                                tone: "danger",
                                onSelect: () => requestDelete([contact.id]),
                              },
                            ]}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer / pagination */}
          {total > 0 && !contacts.isError && (
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">
                    {firstRow.toLocaleString()}–{lastRow.toLocaleString()}
                  </span>{" "}
                  of {total.toLocaleString()}
                </span>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <label className="flex items-center gap-2">
                  <span className="hidden sm:inline">Rows</span>
                  <Select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-9 w-[4.75rem] pl-3 pr-8 text-sm"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <PageButtons page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Keeps the pagination reachable above the floating bulk-action bar. */}
      {selected.size > 0 && <div aria-hidden className="h-24 sm:h-20" />}

      <BulkBar
        count={selected.size}
        tags={tagOptions}
        groups={groupOptions}
        pending={bulk.isPending}
        onAction={runBulk}
        onExport={() => exportRows(rows.filter((r) => selected.has(r.id)), "selected")}
        onDelete={() => requestDelete([...selected])}
        onClear={() => setSelected(new Set())}
      />

      <ContactDrawer
        open={drawer.open}
        contactId={drawer.contactId}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={() => {
          setDrawer((d) => ({ ...d, open: false }));
          invalidate();
          if (drawer.contactId) void queryClient.invalidateQueries({ queryKey: ["contact", drawer.contactId] });
        }}
        onDelete={(id) => requestDelete([id])}
      />

      <ImportContactsModal open={importOpen} onClose={() => setImportOpen(false)} />

      <TagsModal
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        activeTagId={tagId}
        onFilter={setTagId}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => !remove.isPending && setConfirmDelete(null)}
        icon={Trash2}
        tone="danger"
        title={`Delete ${confirmDelete?.length ?? 0} contact${confirmDelete?.length === 1 ? "" : "s"}?`}
        description="Their conversations, tags and group memberships are removed too. This can't be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={remove.isPending}
              onClick={() => confirmDelete && remove.mutate(confirmDelete)}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-0.5 pl-2.5 pr-1 font-semibold text-brand-700"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="grid h-5 w-5 place-items-center rounded-full hover:bg-white"
      >
        <X size={11} />
      </button>
    </motion.span>
  );
}

function PageButtons({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  // Compact window: first, last, current ±1, with gaps.
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const btn =
    "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1 self-end sm:self-auto">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(btn, "border bg-white hover:border-brand-200 hover:bg-brand-50")}
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1]! > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <button
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={cn(
              btn,
              "relative",
              p === page ? "text-white" : "text-muted-foreground hover:bg-brand-50 hover:text-foreground",
            )}
          >
            {p === page && (
              <motion.span
                layoutId="contacts-page-indicator"
                className="absolute inset-0 rounded-lg bg-brand-gradient shadow-glow"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{p}</span>
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(btn, "border bg-white hover:border-brand-200 hover:bg-brand-50")}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
