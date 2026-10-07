"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Car,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  ImageIcon,
  Landmark,
  Layers,
  MousePointerClick,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Type,
  Video,
  Wand2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/states";
import {
  AnimatedNumber,
  AnimatePresence,
  FadeIn,
  HoverLift,
  motion,
  SegmentedTabs,
  Spotlight,
} from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Modal, useRetained } from "../templates/modal";
import { TemplateBuilder } from "../templates/template-builder";
import { MessageBubble, RichText, TemplatePreview } from "../templates/template-preview";
import {
  CATEGORY_META,
  headerFormatOf,
  languageLabel,
  normalizeLanguage,
  toDraft,
  toTemplateName,
  type BuilderInitial,
  type RawComponents,
  type TemplateCategory,
} from "../templates/template-model";
import { STARTER_TEMPLATES, type StarterTemplate } from "./library-data";

const ease = [0.22, 1, 0.36, 1] as const;

/** Row from GET /templates/library. */
interface LibraryApiItem {
  id: string;
  title: string;
  description?: string | null;
  industry?: string | null;
  language: string;
  category: TemplateCategory;
  components: RawComponents;
}

interface LibraryTemplate {
  id: string;
  title: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  industry: string;
  language: string;
  components: RawComponents;
  source: "starter" | "workspace";
}

type CategoryFilter = "all" | TemplateCategory;

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  ecommerce: ShoppingCart,
  education: GraduationCap,
  banking: Landmark,
  webinar: Video,
  healthcare: HeartPulse,
  automobile: Car,
  "real-estate": Home,
  service: Wrench,
  nonprofit: HeartHandshake,
  retail: Store,
  general: Building2,
};

const HEADER_ICONS: Record<string, LucideIcon> = {
  TEXT: Type,
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
};

/** Decorative bubbles for the hero. */
const HERO_SAMPLES = ["hc-1", "ec-3", "sv-3"]
  .map((id) => STARTER_TEMPLATES.find((t) => t.id === id))
  .filter((t): t is StarterTemplate => Boolean(t));

const toSlug = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, "-");
const industryLabel = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
const titleCase = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function fromStarter(t: StarterTemplate): LibraryTemplate {
  const components: RawComponents = {
    ...(t.headerType && {
      header: t.headerType === "TEXT" ? { format: "TEXT", text: t.headline ?? "" } : { format: t.headerType },
    }),
    body: { text: t.body },
    ...(t.footer && { footer: { text: t.footer } }),
    ...(t.buttonText && { buttons: [{ type: t.buttonType ?? "QUICK_REPLY", text: t.buttonText }] }),
  };
  return {
    id: t.id,
    title: titleCase(t.name.replace(/-/g, " ")),
    name: t.technicalName,
    category: t.category,
    industry: t.subcategory,
    language: normalizeLanguage(t.language),
    components,
    source: "starter",
  };
}

function fromApi(t: LibraryApiItem): LibraryTemplate {
  return {
    id: `lib-${t.id}`,
    title: t.title,
    name: toTemplateName(t.title),
    description: t.description ?? undefined,
    category: t.category,
    industry: toSlug(t.industry || "general"),
    language: normalizeLanguage(t.language || "en"),
    components: t.components ?? { body: { text: "" } },
    source: "workspace",
  };
}

