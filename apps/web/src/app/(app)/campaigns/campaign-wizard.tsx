"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCheck,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Info,
  Megaphone,
  Phone,
  Reply,
  Rocket,
  Search,
  Tags,
  Users,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, AnimatedNumber, ease, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type AudienceType = "contacts" | "tags" | "groups" | "csv" | "broadcast";

interface TemplateOption {
  id: string;
  name: string;
  language: string;
  category: string;
  components: {
    header?: { format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"; text?: string };
    body: { text: string };
    footer?: { text: string };
    buttons?: { type: string; text: string }[];
  };
}

interface Option {
  id: string;
  name: string;
  contactCount: number;
  color?: string;
  description?: string | null;
}

interface MeResponse {
  organization: { name: string };
  waba: { verifiedName: string | null; displayPhone: string | null } | null;
}

const STEPS: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: "Details", hint: "Name & template", icon: FileText },
  { label: "Audience", hint: "Who receives it", icon: Users },
  { label: "Personalize", hint: "Fill variables", icon: Wand2 },
  { label: "Schedule", hint: "Review & send", icon: CalendarClock },
];

const SOURCE_LABEL: Record<string, string> = {
  "contact.name": "Contact name",
  "contact.phone": "Contact phone",
};

const CUSTOM = "__custom__";

/**
 * The API falls back to sample templates / tags / groups when an organization
 * has none. Those use placeholder ids that the campaign endpoint rejects, so
 * only real (uuid) records are offered here.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const onlyReal = <T extends { id: string }>(list: T[] | undefined) =>
  list ? list.filter((item) => UUID.test(item.id)) : undefined;

/** Template variable indexes ({{1}}, {{2}}...) in ascending order. */
function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\d+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]!))].sort((a, b) => Number(a) - Number(b));
}

