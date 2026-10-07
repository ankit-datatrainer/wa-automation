"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Check,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Plus,
  Search,
  Type,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { SegmentedTabs, ease } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  extractVariables,
  headerFormat,
  isUuid,
  templateBody,
  type TemplateOption,
} from "./types";

type CategoryFilter = "all" | "marketing" | "utility" | "authentication";

export function useApprovedTemplates() {
  return useQuery({
    queryKey: ["templates", "approved"],
    queryFn: () =>
      api.get<{ data: TemplateOption[] }>("/templates", { status: "approved", pageSize: 100 }),
  });
}

const HEADER_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
  TEXT: Type,
};

export function TemplatePicker({
  value,
  onChange,
  layoutId,
}: {
  value: string;
  onChange: (template: TemplateOption) => void;
  layoutId: string;
}) {
  const templates = useApprovedTemplates();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const list = templates.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (category !== "all" && t.category?.toLowerCase() !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || templateBody(t).toLowerCase().includes(q);
    });
  }, [list, search, category]);

  if (templates.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px]" />
        ))}
      </div>
    );
  }

  if (templates.isError) {
    return (
      <ErrorState
        message="We couldn't load your approved templates."
        onRetry={() => templates.refetch()}
      />
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30">
        <EmptyState
          icon={LayoutTemplate}
          title="No approved templates yet"
          description="Campaigns can only use templates Meta has approved. Create one and submit it for review."
          action={
            <Link href="/campaigns/templates" className={buttonVariants({ size: "sm" })}>
              <Plus size={15} />
              Create a template
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search templates"
            placeholder="Search templates by name or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
          <SegmentedTabs<CategoryFilter>
            layoutId={layoutId}
            value={category}
            onChange={setCategory}
            tabs={[
              { value: "all", label: "All" },
              { value: "marketing", label: "Marketing" },
              { value: "utility", label: "Utility" },
              { value: "authentication", label: "Auth" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
          No templates match your filters.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Approved templates"
          className="scrollbar-thin -mx-1 grid grid-cols-1 max-h-[380px] gap-3 overflow-y-auto px-1 py-1 sm:grid-cols-2"
        >
          {filtered.map((t, i) => {
            const selected = t.id === value;
            const format = headerFormat(t);
            const HeaderIcon = format ? HEADER_ICON[format] : null;
            const vars = extractVariables(templateBody(t)).length;
            return (
              <motion.button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(t)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease, delay: Math.min(i, 12) * 0.03 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                className={cn(
                  "group relative flex flex-col gap-2 rounded-2xl border bg-white p-4 text-left transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
                  selected
                    ? "border-primary bg-brand-50/50 shadow-lift ring-1 ring-primary/30"
                    : "border-border/80 hover:border-brand-200 hover:shadow-soft",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[13px] font-semibold text-foreground">
                    {t.name}
                  </span>
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-200",
                      selected
                        ? "border-transparent bg-brand-gradient text-white"
                        : "border-input bg-white text-transparent group-hover:border-brand-300",
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                </div>
                <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                  {templateBody(t) || "No body text"}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge tone={t.category === "marketing" ? "brand" : "info"} className="capitalize">
                    {t.category}
                  </Badge>
                  <Badge tone="neutral" className="uppercase">
                    {t.language}
                  </Badge>
                  {HeaderIcon && (
                    <Badge tone="neutral" className="capitalize">
                      <HeaderIcon size={11} />
                      {format?.toLowerCase()}
                    </Badge>
                  )}
                  {vars > 0 && (
                    <Badge tone="neutral">
                      {vars} variable{vars === 1 ? "" : "s"}
                    </Badge>
                  )}
                  {!isUuid(t.id) && <Badge tone="warning">Sample</Badge>}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
