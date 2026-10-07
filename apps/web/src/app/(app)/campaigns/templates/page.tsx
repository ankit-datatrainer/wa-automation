"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileEdit,
  FileText,
  Info,
  LayoutGrid,
  LibraryBig,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import {
  AnimatedNumber,
  AnimatePresence,
  motion,
  SegmentedTabs,
  Spotlight,
  Stagger,
  StaggerItem,
} from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Modal, useRetained } from "./modal";
import { TemplateBuilder } from "./template-builder";
import { extractVariables, MessageBubble, TemplatePreview } from "./template-preview";
import {
  CATEGORY_META,
  formatDate,
  headerFormatOf,
  isEditable,
  languageLabel,
  samplesFrom,
  STATUS_LABEL,
  toDraft,
  type BuilderInitial,
  type TemplateCategory,
  type TemplateRecord,
  type TemplatesResponse,
} from "./template-model";

type CategoryFilter = "all" | TemplateCategory;
type StatusFilter = "all" | "approved" | "pending" | "draft" | "rejected" | "paused" | "disabled";
type SortKey = "newest" | "oldest" | "name_asc" | "name_desc" | "status";

const ease = [0.22, 1, 0.36, 1] as const;

function fetchTemplates(categoryFilter: CategoryFilter, statusFilter: StatusFilter) {
  return api.get<TemplatesResponse>("/templates", {
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    pageSize: 100,
  });
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiClientError ? error.message : fallback;

export default function YourTemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [builder, setBuilder] = useState<{ open: boolean; initial: BuilderInitial | null }>({
    open: false,
    initial: null,
  });
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateRecord[] | null>(null);
  const retainedPreview = useRetained(previewTemplate);
  const shownDelete = useRetained(pendingDelete);

  // Remember the preferred layout per viewer.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wa.templates.view");
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const changeView = (next: "grid" | "list") => {
    setView(next);
    try {
      localStorage.setItem("wa.templates.view", next);
    } catch {
      /* storage unavailable */
    }
  };

  const templatesQuery = useQuery({
    queryKey: ["templates", { categoryFilter, statusFilter }],
    queryFn: () => fetchTemplates(categoryFilter, statusFilter),
    placeholderData: keepPreviousData,
  });

  // Unfiltered list (shares its cache entry with the main query when no filter is set) for KPIs.
  const allQuery = useQuery({
    queryKey: ["templates", { categoryFilter: "all", statusFilter: "all" }],
    queryFn: () => fetchTemplates("all", "all"),
  });

  const allTemplates = allQuery.data?.data ?? [];

  // Re-read the previewed template from the latest data so its status and actions
  // stay current after a submit or sync (the stored row is only a snapshot).
  const shownPreview = useMemo(() => {
    if (!retainedPreview) return null;
    const id = retainedPreview.id;
    return (
      templatesQuery.data?.data.find((t) => t.id === id) ??
      allQuery.data?.data.find((t) => t.id === id) ??
      retainedPreview
    );
  }, [retainedPreview, templatesQuery.data, allQuery.data]);

  const stats = useMemo(() => {
    const count = (status: string) => allTemplates.filter((t) => t.status === status).length;
    return {
      total: allQuery.data?.total ?? allTemplates.length,
      approved: count("approved"),
      pending: count("pending"),
      draft: count("draft"),
      rejected: count("rejected"),
    };
  }, [allTemplates, allQuery.data?.total]);

  const templates = useMemo(() => {
    let list = [...(templatesQuery.data?.data ?? [])];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.components?.body?.text?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "status":
          return a.status.localeCompare(b.status) || a.name.localeCompare(b.name);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [templatesQuery.data, search, sort]);

  // Drop selections that are no longer visible.
  useEffect(() => {
    setSelected((current) => current.filter((id) => templates.some((t) => t.id === id)));
  }, [templates]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["templates"] });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/templates/${id}`)));
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      return { deleted: ids.length - failed.length, failed };
    },
    onSuccess: ({ deleted, failed }) => {
      if (deleted > 0) toast.success(deleted === 1 ? "Template deleted" : `${deleted} templates deleted`);
      if (failed.length > 0) toast.error(errorMessage(failed[0]!.reason, "Some templates could not be deleted"));
      setSelected([]);
      setPendingDelete(null);
      setPreviewTemplate(null);
      void invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete the template")),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ metaTemplateId: string; status: string }>(`/templates/${id}/submit`),
    onSuccess: () => {
      toast.success("Submitted to Meta for review");
      void invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not submit the template")),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post<{ synced: number; remoteTotal: number }>("/templates/sync"),
    onSuccess: (result) => {
      toast.success(
        `Synced with Meta — ${result.synced} updated of ${result.remoteTotal} on your WhatsApp account`,
      );
      void invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not sync with Meta")),
  });

  const openBuilder = (initial: BuilderInitial | null) => {
    setPreviewTemplate(null);
    setBuilder({ open: true, initial });
  };
  const editTemplate = (t: TemplateRecord) =>
    openBuilder({ id: t.id, name: t.name, language: t.language, category: t.category, components: t.components });
  const duplicateTemplate = (t: TemplateRecord) =>
    openBuilder({
      name: `${t.name}_copy`.slice(0, 512),
      language: t.language,
      category: t.category,
      components: t.components,
    });

  const actions: TemplateActions = {
    preview: setPreviewTemplate,
    edit: editTemplate,
    duplicate: duplicateTemplate,
    submit: (t) => submitMutation.mutate(t.id),
    remove: (t) => setPendingDelete([t]),
    submittingId: submitMutation.isPending ? submitMutation.variables : undefined,
  };

  const filtersActive = search.trim() !== "" || categoryFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const statTiles: { key: StatusFilter; label: string; value: number; icon: LucideIcon; tint: string }[] = [
    { key: "all", label: "All templates", value: stats.total, icon: FileText, tint: "bg-brand-gradient text-white shadow-glow" },
    { key: "approved", label: "Approved", value: stats.approved, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" },
    { key: "pending", label: "In review", value: stats.pending, icon: Clock3, tint: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" },
    { key: "draft", label: "Drafts", value: stats.draft, icon: FileEdit, tint: "bg-brand-50 text-brand-600 ring-1 ring-brand-200" },
    { key: "rejected", label: "Rejected", value: stats.rejected, icon: XCircle, tint: "bg-rose-50 text-rose-600 ring-1 ring-rose-200" },
  ];

  const allVisibleSelected = templates.length > 0 && selected.length === templates.length;
  const isLoading = templatesQuery.isLoading;

  return (
    <div className="pb-16">
      <PageHeader
        title="Your Templates"
        description="Create, review and submit WhatsApp message templates for Meta approval."
        actions={
          <>
            <Link href="/campaigns/template-library" className={buttonVariants({ variant: "outline" })}>
              <LibraryBig size={16} />
              <span className="hidden sm:inline">Browse library</span>
              <span className="sm:hidden">Library</span>
            </Link>
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isPending}
              title="Pull the latest approval statuses from Meta"
            >
              {!syncMutation.isPending && <RefreshCw size={16} />}
              Sync with Meta
            </Button>
            <Button onClick={() => openBuilder(null)}>
              <Plus size={16} strokeWidth={2.5} />
              New template
            </Button>
          </>
        }
      />

      {/* KPI tiles — click to filter by status */}
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {statTiles.map((tile) => {
          const active = statusFilter === tile.key;
          const Icon = tile.icon;
          return (
            <StaggerItem key={tile.key} className={tile.key === "all" ? "col-span-2 sm:col-span-1" : undefined}>
              <motion.button
                type="button"
                onClick={() => setStatusFilter(tile.key)}
                aria-pressed={active}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className={cn(
                  "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-soft transition-shadow duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active ? "border-brand-300 ring-2 ring-brand-200" : "border-border/80",
                )}
              >
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tile.tint)}>
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl font-bold leading-none tracking-tight">
                    {allQuery.isLoading ? (
                      <span className="inline-block h-6 w-10 animate-pulse rounded-md bg-muted" />
                    ) : (
                      <AnimatedNumber value={tile.value} />
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">{tile.label}</span>
                </span>
                {active && (
                  <motion.span
                    layoutId="template-stat-active"
                    className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-brand-gradient"
                  />
                )}
              </motion.button>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Guidelines */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.15 }}
        className="mt-5 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-brand-900/80"
      >
        <Info size={17} className="mt-0.5 shrink-0 text-brand-600" />
        <p>
          Templates must follow{" "}
          <a
            href="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            WhatsApp&apos;s guidelines
          </a>{" "}
          and are reviewed by Meta before they can be used in campaigns. Only drafts and rejected templates can be edited.
        </p>
      </motion.div>

      {/* Toolbar */}
      <Card className="mt-5 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search templates"
              placeholder="Search by name, message or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <SegmentedTabs
              layoutId="template-category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              tabs={[
                { value: "all", label: "All" },
                { value: "marketing", label: "Marketing" },
                { value: "utility", label: "Utility" },
                { value: "authentication", label: "Authentication" },
              ]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-10 w-[150px] flex-1 sm:flex-none"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">In review</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </Select>
            <Select
              aria-label="Sort templates"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 w-[150px] flex-1 sm:flex-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="status">Status</option>
            </Select>
            <SegmentedTabs
              layoutId="template-view"
              value={view}
              onChange={changeView}
              tabs={[
                { value: "grid", label: <LayoutGrid size={16} aria-label="Grid view" /> },
                { value: "list", label: <List size={16} aria-label="List view" /> },
              ]}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh templates"
              onClick={() => void templatesQuery.refetch()}
            >
              <RefreshCw size={16} className={cn(templatesQuery.isFetching && "animate-spin text-primary")} />
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {(filtersActive || templatesQuery.data) && (
            <motion.div
              key="result-summary"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                <span>
                  Showing <span className="font-semibold text-foreground">{templates.length}</span>{" "}
                  {templates.length === 1 ? "template" : "templates"}
                </span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 transition hover:bg-brand-100"
                  >
                    <X size={12} />
                    Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Bulk actions */}
      <AnimatePresence>
        {view === "list" && selected.length > 0 && (
          <motion.div
            key="bulk-actions"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease }}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-2.5"
          >
            <p className="text-sm font-semibold text-brand-800">{selected.length} selected</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setPendingDelete(templates.filter((t) => selected.includes(t.id)))}
              >
                <Trash2 size={14} />
                Delete selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="mt-5">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="space-y-4 p-5">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        ) : templatesQuery.isError ? (
          <ErrorState
            message={errorMessage(templatesQuery.error, "We couldn't load your templates.")}
            onRetry={() => void templatesQuery.refetch()}
          />
        ) : templates.length === 0 ? (
          <Card>
            {filtersActive ? (
              <EmptyState
                icon={Search}
                title="No templates match"
                description="Try a different search, or clear the filters to see everything."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Create your first template"
                description="Design a message with a live WhatsApp preview, or start from a proven template in the library."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => openBuilder(null)}>
                      <Plus size={16} />
                      New template
                    </Button>
                    <Link href="/campaigns/template-library" className={buttonVariants({ variant: "outline" })}>
                      <LibraryBig size={16} />
                      Browse library
                    </Link>
                  </div>
                }
              />
            )}
          </Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease, delay: Math.min(index, 12) * 0.04 }}
              >
                <TemplateCard template={template} actions={actions} />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <TH className="w-12">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => setSelected(e.target.checked ? templates.map((t) => t.id) : [])}
                      aria-label="Select all templates"
                      className="h-4 w-4 cursor-pointer rounded border-border accent-brand-600"
                    />
                  </TH>
                  <TH>Template</TH>
                  <TH>Category</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">Language</TH>
                  <TH className="hidden lg:table-cell">Created</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {templates.map((template, index) => {
                  const isSelected = selected.includes(template.id);
                  return (
                    <motion.tr
                      key={template.id}
                      initial={index < 20 ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease, delay: Math.min(index, 20) * 0.025 }}
                      className={cn(
                        "transition-colors duration-150 hover:bg-brand-50/50",
                        isSelected && "bg-brand-50/60",
                      )}
                    >
                      <TD>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelected((current) =>
                              current.includes(template.id)
                                ? current.filter((id) => id !== template.id)
                                : [...current, template.id],
                            )
                          }
                          aria-label={`Select ${template.name}`}
                          className="h-4 w-4 cursor-pointer rounded border-border accent-brand-600"
                        />
                      </TD>
                      <TD className="max-w-[320px]">
                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(template)}
                          className="block max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <span className="block truncate font-mono text-[13px] font-semibold text-foreground hover:text-primary">
                            {template.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {template.components?.body?.text}
                          </span>
                        </button>
                      </TD>
                      <TD>
                        <CategoryBadge category={template.category} />
                      </TD>
                      <TD>
                        <StatusBadge status={template.status} />
                      </TD>
                      <TD className="hidden whitespace-nowrap text-sm md:table-cell">
                        {languageLabel(template.language)}
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{template.language}</span>
                      </TD>
                      <TD className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                        {formatDate(template.created_at)}
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Preview ${template.name}`}
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye size={16} />
                          </Button>
                          <ActionMenu template={template} actions={actions} />
                        </div>
                      </TD>
                    </motion.tr>
                  );
                })}
              </TBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Preview */}
      <Modal
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        title={shownPreview?.name ?? "Template preview"}
        description="How this template appears on WhatsApp"
        icon={<Eye size={18} />}
        size="lg"
        footer={shownPreview && <PreviewFooter template={shownPreview} actions={actions} onClose={() => setPreviewTemplate(null)} />}
      >
        {shownPreview && <PreviewBody template={shownPreview} />}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={pendingDelete !== null}
        onClose={() => !deleteMutation.isPending && setPendingDelete(null)}
        title={shownDelete && shownDelete.length > 1 ? `Delete ${shownDelete.length} templates?` : "Delete template?"}
        icon={<Trash2 size={18} />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.map((t) => t.id))}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {shownDelete?.length === 1 ? (
            <>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{shownDelete[0]!.name}</code>{" "}
              will be removed from your account
            </>
          ) : (
            "These templates will be removed from your account"
          )}
          {" "}and, if submitted, from your WhatsApp Business account on Meta. This can&apos;t be undone.
        </p>
      </Modal>

      <TemplateBuilder
        open={builder.open}
        initial={builder.initial}
        onClose={() => setBuilder((b) => ({ ...b, open: false }))}
        onSaved={() => {
          setBuilder({ open: false, initial: null });
          void invalidate();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------- */

interface TemplateActions {
  preview: (t: TemplateRecord) => void;
  edit: (t: TemplateRecord) => void;
  duplicate: (t: TemplateRecord) => void;
  submit: (t: TemplateRecord) => void;
  remove: (t: TemplateRecord) => void;
  submittingId?: string;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone(status)} className="whitespace-nowrap">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "approved" && "bg-emerald-500",
          status === "pending" && "animate-pulse bg-amber-500",
          (status === "rejected" || status === "disabled") && "bg-rose-500",
          status === "paused" && "bg-amber-500",
          status === "draft" && "bg-muted-foreground/60",
        )}
      />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: TemplateCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        meta?.className ?? "bg-muted text-muted-foreground ring-border",
      )}
    >
      {meta?.label ?? category}
    </span>
  );
}