export default function TemplateLibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const shownPreview = useRetained(previewTemplate);
  const [builderInitial, setBuilderInitial] = useState<BuilderInitial | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const libraryQuery = useQuery({
    queryKey: ["templates", "library"],
    queryFn: () => api.get<{ data: LibraryApiItem[] }>("/templates/library"),
    staleTime: 5 * 60_000,
  });

  // Workspace library entries first, then the built-in starters (deduped by technical name).
  const allTemplates = useMemo(() => {
    const seen = new Set<string>();
    const merged: LibraryTemplate[] = [];
    for (const item of [
      ...(libraryQuery.data?.data ?? []).map(fromApi),
      ...STARTER_TEMPLATES.map(fromStarter),
    ]) {
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      merged.push(item);
    }
    return merged;
  }, [libraryQuery.data]);

  const categoryCounts = useMemo(
    () => ({
      all: allTemplates.length,
      marketing: allTemplates.filter((t) => t.category === "marketing").length,
      utility: allTemplates.filter((t) => t.category === "utility").length,
      authentication: allTemplates.filter((t) => t.category === "authentication").length,
    }),
    [allTemplates],
  );

  const industries = useMemo(() => {
    const inCategory = allTemplates.filter((t) => category === "all" || t.category === category);
    const counts = new Map<string, number>();
    for (const t of inCategory) counts.set(t.industry, (counts.get(t.industry) ?? 0) + 1);
    return [
      { id: "all", label: "All industries", count: inCategory.length, icon: Layers },
      ...[...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([id, count]) => ({ id, label: industryLabel(id), count, icon: INDUSTRY_ICONS[id] ?? Building2 })),
    ];
  }, [allTemplates, category]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTemplates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (industry !== "all" && t.industry !== industry) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.name.includes(q) ||
        (t.components.body?.text ?? "").toLowerCase().includes(q) ||
        t.industry.includes(q)
      );
    });
  }, [allTemplates, category, industry, search]);

  const totalIndustries = useMemo(() => new Set(allTemplates.map((t) => t.industry)).size, [allTemplates]);
  const filtersActive = category !== "all" || industry !== "all" || search.trim() !== "";

  const applyTemplate = (template: LibraryTemplate) => {
    setPreviewTemplate(null);
    setBuilderInitial({
      name: template.name,
      language: template.language,
      category: template.category,
      components: template.components,
    });
    setBuilderOpen(true);
  };

  const startFromScratch = () => {
    setBuilderInitial(null);
    setBuilderOpen(true);
  };

  const changeCategory = (next: CategoryFilter) => {
    setCategory(next);
    // Keep the industry if it still has templates in the new category.
    if (industry !== "all" && !allTemplates.some((t) => t.industry === industry && (next === "all" || t.category === next))) {
      setIndustry("all");
    }
  };

  const clearFilters = () => {
    setCategory("all");
    setIndustry("all");
    setSearch("");
  };

  return (
    <div className="pb-16">
      <PageHeader
        title="Template Library"
        description="Start from ready-made WhatsApp templates, customise them, and submit for Meta approval."
        actions={
          <>
            <a
              href="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <BookOpen size={16} />
              <span className="hidden sm:inline">Meta guidelines</span>
              <span className="sm:hidden">Guidelines</span>
              <ExternalLink size={13} className="text-muted-foreground" />
            </a>
            <Link href="/campaigns/templates" className={buttonVariants({ variant: "outline" })}>
              Your templates
            </Link>
            <Button onClick={startFromScratch}>
              <Wand2 size={16} />
              Create from scratch
            </Button>
          </>
        }
      />

      {/* Hero */}
      <FadeIn>
        <Card className="relative overflow-hidden border-brand-100 bg-aurora p-6 sm:p-8">
          <div aria-hidden className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft ring-1 ring-brand-100">
                <Sparkles size={13} />
                Written for high approval rates
              </span>
              <h2 className="mt-4 max-w-xl font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Launch campaigns faster with <span className="text-gradient">proven templates</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Pick a template, tweak the wording, buttons and variables in the live editor, and it&apos;s saved
                to your account as a draft ready for review.
              </p>
              <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
                {[
                  { label: "Templates", value: allTemplates.length },
                  { label: "Industries", value: totalIndustries },
                  { label: "Categories", value: 3 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col-reverse rounded-2xl border border-white/80 bg-white/70 p-3 shadow-soft backdrop-blur"
                  >
                    <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                    <dd className="font-display text-2xl font-bold tracking-tight text-foreground">
                      <AnimatedNumber value={stat.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div aria-hidden className="relative hidden h-[230px] lg:block">
              {HERO_SAMPLES.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 24, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: [-4, 3, -1][i] }}
                  transition={{ duration: 0.6, ease, delay: 0.2 + i * 0.12 }}
                  className="absolute"
                  style={{ top: i * 62, left: [0, 46, 14][i], zIndex: 3 - i }}
                >
                  <div className={cn("animate-float", i === 1 && "[animation-delay:1.2s]", i === 2 && "[animation-delay:2.4s]")}>
                    <MessageBubble draft={toDraft(fromStarter(t).components)} compact className="w-[270px] drop-shadow-lg" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </FadeIn>

      {/* Filters */}
      <div className="sticky top-0 z-20 -mx-4 mt-6 bg-background/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <SegmentedTabs
              layoutId="library-category"
              value={category}
              onChange={changeCategory}
              tabs={(["all", "marketing", "utility", "authentication"] as const).map((value) => ({
                value,
                label: (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {value === "all" ? "All" : CATEGORY_META[value].label}
                    <span className="rounded-full bg-brand-100/80 px-1.5 text-[10.5px] font-bold text-brand-700">
                      {categoryCounts[value]}
                    </span>
                  </span>
                ),
              }))}
            />
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search the template library"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-10"
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
        </div>

        <div className="mask-fade-x scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible lg:[mask-image:none]">
          {industries.map((item) => {
            const active = industry === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndustry(item.id)}
                aria-pressed={active}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active ? "border-transparent text-white" : "border-border bg-white text-foreground hover:border-brand-200 hover:bg-brand-50/60",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="library-industry"
                    className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={15} className={cn("relative z-10", !active && "text-brand-600")} />
                <span className="relative z-10">{item.label}</span>
                <span
                  className={cn(
                    "relative z-10 rounded-full px-1.5 text-[10.5px] font-bold",
                    active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "template" : "templates"}
        </span>
        {libraryQuery.isLoading && <Skeleton className="h-4 w-24" />}
        {libraryQuery.isError && (
          <button
            type="button"
            onClick={() => void libraryQuery.refetch()}
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
          >
            Couldn&apos;t load featured templates — retry
          </button>
        )}
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>

      {/* Gallery */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={Search}
              title="No templates found"
              description="Try another industry or search term — or build your own from scratch."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                  <Button onClick={startFromScratch}>
                    <Wand2 size={16} />
                    Create from scratch
                  </Button>
                </div>
              }
            />
          </Card>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout" initial={true}>
              {filtered.map((template, index) => (
                <motion.div
                  key={template.id}
                  layout="position"
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.4, ease, delay: Math.min(index, 12) * 0.035 }}
                >
                  <LibraryCard
                    template={template}
                    onPreview={() => setPreviewTemplate(template)}
                    onUse={() => applyTemplate(template)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Preview */}
      <Modal
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        title={shownPreview?.title ?? "Template preview"}
        description="Preview, then customise it into your own draft"
        icon={<Eye size={18} />}
        size="lg"
        footer={
          shownPreview && (
            <>
              <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>
                Close
              </Button>
              <Button onClick={() => applyTemplate(shownPreview)}>
                <Wand2 size={15} />
                Customise &amp; use
              </Button>
            </>
          )
        }
      >
        {shownPreview && <LibraryPreview template={shownPreview} />}
      </Modal>

      <TemplateBuilder
        open={builderOpen}
        initial={builderInitial}
        onClose={() => setBuilderOpen(false)}
        onSaved={() => {
          setBuilderOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["templates"] });
          router.push("/campaigns/templates");
        }}
      />
    </div>
  );
}

function CategoryPill({ category }: { category: TemplateCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", meta.className)}>
      {meta.label}
    </span>
  );
}

function LibraryCard({
  template,
  onPreview,
  onUse,
}: {
  template: LibraryTemplate;
  onPreview: () => void;
  onUse: () => void;
}) {
  const draft = toDraft(template.components);
  const header = headerFormatOf(template.components);
  const HeaderIcon = header ? HEADER_ICONS[header] : undefined;
  const IndustryIcon = INDUSTRY_ICONS[template.industry] ?? Building2;

  return (
    <HoverLift className="h-full">
      <Spotlight className="flex h-full flex-col rounded-2xl border border-border/80 bg-white shadow-soft transition-[box-shadow,border-color] duration-300 hover:border-brand-200 hover:shadow-lift">
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview ${template.title}`}
          className="relative m-3 mb-0 h-48 overflow-hidden rounded-xl bg-[#f7f3fb] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          style={{
            backgroundImage: "radial-gradient(rgba(131,58,180,0.07) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <div className="origin-top-left transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02]">
            <MessageBubble draft={draft} compact />
          </div>
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#f7f3fb] to-transparent" />
          <span className="absolute inset-0 grid place-items-center bg-white/0 transition-colors duration-300 group-hover:bg-white/35">
            <span className="inline-flex translate-y-2 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 opacity-0 shadow-lift transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Eye size={13} />
              Quick preview
            </span>
          </span>
        </button>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryPill category={template.category} />
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <IndustryIcon size={11} />
              {industryLabel(template.industry)}
            </span>
            {template.source === "workspace" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2 py-0.5 text-[11px] font-semibold text-white">
                <Sparkles size={10} />
                Featured
              </span>
            )}
          </div>
          <h3 className="mt-2.5 line-clamp-2 font-display text-base font-semibold leading-snug tracking-tight">
            {template.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {template.description ?? <RichText text={template.components.body?.text ?? ""} />}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              {HeaderIcon && (
                <span className="inline-flex items-center gap-1" title={`${header} header`}>
                  <HeaderIcon size={12} />
                  {header!.charAt(0) + header!.slice(1).toLowerCase()}
                </span>
              )}
              {draft.buttons.length > 0 && (
                <span className="inline-flex items-center gap-1" title="Buttons">
                  <MousePointerClick size={12} />
                  {draft.buttons.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Preview ${template.title}`} onClick={onPreview}>
                <Eye size={16} />
              </Button>
              <Button size="sm" onClick={onUse} className="group/use">
                Use template
                <ArrowRight size={14} className="transition-transform group-hover/use:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </Spotlight>
    </HoverLift>
  );
}

function LibraryPreview({ template }: { template: LibraryTemplate }) {
  const draft = toDraft(template.components);
  const header = headerFormatOf(template.components);
  const IndustryIcon = INDUSTRY_ICONS[template.industry] ?? Building2;

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Category", value: <CategoryPill category={template.category} /> },
    {
      label: "Industry",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <IndustryIcon size={14} className="text-brand-600" />
          {industryLabel(template.industry)}
        </span>
      ),
    },
    { label: "Language", value: `${languageLabel(template.language)} (${template.language})` },
    { label: "Header", value: header ? header.charAt(0) + header.slice(1).toLowerCase() : "None" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
      <div className="rounded-3xl bg-aurora p-4 sm:p-6">
        <TemplatePreview draft={draft} />
      </div>
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Template name</p>
          <code className="mt-1 block break-all rounded-lg bg-brand-50 px-2.5 py-1.5 font-mono text-sm font-semibold text-brand-700">
            {template.name}
          </code>
          {template.description && <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {details.map((d) => (
            <div key={d.label} className="rounded-xl border border-border/80 bg-white p-3">
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{d.label}</dt>
              <dd className="mt-1 text-sm font-semibold">{d.value}</dd>
            </div>
          ))}
        </dl>
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3.5 text-sm">
          <p className="font-semibold text-brand-800">How it works</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Customise the wording, variables and buttons.</li>
            <li>Save it as a draft in Your Templates.</li>
            <li>Submit to Meta — approved templates can be used in campaigns.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