/** Formats a Date for an <input type="datetime-local">. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function schedulePresets() {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  inOneHour.setSeconds(0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const monday = new Date(now);
  monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  monday.setHours(10, 0, 0, 0);
  return [
    { label: "In 1 hour", value: toLocalInput(inOneHour) },
    { label: "Tomorrow, 9:00", value: toLocalInput(tomorrow) },
    { label: "Next Monday, 10:00", value: toLocalInput(monday) },
  ];
}

export function CampaignWizard({
  audienceType,
  lockAudience,
  initialSelectedIds,
}: {
  audienceType: AudienceType;
  /** Set on the dedicated Send By Tags / Groups / CSV pages. */
  lockAudience?: boolean;
  /** Pre-selected tag / group / contact ids (e.g. the tag a CSV import created). */
  initialSelectedIds?: string[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [audience, setAudience] = useState<AudienceType>(audienceType);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);
  const [optionSearch, setOptionSearch] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [customVars, setCustomVars] = useState<Record<string, boolean>>({});
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendNow, setSendNow] = useState(true);

  const templates = useQuery({
    queryKey: ["templates", "approved"],
    queryFn: () =>
      api.get<{ data: TemplateOption[] }>("/templates", { status: "approved", pageSize: 100 }),
  });

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: Option[] }>("/tags"),
    enabled: audience === "tags",
  });

  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: Option[] }>("/groups"),
    enabled: audience === "groups",
  });

  // Broadcast reach: everyone minus opted-out contacts.
  const allContacts = useQuery({
    queryKey: ["contacts", "count", "all"],
    queryFn: () => api.get<{ total: number }>("/contacts", { page: 1, pageSize: 1 }),
    enabled: audience === "broadcast",
  });
  const optedOut = useQuery({
    queryKey: ["contacts", "count", "opted_out"],
    queryFn: () =>
      api.get<{ total: number }>("/contacts", { page: 1, pageSize: 1, optInStatus: "opted_out" }),
    enabled: audience === "broadcast",
  });

  const templateList = useMemo(() => onlyReal(templates.data?.data) ?? [], [templates.data]);
  const template = templateList.find((t) => t.id === templateId);

  // "Use in campaign" links arrive as ?template=<name or id>; preselect it once
  // the approved list has loaded.
  useEffect(() => {
    if (templateId || templateList.length === 0) return;
    const wanted = new URLSearchParams(window.location.search).get("template");
    if (!wanted) return;
    const match = templateList.find((t) => t.id === wanted || t.name === wanted);
    if (match) setTemplateId(match.id);
    // Only the first load of the list should trigger the preselect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateList]);

  const variables = useMemo(
    () => (template ? extractVariables(template.components?.body?.text ?? "") : []),
    [template],
  );

  const options = useMemo(
    () => onlyReal(audience === "tags" ? tags.data?.data : groups.data?.data),
    [audience, tags.data, groups.data],
  );
  const optionsLoading = audience === "tags" ? tags.isLoading : groups.isLoading;
  const needsSelection = audience === "tags" || audience === "groups";
  const usesContactIds = audience === "contacts" || audience === "csv";

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return q ? templateList.filter((t) => t.name.toLowerCase().includes(q)) : templateList;
  }, [templateList, templateSearch]);

  const filteredOptions = useMemo(() => {
    const q = optionSearch.trim().toLowerCase();
    return q ? (options ?? []).filter((o) => o.name.toLowerCase().includes(q)) : (options ?? []);
  }, [options, optionSearch]);

  const reach = needsSelection
    ? (options ?? [])
        .filter((o) => selectedIds.includes(o.id))
        .reduce((sum, o) => sum + (o.contactCount ?? 0), 0)
    : usesContactIds
      ? selectedIds.length
      : Math.max(0, (allContacts.data?.total ?? 0) - (optedOut.data?.total ?? 0));
  const reachKnown = needsSelection
    ? !!options
    : usesContactIds
      ? true
      : allContacts.isSuccess && optedOut.isSuccess;

  // Only send mappings for variables the chosen template actually has.
  const effectiveMapping = useMemo(
    () => Object.fromEntries(variables.map((v) => [v, mapping[v] ?? ""])),
    [variables, mapping],
  );

  const scheduleInFuture = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now();

  const create = useMutation({
    mutationFn: async () => {
      const config: Record<string, unknown> =
        audience === "tags"
          ? { tagIds: selectedIds }
          : audience === "groups"
            ? { groupIds: selectedIds }
            : usesContactIds
              ? { contactIds: selectedIds }
              : {};

      const campaign = await api.post<{ id: string; recipientCount: number }>("/campaigns", {
        name: name.trim(),
        templateId,
        audienceType: audience,
        audienceConfig: config,
        variableMapping: effectiveMapping,
        scheduledAt: sendNow ? null : new Date(scheduledAt).toISOString(),
      });

      if (sendNow) {
        try {
          await api.post(`/campaigns/${campaign.id}/send`);
        } catch (error) {
          return {
            ...campaign,
            startError: error instanceof ApiClientError ? error.message : "Could not start sending",
          };
        }
      }
      return { ...campaign, startError: null as string | null };
    },
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (campaign.startError) {
        toast.warning(`Campaign saved as a draft but could not start: ${campaign.startError}`);
        router.push("/campaigns");
        return;
      }
      toast.success(
        sendNow
          ? `Campaign started for ${campaign.recipientCount.toLocaleString()} contacts`
          : `Campaign scheduled for ${campaign.recipientCount.toLocaleString()} contacts`,
      );
      router.push(sendNow ? "/campaigns/history" : "/campaigns/scheduled");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not create the campaign",
      ),
  });

  const blockers = [
    !(name.trim().length >= 2)
      ? "Give your campaign a name (at least 2 characters)."
      : !templateId
        ? "Choose an approved template."
        : null,
    (needsSelection || usesContactIds) && selectedIds.length === 0
      ? `Select at least one ${audience === "tags" ? "tag" : audience === "groups" ? "group" : "contact"}.`
      : null,
    variables.some((v) => !(mapping[v] ?? "").trim()) ? "Fill in every template variable." : null,
    !sendNow && !scheduledAt
      ? "Pick a date and time."
      : !sendNow && !scheduleInFuture
        ? "The scheduled time must be in the future."
        : null,
  ];
  const canAdvance = !blockers[step];

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const presets = useMemo(() => schedulePresets(), []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <Stepper step={step} onJump={(i) => i < step && go(i)} />

        <Card className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
          <div className="min-h-[22rem] p-5 sm:p-7">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -28 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease }}
              >
                <StepHeading index={step} />

                {step === 0 && (
                  <div className="space-y-6">
                    <Field label="Campaign name" required hint="Only you and your team see this name.">
                      {({ id }) => (
                        <Input
                          id={id}
                          value={name}
                          maxLength={120}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Diwali offer — October"
                        />
                      )}
                    </Field>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground/90">
                            Template<span className="ml-0.5 text-brand-pink">*</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Only Meta-approved templates can be used in campaigns.
                          </p>
                        </div>
                        {templateList.length > 4 && (
                          <div className="relative w-full sm:w-56">
                            <Search
                              size={15}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                              value={templateSearch}
                              onChange={(e) => setTemplateSearch(e.target.value)}
                              placeholder="Search templates"
                              aria-label="Search templates"
                              className="h-9 pl-9"
                            />
                          </div>
                        )}
                      </div>

                      {templates.isLoading ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24" />
                          ))}
                        </div>
                      ) : templates.isError ? (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                          Could not load templates.{" "}
                          <button
                            type="button"
                            className="font-semibold underline"
                            onClick={() => void templates.refetch()}
                          >
                            Try again
                          </button>
                        </p>
                      ) : templateList.length === 0 ? (
                        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-muted-foreground">
                            You have no approved templates yet. Create one and submit it to Meta for review.
                          </p>
                          <Link
                            href="/campaigns/templates"
                            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                          >
                            Create template <ArrowRight size={14} />
                          </Link>
                        </div>
                      ) : (
                        <div
                          role="radiogroup"
                          aria-label="Template"
                          className="scrollbar-thin grid grid-cols-1 max-h-[22rem] gap-3 overflow-y-auto p-0.5 sm:grid-cols-2"
                        >
                          {filteredTemplates.length === 0 && (
                            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                              No templates match “{templateSearch}”.
                            </p>
                          )}
                          {filteredTemplates.map((t) => {
                            const active = t.id === templateId;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => {
                                  if (t.id === templateId) return;
                                  setTemplateId(t.id);
                                  setMapping({});
                                  setCustomVars({});
                                }}
                                className={cn(
                                  "relative flex flex-col gap-2 rounded-xl border bg-white p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                                  active
                                    ? "border-primary shadow-glow ring-1 ring-primary"
                                    : "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft",
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="truncate font-mono text-sm font-semibold">{t.name}</span>
                                  <span
                                    className={cn(
                                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                                      active ? "border-transparent bg-brand-gradient text-white" : "bg-white",
                                    )}
                                  >
                                    {active && <Check size={12} strokeWidth={3} />}
                                  </span>
                                </div>
                                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {t.components?.body?.text}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge tone="brand" className="capitalize">
                                    {(t.category ?? "").toLowerCase()}
                                  </Badge>
                                  <Badge>{t.language}</Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    {!lockAudience && (
                      <div role="radiogroup" aria-label="Audience type" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {(
                          [
                            { value: "broadcast", label: "Broadcast", hint: "Everyone opted in", icon: Megaphone },
                            { value: "tags", label: "By tags", hint: "Tagged segments", icon: Tags },
                            { value: "groups", label: "By groups", hint: "Contact groups", icon: Users },
                          ] as const
                        ).map((opt) => {
                          const active = audience === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                if (active) return;
                                setAudience(opt.value);
                                setSelectedIds([]);
                                setOptionSearch("");
                              }}
                              className={cn(
                                "relative flex items-center gap-3 overflow-hidden rounded-xl border bg-white p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                                active ? "border-transparent text-white" : "hover:border-brand-200 hover:shadow-soft",
                              )}
                            >
                              {active && (
                                <motion.span
                                  layoutId="audience-active"
                                  className="absolute inset-0 bg-brand-gradient"
                                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                />
                              )}
                              <span
                                className={cn(
                                  "relative grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                                  active ? "bg-white/20" : "bg-brand-50 text-primary",
                                )}
                              >
                                <opt.icon size={18} />
                              </span>
                              <span className="relative min-w-0">
                                <span className="block text-sm font-semibold">{opt.label}</span>
                                <span
                                  className={cn("block text-xs", active ? "text-white/80" : "text-muted-foreground")}
                                >
                                  {opt.hint}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {needsSelection ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold">
                            Select {audience === "tags" ? "tags" : "groups"}
                            {selectedIds.length > 0 && (
                              <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                                {selectedIds.length} selected
                              </span>
                            )}
                          </p>
                          {(options?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedIds((options ?? []).map((o) => o.id))}
                              >
                                Select all
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={selectedIds.length === 0}
                                onClick={() => setSelectedIds([])}
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>

                        {(options?.length ?? 0) > 8 && (
                          <div className="relative max-w-xs">
                            <Search
                              size={15}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                              value={optionSearch}
                              onChange={(e) => setOptionSearch(e.target.value)}
                              placeholder={`Search ${audience}`}
                              aria-label={`Search ${audience}`}
                              className="h-9 pl-9"
                            />
                          </div>
                        )}

                        {optionsLoading ? (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <Skeleton key={i} className="h-10 w-28" />
                            ))}
                          </div>
                        ) : filteredOptions.length ? (
                          <motion.div layout className="flex flex-wrap gap-2">
                            {filteredOptions.map((option) => {
                              const active = selectedIds.includes(option.id);
                              return (
                                <motion.button
                                  layout
                                  key={option.id}
                                  type="button"
                                  aria-pressed={active}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() =>
                                    setSelectedIds((current) =>
                                      active
                                        ? current.filter((id) => id !== option.id)
                                        : [...current, option.id],
                                    )
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                                    active
                                      ? "border-transparent bg-brand-gradient text-white shadow-glow"
                                      : "bg-white hover:border-brand-200 hover:bg-brand-50/60",
                                  )}
                                >
                                  {active ? (
                                    <Check size={14} strokeWidth={3} />
                                  ) : option.color ? (
                                    <span
                                      className="h-2.5 w-2.5 rounded-full"
                                      style={{ background: option.color }}
                                      aria-hidden
                                    />
                                  ) : null}
                                  {option.name}
                                  <span
                                    className={cn(
                                      "rounded-md px-1.5 text-xs tabular-nums",
                                      active ? "bg-white/20" : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {option.contactCount}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </motion.div>
                        ) : (options?.length ?? 0) > 0 ? (
                          <p className="text-sm text-muted-foreground">Nothing matches “{optionSearch}”.</p>
                        ) : (
                          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                              No {audience} yet — create some first, then come back.
                            </p>
                            <Link
                              href={audience === "tags" ? "/contacts" : "/manage/groups"}
                              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                            >
                              {audience === "tags" ? "Go to contacts" : "Manage groups"} <ArrowRight size={14} />
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : usesContactIds ? (
                      <InfoNote>
                        {selectedIds.length > 0
                          ? `${selectedIds.length.toLocaleString()} contacts are selected for this campaign. Opted-out contacts are skipped automatically.`
                          : "No contacts are selected yet."}
                      </InfoNote>
                    ) : (
                      <InfoNote>
                        This campaign goes to every contact who has not opted out. Contacts marked opted-out
                        are excluded automatically.
                      </InfoNote>
                    )}

                    <div className="flex items-center gap-4 rounded-2xl border bg-gradient-to-br from-brand-50 to-white p-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                        <Users size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          Estimated reach
                        </p>
                        <p className="font-display text-2xl font-bold">
                          {reachKnown ? <AnimatedNumber value={reach} duration={0.6} /> : "—"}{" "}
                          <span className="text-sm font-medium text-muted-foreground">contacts</span>
                        </p>
                        {needsSelection && selectedIds.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            Contacts in more than one {audience === "tags" ? "tag" : "group"} receive it once.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    {variables.length === 0 ? (
                      <InfoNote>This template has no variables — every contact receives the same message.</InfoNote>
                    ) : (
                      variables.map((variable) => {
                        const isCustom = customVars[variable] ?? false;
                        return (
                          <motion.div
                            key={variable}
                            layout
                            className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-start"
                          >
                            <span className="grid h-10 w-14 place-items-center rounded-lg bg-brand-50 font-mono text-sm font-bold text-primary">
                              {`{{${variable}}}`}
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Field label="Fill with" required>
                                {({ id }) => (
                                  <Select
                                    id={id}
                                    value={isCustom ? CUSTOM : (mapping[variable] ?? "")}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === CUSTOM) {
                                        setCustomVars((c) => ({ ...c, [variable]: true }));
                                        setMapping((c) => ({ ...c, [variable]: "" }));
                                      } else {
                                        setCustomVars((c) => ({ ...c, [variable]: false }));
                                        setMapping((c) => ({ ...c, [variable]: value }));
                                      }
                                    }}
                                  >
                                    <option value="">Select a source...</option>
                                    <option value="contact.name">Contact name</option>
                                    <option value="contact.phone">Contact phone</option>
                                    <option value={CUSTOM}>Custom text</option>
                                  </Select>
                                )}
                              </Field>
                              <AnimatePresence initial={false}>
                                {isCustom && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.2, ease }}
                                  >
                                    <Field label="Text" required hint="Same value for every contact.">
                                      {({ id }) => (
                                        <Input
                                          id={id}
                                          value={mapping[variable] ?? ""}
                                          maxLength={1024}
                                          onChange={(e) =>
                                            setMapping((c) => ({ ...c, [variable]: e.target.value }))
                                          }
                                          placeholder="e.g. 20% OFF"
                                        />
                                      )}
                                    </Field>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div role="radiogroup" aria-label="Delivery" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(
                        [
                          { now: true, title: "Send now", hint: "Start delivering immediately.", icon: Zap },
                          { now: false, title: "Schedule", hint: "Pick a future date and time.", icon: CalendarClock },
                        ] as const
                      ).map((opt) => {
                        const active = sendNow === opt.now;
                        return (
                          <button
                            key={opt.title}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSendNow(opt.now)}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                              active ? "border-primary shadow-glow ring-1 ring-primary" : "hover:border-brand-200",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition",
                                active ? "bg-brand-gradient text-white" : "bg-brand-50 text-primary",
                              )}
                            >
                              <opt.icon size={18} />
                            </span>
                            <span>
                              <span className="block font-semibold">{opt.title}</span>
                              <span className="block text-sm text-muted-foreground">{opt.hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence initial={false}>
                      {!sendNow && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pb-1">
                            <Field
                              label="Send at"
                              required
                              hint={`Your local time (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}
                              error={scheduledAt && !scheduleInFuture ? "Pick a time in the future." : undefined}
                            >
                              {({ id }) => (
                                <Input
                                  id={id}
                                  type="datetime-local"
                                  value={scheduledAt}
                                  min={toLocalInput(new Date())}
                                  onChange={(e) => setScheduledAt(e.target.value)}
                                  className="sm:max-w-xs"
                                />
                              )}
                            </Field>
                            <div className="flex flex-wrap gap-2">
                              {presets.map((p) => (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => setScheduledAt(p.value)}
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                                    scheduledAt === p.value
                                      ? "border-transparent bg-brand-gradient text-white"
                                      : "bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                                  )}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2.5 rounded-2xl border bg-brand-50/30 p-4 text-sm">
                      <p className="font-semibold">Review</p>
                      <Summary label="Name" value={name || "—"} />
                      <Summary label="Template" value={template?.name ?? "—"} mono />
                      <Summary
                        label="Audience"
                        value={
                          audience === "broadcast"
                            ? "Broadcast"
                            : audience === "tags"
                              ? `${selectedIds.length} tag${selectedIds.length === 1 ? "" : "s"}`
                              : audience === "groups"
                                ? `${selectedIds.length} group${selectedIds.length === 1 ? "" : "s"}`
                                : `${selectedIds.length} contacts`
                        }
                      />
                      <Summary
                        label="Estimated reach"
                        value={reachKnown ? `${reach.toLocaleString()} contacts` : "—"}
                      />
                      <Summary
                        label="Variables"
                        value={
                          variables.length === 0
                            ? "None"
                            : variables
                                .map((v) => `{{${v}}} → ${SOURCE_LABEL[mapping[v] ?? ""] ?? `“${mapping[v] ?? ""}”`}`)
                                .join(", ")
                        }
                      />
                      <Summary
                        label="Delivery"
                        value={
                          sendNow
                            ? "Immediately"
                            : scheduledAt
                              ? new Date(scheduledAt).toLocaleString()
                              : "—"
                        }
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t bg-brand-50/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <Button variant="outline" disabled={step === 0} onClick={() => go(Math.max(0, step - 1))}>
              <ArrowLeft size={16} />
              Back
            </Button>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <AnimatePresence mode="wait">
                {blockers[step] && (
                  <motion.p
                    key={blockers[step]}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-center text-xs text-muted-foreground sm:text-right"
                  >
                    {blockers[step]}
                  </motion.p>
                )}
              </AnimatePresence>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canAdvance} onClick={() => go(step + 1)}>
                  Continue
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  disabled={!canAdvance || blockers.some(Boolean)}
                  loading={create.isPending}
                  onClick={() => create.mutate()}
                >
                  {!create.isPending && (sendNow ? <Rocket size={16} /> : <CalendarClock size={16} />)}
                  {sendNow ? "Create and send" : "Schedule campaign"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <MessagePreview template={template} mapping={effectiveMapping} />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- stepper

function Stepper({ step, onJump }: { step: number; onJump: (index: number) => void }) {
  return (
    <nav aria-label="Campaign steps" className="relative rounded-2xl border bg-white p-3 shadow-soft sm:p-4">
      <div
        aria-hidden
        className="absolute left-[calc(12.5%+0.75rem)] right-[calc(12.5%+0.75rem)] top-8 h-0.5 rounded-full bg-brand-100 sm:left-[calc(12.5%+1rem)] sm:right-[calc(12.5%+1rem)] sm:top-9"
      >
        <motion.div
          className="h-full rounded-full bg-brand-gradient"
          initial={false}
          animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease }}
        />
      </div>
      <ol className="relative grid grid-cols-4 gap-2">
        {STEPS.map((s, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={s.label} className="relative flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => onJump(index)}
                disabled={!done}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${s.label}${done ? " (completed)" : ""}`}
                className={cn(
                  "relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
                  done && "cursor-pointer border-transparent bg-brand-600 text-white hover:bg-brand-700",
                  active && "border-transparent text-white",
                  !done && !active && "border-border bg-white text-muted-foreground",
                )}
              >
                {active && (
                  <>
                    <motion.span
                      layoutId="wizard-step-active"
                      className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" aria-hidden />
                  </>
                )}
                <span className="relative">
                  {done ? <Check size={16} strokeWidth={3} /> : <s.icon size={16} />}
                </span>
              </button>
              <span
                className={cn(
                  "mt-2 max-w-full truncate text-[11px] font-semibold min-[400px]:text-xs sm:text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">{s.hint}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeading({ index }: { index: number }) {
  const titles = [
    { title: "Name your campaign", text: "Give it a recognisable name and choose the approved template to send." },
    { title: "Choose your audience", text: "Decide who should receive this message." },
    { title: "Personalize the message", text: "Map each template variable to contact data or your own text." },
    { title: "Schedule and launch", text: "Send right away or pick the perfect moment." },
  ];
  const t = titles[index]!;
  return (
    <div className="mb-6 space-y-1">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
        Step {index + 1} of {STEPS.length}
      </p>
      <h2 className="text-xl font-bold sm:text-2xl">{t.title}</h2>
      <p className="text-sm text-muted-foreground">{t.text}</p>
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-sm text-foreground/80">
      <Info size={16} className="mt-0.5 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  );
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-words text-right font-medium", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- live preview

function MessagePreview({
  template,
  mapping,
}: {
  template: TemplateOption | undefined;
  mapping: Record<string, string>;
}) {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/me"),
    staleTime: 5 * 60_000,
  });

  const businessName = me.data?.waba?.verifiedName || me.data?.organization.name || "Your business";
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  const body = template?.components?.body?.text ?? "";
  const parts = body.split(/(\{\{\d+\}\})/g);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Live preview</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Updates as you edit
        </span>
      </div>

      <div className="mx-auto w-full max-w-[340px] rounded-[2.2rem] border bg-white p-2.5 shadow-lift">
        <div className="overflow-hidden rounded-[1.8rem] border">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">
              {businessName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                <span className="truncate">{businessName}</span>
                <BadgeCheck size={14} className="shrink-0 text-primary" />
              </p>
              <p className="text-[11px] text-muted-foreground">Business account</p>
            </div>
          </div>

          {/* Chat body */}
          <div className="relative min-h-[360px] bg-[#f7f3fb] px-3 py-4">
            <div aria-hidden className="absolute inset-0 bg-grid opacity-40" />
            <div className="relative">
              <p className="mx-auto mb-3 w-fit rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
                Today
              </p>
              <AnimatePresence mode="wait">
                {template ? (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.35, ease }}
                    className="max-w-[88%] space-y-1"
                  >
                    <div className="relative rounded-2xl rounded-tl-md bg-white p-2.5 shadow-[0_1px_1px_rgba(40,16,70,0.08)]">
                      {template.components?.header && (
                        <div className="mb-2">
                          {template.components?.header?.format === "TEXT" ? (
                            <p className="text-sm font-bold">{template.components.header.text}</p>
                          ) : (
                            <div className="grid h-28 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600">
                              <span className="flex flex-col items-center gap-1 text-[11px] font-semibold uppercase">
                                <ImageIcon size={20} />
                                {String(template.components.header.format ?? "media").toLowerCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
                        {parts.map((part, i) => {
                          const match = part.match(/^\{\{(\d+)\}\}$/);
                          if (!match) return <span key={i}>{part}</span>;
                          const source = mapping[match[1]!] ?? "";
                          if (!source.trim()) {
                            return (
                              <span
                                key={i}
                                className="rounded bg-amber-100 px-1 font-mono text-[12px] font-semibold text-amber-800"
                              >
                                {part}
                              </span>
                            );
                          }
                          return (
                            <motion.span
                              key={`${i}-${source}`}
                              initial={{ backgroundColor: "rgba(131,58,180,0.25)" }}
                              animate={{ backgroundColor: "rgba(131,58,180,0.08)" }}
                              transition={{ duration: 0.6 }}
                              className="rounded px-1 font-semibold text-brand-700"
                            >
                              {SOURCE_LABEL[source] ? `‹${SOURCE_LABEL[source]}›` : source}
                            </motion.span>
                          );
                        })}
                      </p>
                      {template.components?.footer?.text && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">{template.components.footer.text}</p>
                      )}
                      <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        {time}
                        <CheckCheck size={13} className="text-primary" />
                      </p>
                    </div>
                    {template.components?.buttons?.map((button, index) => (
                      <div
                        key={`${button.text}-${index}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-white p-2 text-[13px] font-semibold text-primary shadow-[0_1px_1px_rgba(40,16,70,0.08)]"
                      >
                        {button.type === "URL" && <ExternalLink size={13} />}
                        {button.type === "PHONE_NUMBER" && <Phone size={13} />}
                        {button.type === "QUICK_REPLY" && <Reply size={13} />}
                        {button.text || "Button"}
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid min-h-[280px] place-items-center text-center"
                  >
                    <div className="space-y-2 px-6">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary shadow-soft">
                        <FileText size={20} />
                      </span>
                      <p className="text-sm font-semibold">No template selected</p>
                      <p className="text-xs text-muted-foreground">
                        Pick a template to see exactly how your message will look.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {template && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Badge tone="brand" className="capitalize">
            {(template.category ?? "").toLowerCase()}
          </Badge>
          <Badge>{template.language}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{template.name}</span>
        </div>
      )}
    </div>
  );
}