function TemplateCard({ template, actions }: { template: TemplateRecord; actions: TemplateActions }) {
  const draft = toDraft(template.components);
  const variables = extractVariables(draft.body);
  const samples = samplesFrom(template.components, variables);
  const editable = isEditable(template.status);
  const submitting = actions.submittingId === template.id;

  return (
    <Spotlight className="flex h-full flex-col rounded-2xl border border-border/80 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
      <div className="relative flex items-start justify-between gap-2 p-4 pb-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={template.status} />
            <CategoryBadge category={template.category} />
          </div>
          <button
            type="button"
            onClick={() => actions.preview(template)}
            className="block max-w-full truncate text-left font-mono text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            title={template.name}
          >
            {template.name}
          </button>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {languageLabel(template.language)} · {formatDate(template.created_at)}
          </p>
        </div>
        <ActionMenu template={template} actions={actions} />
      </div>

      <button
        type="button"
        onClick={() => actions.preview(template)}
        aria-label={`Preview ${template.name}`}
        className="relative mx-4 h-44 overflow-hidden rounded-xl border border-brand-100/70 bg-[#f7f3fb] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="origin-top-left transition-transform duration-500 group-hover:scale-[1.02]">
          <MessageBubble draft={draft} samples={samples} compact />
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#f7f3fb] to-transparent" />
        <span className="absolute bottom-2 right-2 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 opacity-0 shadow-soft transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Eye size={12} />
          Preview
        </span>
      </button>

      {template.status === "rejected" && template.rejection_reason && (
        <p className="mx-4 mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          <span className="line-clamp-2">{template.rejection_reason}</span>
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 p-4 pt-3">
        {template.status === "approved" ? (
          <Link
            href={`/campaigns/new?template=${encodeURIComponent(template.name)}`}
            className={cn(buttonVariants({ size: "sm" }), "flex-1")}
          >
            <Send size={14} />
            Use in campaign
          </Link>
        ) : editable ? (
          <>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => actions.edit(template)}>
              <Pencil size={14} />
              Edit
            </Button>
            <Button
              size="sm"
              className="flex-1"
              loading={submitting}
              disabled={Boolean(actions.submittingId)}
              onClick={() => actions.submit(template)}
            >
              {!submitting && <Send size={14} />}
              Submit
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => actions.preview(template)}>
            <Eye size={14} />
            {template.status === "pending" ? "In review — preview" : "Preview"}
          </Button>
        )}
      </div>
    </Spotlight>
  );
}

/** Per-template overflow menu with click-outside and Escape handling. */
function ActionMenu({ template, actions }: { template: TemplateRecord; actions: TemplateActions }) {
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editable = isEditable(template.status);
  const open = position !== null;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (!value) return setPosition(null);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Rendered in a portal so table/card overflow never clips it; flip upward near the viewport bottom.
    const flipUp = rect.bottom + 300 > window.innerHeight && rect.top > 300;
    setPosition({
      position: "fixed",
      right: Math.max(8, window.innerWidth - rect.right),
      ...(flipUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const items: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean; href?: string; show: boolean }[] = [
    { label: "Preview", icon: Eye, onClick: () => actions.preview(template), show: true },
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(template), show: editable },
    { label: "Submit for review", icon: Send, onClick: () => actions.submit(template), show: editable },
    {
      label: "Use in campaign",
      icon: Send,
      onClick: () => undefined,
      href: `/campaigns/new?template=${encodeURIComponent(template.name)}`,
      show: template.status === "approved",
    },
    { label: "Duplicate", icon: Copy, onClick: () => actions.duplicate(template), show: true },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(template), danger: true, show: true },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`More actions for ${template.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "bg-brand-50 text-primary",
        )}
      >
        <MoreHorizontal size={17} />
      </button>
      {mounted &&
        createPortal(
      <AnimatePresence>
        {position && (
          <motion.div
            key="menu"
            ref={menuRef}
            role="menu"
            style={position}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.16, ease }}
            className="z-[60] w-52 origin-top-right rounded-2xl border border-border/80 bg-white p-1.5 text-left shadow-lift"
          >
            {items
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const className = cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none",
                  item.danger
                    ? "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50"
                    : "text-foreground hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50",
                );
                return item.href ? (
                  <Link key={item.label} role="menuitem" href={item.href} className={className} onClick={() => setOpen(false)}>
                    <Icon size={15} />
                    {item.label}
                  </Link>
                ) : (
                  <button key={item.label} type="button" role="menuitem" onClick={run(item.onClick)} className={className}>
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function PreviewBody({ template }: { template: TemplateRecord }) {
  const draft = toDraft(template.components);
  const variables = extractVariables(draft.body);
  const samples = samplesFrom(template.components, variables);
  const header = headerFormatOf(template.components);

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: <StatusBadge status={template.status} /> },
    { label: "Category", value: <CategoryBadge category={template.category} /> },
    { label: "Language", value: `${languageLabel(template.language)} (${template.language})` },
    { label: "Created", value: formatDate(template.created_at) },
    { label: "Header", value: header ? header.charAt(0) + header.slice(1).toLowerCase() : "None" },
    { label: "Buttons", value: draft.buttons.length || "None" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
      <div className="rounded-3xl bg-aurora p-4 sm:p-6">
        <TemplatePreview draft={draft} samples={samples} />
      </div>
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-3">
          {details.map((d) => (
            <div key={d.label} className="rounded-xl border border-border/80 bg-white p-3">
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{d.label}</dt>
              <dd className="mt-1 text-sm font-semibold">{d.value}</dd>
            </div>
          ))}
        </dl>

        {variables.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Variables</p>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1 text-xs ring-1 ring-inset ring-brand-200">
                  <code className="font-mono font-semibold text-brand-700">{`{{${v}}}`}</code>
                  {samples[v] && <span className="text-muted-foreground">e.g. {samples[v]}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {template.status === "rejected" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={15} />
              Rejected by Meta
            </p>
            <p className="mt-1">
              {template.rejection_reason || "No reason was provided."} Edit the template and submit it again.
            </p>
          </div>
        )}
        {template.status === "pending" && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-800">
            <Clock3 size={15} className="mt-0.5 shrink-0" />
            Meta is reviewing this template. Use “Sync with Meta” to pull the latest status.
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewFooter({
  template,
  actions,
  onClose,
}: {
  template: TemplateRecord;
  actions: TemplateActions;
  onClose: () => void;
}) {
  const editable = isEditable(template.status);
  const submitting = actions.submittingId === template.id;
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
      <Button variant="outline" onClick={() => actions.duplicate(template)}>
        <Copy size={15} />
        Duplicate
      </Button>
      {editable && (
        <>
          <Button variant="outline" onClick={() => actions.edit(template)}>
            <Pencil size={15} />
            Edit
          </Button>
          <Button loading={submitting} onClick={() => actions.submit(template)}>
            {!submitting && <Send size={15} />}
            Submit for review
          </Button>
        </>
      )}
      {template.status === "approved" && (
        <Link
          href={`/campaigns/new?template=${encodeURIComponent(template.name)}`}
          className={buttonVariants()}
        >
          <Send size={15} />
          Use in campaign
        </Link>
      )}
    </>
  );
}
