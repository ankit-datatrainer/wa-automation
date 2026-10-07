"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Ban,
  Bold,
  Braces,
  Check,
  Circle,
  FileText,
  ImageIcon,
  Info,
  Italic,
  Link2,
  MessageSquarePlus,
  Phone,
  Reply,
  Send,
  Strikethrough,
  Trash2,
  Type,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { templateSchema, type TemplateInput } from "@wa/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SegmentedTabs, Stagger, StaggerItem } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { extractVariables, TemplatePreview } from "./template-preview";
import {
  CATEGORY_META,
  headerFormatOf,
  LANGUAGES,
  languageLabel,
  normalizeLanguage,
  samplesFrom,
  toTemplateName,
  type BuilderInitial,
  type HeaderFormat,
  type TemplateCategory,
} from "./template-model";

const ease = [0.22, 1, 0.36, 1] as const;

type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";

interface ButtonDraft {
  key: number;
  type: ButtonType;
  text: string;
  url: string;
  phoneNumber: string;
}

const HEADER_OPTIONS: { value: HeaderFormat | "NONE"; label: string; icon: LucideIcon }[] = [
  { value: "NONE", label: "None", icon: Ban },
  { value: "TEXT", label: "Text", icon: Type },
  { value: "IMAGE", label: "Image", icon: ImageIcon },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "DOCUMENT", label: "Document", icon: FileText },
];

const BUTTON_PRESETS: { type: ButtonType; label: string; icon: LucideIcon }[] = [
  { type: "QUICK_REPLY", label: "Quick reply", icon: Reply },
  { type: "URL", label: "Visit website", icon: Link2 },
  { type: "PHONE_NUMBER", label: "Call phone", icon: Phone },
];

const MAX_BUTTONS = 10;
const MAX_URL_BUTTONS = 2;
const MAX_PHONE_BUTTONS = 1;

export interface TemplateSaveResult {
  id: string;
  submitted: boolean;
}

/**
 * Slide-over editor for creating or editing a template. Pass `initial` with an
 * `id` to edit (PATCH), or without one to start a new draft from a preset.
 */
export function TemplateBuilder({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (result: TemplateSaveResult) => void;
  initial?: BuilderInitial | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <BuilderDrawer
          key={initial?.id ?? initial?.name ?? "new"}
          initial={initial ?? undefined}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </AnimatePresence>
  );
}

function BuilderDrawer({
  initial,
  onClose,
  onSaved,
}: {
  initial?: BuilderInitial;
  onClose: () => void;
  onSaved: (result: TemplateSaveResult) => void;
}) {
  const isEdit = Boolean(initial?.id);
  const initialFormat = headerFormatOf(initial?.components);

  const [name, setName] = useState(initial?.name ?? "");
  const [language, setLanguage] = useState(initial ? normalizeLanguage(initial.language) : "en");
  const [category, setCategory] = useState<TemplateCategory>(initial?.category ?? "marketing");
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat | "NONE">(initialFormat ?? "NONE");
  const [headerText, setHeaderText] = useState(initial?.components.header?.text ?? "");
  const [body, setBody] = useState(initial?.components.body?.text ?? "");
  const [footer, setFooter] = useState(initial?.components.footer?.text ?? "");
  const [buttons, setButtons] = useState<ButtonDraft[]>(() =>
    (initial?.components.buttons ?? []).map((b, i) => ({
      key: i,
      type: (["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"].includes(b.type)
        ? b.type
        : "QUICK_REPLY") as ButtonType,
      text: b.text ?? "",
      url: b.url ?? "",
      phoneNumber: b.phoneNumber ?? "",
    })),
  );
  const [samples, setSamples] = useState<Record<string, string>>(() =>
    samplesFrom(initial?.components, extractVariables(initial?.components.body?.text ?? "")),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  const nextKey = useRef(buttons.length);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const variables = useMemo(() => extractVariables(body), [body]);
  const normalizedName = toTemplateName(name);
  const urlCount = buttons.filter((b) => b.type === "URL").length;
  const phoneCount = buttons.filter((b) => b.type === "PHONE_NUMBER").length;

  const languageOptions = useMemo(
    () =>
      LANGUAGES.some((l) => l.value === language)
        ? LANGUAGES
        : [...LANGUAGES, { value: language, label: languageLabel(language) }],
    [language],
  );

  const save = useMutation({
    mutationFn: async ({ payload, submit }: { payload: TemplateInput; submit: boolean }) => {
      let id = initial?.id;
      if (id) {
        await api.patch(`/templates/${id}`, payload);
      } else {
        id = (await api.post<{ id: string }>("/templates", payload)).id;
      }
      if (!submit) return { id, submitted: false, submitError: undefined as string | undefined };
      try {
        await api.post(`/templates/${id}/submit`);
        return { id, submitted: true, submitError: undefined };
      } catch (error) {
        return {
          id,
          submitted: false,
          submitError: error instanceof ApiClientError ? error.message : "Submission failed",
        };
      }
    },
    onSuccess: (result) => {
      if (result.submitted) toast.success("Template submitted to Meta for review");
      else if (result.submitError)
        toast.warning(`Saved as a draft, but submitting failed: ${result.submitError}`);
      else toast.success(isEdit ? "Template updated" : "Template saved as a draft");
      onSaved({ id: result.id, submitted: result.submitted });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the template"),
  });

  const pending = save.isPending;
  const submittingToMeta = pending && save.variables?.submit === true;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, pending]);

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const updateButton = (index: number, patch: Partial<ButtonDraft>) => {
    clearError(`button.${index}`);
    setButtons((current) => current.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const addButton = (type: ButtonType) =>
    setButtons((current) => [
      ...current,
      { key: nextKey.current++, type, text: "", url: "", phoneNumber: "" },
    ]);

  /** Wraps the selection (or inserts at the caret) in the body textarea. */
  const insertIntoBody = (before: string, after = "") => {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const next = body.slice(0, start) + before + selected + after + body.slice(end);
    if (next.length > 1024) {
      toast.error("The body can be at most 1024 characters");
      return;
    }
    setBody(next);
    clearError("body");
    const caret = selected
      ? start + before.length + selected.length + after.length
      : start + before.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const addVariable = () => {
    const nextIndex = variables.length ? Math.max(...variables.map(Number)) + 1 : 1;
    insertIntoBody(`{{${nextIndex}}}`);
  };

  const buildPayload = () => {
    const keepMedia =
      headerFormat !== "NONE" &&
      headerFormat !== "TEXT" &&
      headerFormat === initialFormat &&
      initial?.components.header?.mediaHandle;

    return {
      name: normalizedName,
      language,
      category,
      components: {
        ...(headerFormat !== "NONE" && {
          header: {
            format: headerFormat,
            ...(headerFormat === "TEXT" && { text: headerText.trim() }),
            ...(keepMedia && { mediaHandle: initial?.components.header?.mediaHandle }),
          },
        }),
        body: {
          text: body,
          // Meta requires one sample value per placeholder at review time.
          examples: variables.map((n) => samples[n]?.trim() || `Sample ${n}`),
        },
        ...(footer.trim() && { footer: { text: footer.trim() } }),
        ...(buttons.length > 0 && {
          buttons: buttons.map((button) =>
            button.type === "URL"
              ? { type: "URL", text: button.text.trim(), url: button.url.trim() }
              : button.type === "PHONE_NUMBER"
                ? { type: "PHONE_NUMBER", text: button.text.trim(), phoneNumber: button.phoneNumber.trim() }
                : { type: button.type, text: button.text.trim() },
          ),
        }),
      },
    };
  };

  const validate = (): TemplateInput | null => {
    const next: Record<string, string> = {};
    if (!normalizedName) next.name = "Give your template a name.";
    if (headerFormat === "TEXT" && !headerText.trim())
      next.headerText = "Add header text, or choose a different header type.";
    if (!body.trim()) next.body = "The message body is required.";
    buttons.forEach((b, i) => {
      if (!b.text.trim()) next[`button.${i}`] = "Button text is required.";
      else if (b.type === "URL" && !/^https?:\/\/\S+\.\S+/.test(b.url.trim()))
        next[`button.${i}`] = "Enter a full URL starting with https://";
      else if (b.type === "PHONE_NUMBER" && !/^\+?[0-9][0-9\s-]{5,19}$/.test(b.phoneNumber.trim()))
        next[`button.${i}`] = "Enter a phone number with country code, e.g. +14155550123.";
    });

    const parsed = templateSchema.safeParse(buildPayload());
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = errorKey(issue.path);
        if (!next[key]) next[key] = issue.message;
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0 || !parsed.success) {
      setMobileView("edit");
      toast.error("Please fix the highlighted fields");
      return null;
    }
    return parsed.data;
  };

  const handleSave = (submit: boolean) => {
    const payload = validate();
    if (payload) save.mutate({ payload, submit });
  };

  const checklist = [
    { label: "Name and category", done: Boolean(normalizedName) },
    { label: "Message body written", done: body.trim().length > 0 },
    {
      label: "Sample values for variables",
      done: variables.length === 0 || variables.every((v) => samples[v]?.trim()),
    },
    {
      label: "Buttons complete",
      done: buttons.every(
        (b) =>
          b.text.trim() &&
          (b.type !== "URL" || b.url.trim()) &&
          (b.type !== "PHONE_NUMBER" || b.phoneNumber.trim()),
      ),
    },
  ];
  const errorCount = Object.keys(errors).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.button
        type="button"
        aria-label="Close template builder"
        onClick={() => !pending && onClose()}
        className="absolute inset-0 cursor-default bg-brand-900/25 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-builder-title"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.45, ease }}
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-lift sm:rounded-l-3xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <MessageSquarePlus size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="template-builder-title" className="truncate font-display text-lg font-semibold sm:text-xl">
                {isEdit ? "Edit template" : "Create a template"}
              </h2>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {isEdit
                  ? "Update your draft, then resubmit it to Meta for review."
                  : "Saved as a draft. Submit to Meta whenever you're ready."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b border-border/70 px-5 py-2.5 lg:hidden">
          <SegmentedTabs
            layoutId="builder-mobile-view"
            value={mobileView}
            onChange={setMobileView}
            tabs={[
              { value: "edit", label: "Edit" },
              { value: "preview", label: "Live preview" },
            ]}
            className="w-full [&>button]:flex-1"
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid grid-cols-1 min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* Editor column */}
            <div
              className={cn(
                "scrollbar-thin min-h-0 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-7 sm:py-6",
                mobileView === "preview" && "hidden lg:block",
              )}
            >
              <Stagger stagger={0.05} className="space-y-4">
                <Section step={1} title="Basics" description="How Meta identifies and classifies this message.">
                  <div className="space-y-4">
                    <Field
                      label="Template name"
                      required
                      error={errors.name}
                      hint="Lowercase letters, numbers and underscores. Spaces become underscores."
                    >
                      {({ id }) => (
                        <div className="space-y-1.5">
                          <Input
                            id={id}
                            value={name}
                            maxLength={512}
                            aria-invalid={Boolean(errors.name)}
                            onChange={(e) => {
                              setName(e.target.value);
                              clearError("name");
                            }}
                            placeholder="order_confirmation"
                            autoFocus={!isEdit}
                          />
                          {name && normalizedName !== name && (
                            <p className="text-xs text-muted-foreground">
                              Will be saved as{" "}
                              <code className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-brand-700">
                                {normalizedName || "—"}
                              </code>
                            </p>
                          )}
                        </div>
                      )}
                    </Field>

                    <div>
                      <p className="mb-1.5 text-sm font-semibold text-foreground/90">
                        Category<span className="ml-0.5 text-brand-pink">*</span>
                      </p>
                      <div role="radiogroup" aria-label="Category" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {(Object.keys(CATEGORY_META) as TemplateCategory[]).map((value) => {
                          const active = category === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setCategory(value)}
                              className={cn(
                                "relative rounded-xl border bg-white p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                active
                                  ? "border-brand-300 bg-brand-50/70 shadow-soft ring-2 ring-brand-200"
                                  : "border-border hover:border-brand-200 hover:bg-brand-50/40",
                              )}
                            >
                              <span className="flex items-center justify-between text-sm font-semibold">
                                {CATEGORY_META[value].label}
                                <AnimatePresence>
                                  {active && (
                                    <motion.span
                                      key="check"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      className="grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-white"
                                    >
                                      <Check size={12} strokeWidth={3} />
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                              <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                                {CATEGORY_META[value].description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Field label="Language" required>
                      {({ id }) => (
                        <Select id={id} value={language} onChange={(e) => setLanguage(e.target.value)}>
                          {languageOptions.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label} ({l.value})
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </div>
                </Section>

                <Section step={2} title="Header" optional description="A bold title or media shown above the message.">
                  <div role="radiogroup" aria-label="Header type" className="flex flex-wrap gap-2">
                    {HEADER_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = headerFormat === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setHeaderFormat(value);
                            clearError("headerText");
                          }}
                          className={cn(
                            "relative inline-flex items-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            active ? "border-transparent" : "border-border bg-white hover:border-brand-200 hover:bg-brand-50/50",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="builder-header-format"
                              className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                              transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            />
                          )}
                          <span className={cn("relative z-10 flex items-center gap-1.5", active ? "text-white" : "text-foreground")}>
                            <Icon size={15} />
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    {headerFormat === "TEXT" && (
                      <motion.div
                        key="text"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4">
                          <Field label="Header text" required error={errors.headerText}>
                            {({ id }) => (
                              <div className="relative">
                                <Input
                                  id={id}
                                  maxLength={60}
                                  value={headerText}
                                  aria-invalid={Boolean(errors.headerText)}
                                  onChange={(e) => {
                                    setHeaderText(e.target.value);
                                    clearError("headerText");
                                  }}
                                  placeholder="Your order is confirmed"
                                  className="pr-16"
                                />
                                <Counter value={headerText.length} max={60} />
                              </div>
                            )}
                          </Field>
                        </div>
                      </motion.div>
                    )}
                    {headerFormat !== "TEXT" && headerFormat !== "NONE" && (
                      <motion.p
                        key="media"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50/70 p-3 text-xs text-brand-800"
                      >
                        <Info size={14} className="mt-px shrink-0" />
                        The {headerFormat.toLowerCase()} itself is attached when you send a campaign with this template.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </Section>

                <Section step={3} title="Body" description="The main message. Use variables for personalised values.">
                  <Field
                    label="Message body"
                    required
                    error={errors.body}
                    hint="Format with *bold*, _italic_ and ~strikethrough~. Variables look like {{1}}."
                  >
                    {({ id }) => (
                      <div className="overflow-hidden rounded-xl border border-input bg-white transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                        <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-muted/30 px-2 py-1.5">
                          <ToolbarButton label="Bold" icon={Bold} onClick={() => insertIntoBody("*", "*")} />
                          <ToolbarButton label="Italic" icon={Italic} onClick={() => insertIntoBody("_", "_")} />
                          <ToolbarButton
                            label="Strikethrough"
                            icon={Strikethrough}
                            onClick={() => insertIntoBody("~", "~")}
                          />
                          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                          <button
                            type="button"
                            onClick={addVariable}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          >
                            <Braces size={14} />
                            Add variable
                          </button>
                          <span
                            className={cn(
                              "ml-auto pr-1 text-[11px] font-medium tabular-nums",
                              body.length > 950 ? "text-amber-600" : "text-muted-foreground",
                            )}
                          >
                            {body.length}/1024
                          </span>
                        </div>
                        <Textarea
                          id={id}
                          ref={bodyRef}
                          maxLength={1024}
                          rows={7}
                          value={body}
                          aria-invalid={Boolean(errors.body)}
                          onChange={(e) => {
                            setBody(e.target.value);
                            clearError("body");
                          }}
                          placeholder="Hi {{1}}, your order {{2}} has been shipped and will arrive by {{3}}."
                          className="rounded-none border-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    )}
                  </Field>

                  <AnimatePresence initial={false}>
                    {variables.length > 0 && (
                      <motion.div
                        key="samples"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40 p-3.5">
                          <p className="text-sm font-semibold">Sample values</p>
                          <p className="mb-3 text-xs text-muted-foreground">
                            Meta reviews your template with these examples. They also fill the preview.
                          </p>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {variables.map((v) => (
                              <label key={v} className="flex items-center gap-2">
                                <span className="shrink-0 rounded-md bg-white px-1.5 py-1 font-mono text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                                  {`{{${v}}}`}
                                </span>
                                <Input
                                  aria-label={`Sample value for variable ${v}`}
                                  value={samples[v] ?? ""}
                                  onChange={(e) => setSamples((s) => ({ ...s, [v]: e.target.value }))}
                                  placeholder={v === "1" ? "e.g. Priya" : `Sample ${v}`}
                                  className="h-9"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Section>

                <Section step={4} title="Footer" optional description="A short line of small print under the message.">
                  <Field label="Footer text" error={errors.footer}>
                    {({ id }) => (
                      <div className="relative">
                        <Input
                          id={id}
                          maxLength={60}
                          value={footer}
                          onChange={(e) => {
                            setFooter(e.target.value);
                            clearError("footer");
                          }}
                          placeholder="Reply STOP to opt out"
                          className="pr-16"
                        />
                        <Counter value={footer.length} max={60} />
                      </div>
                    )}
                  </Field>
                </Section>

                <Section
                  step={5}
                  title="Buttons"
                  optional
                  description={`Up to ${MAX_BUTTONS} buttons — at most ${MAX_URL_BUTTONS} website and ${MAX_PHONE_BUTTONS} call button.`}
                >
                  <div className="flex flex-wrap gap-2">
                    {BUTTON_PRESETS.map(({ type, label, icon: Icon }) => {
                      const disabled =
                        buttons.length >= MAX_BUTTONS ||
                        (type === "URL" && urlCount >= MAX_URL_BUTTONS) ||
                        (type === "PHONE_NUMBER" && phoneCount >= MAX_PHONE_BUTTONS);
                      return (
                        <Button
                          key={type}
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => addButton(type)}
                        >
                          <Icon size={14} className="text-brand-600" />
                          {label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="mt-3 space-y-2.5">
                    <AnimatePresence initial={false}>
                      {buttons.map((button, index) => (
                        <motion.div
                          key={button.key}
                          layout
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                          transition={{ duration: 0.25, ease }}
                          className={cn(
                            "rounded-xl border bg-white p-3",
                            errors[`button.${index}`] ? "border-destructive/50" : "border-border",
                          )}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Select
                              aria-label={`Button ${index + 1} type`}
                              className="h-10 sm:w-44"
                              value={button.type}
                              onChange={(e) => updateButton(index, { type: e.target.value as ButtonType })}
                            >
                              <option value="QUICK_REPLY">Quick reply</option>
                              <option
                                value="URL"
                                disabled={button.type !== "URL" && urlCount >= MAX_URL_BUTTONS}
                              >
                                Visit website
                              </option>
                              <option
                                value="PHONE_NUMBER"
                                disabled={button.type !== "PHONE_NUMBER" && phoneCount >= MAX_PHONE_BUTTONS}
                              >
                                Call phone
                              </option>
                              {button.type === "COPY_CODE" && <option value="COPY_CODE">Copy code</option>}
                            </Select>
                            <div className="relative flex-1">
                              <Input
                                aria-label={`Button ${index + 1} text`}
                                maxLength={25}
                                placeholder="Button text"
                                value={button.text}
                                onChange={(e) => updateButton(index, { text: e.target.value })}
                                className="h-10 pr-14"
                              />
                              <Counter value={button.text.length} max={25} />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove button ${index + 1}`}
                              className="self-end text-muted-foreground hover:bg-rose-50 hover:text-destructive sm:self-auto"
                              onClick={() => {
                                clearError(`button.${index}`);
                                setButtons((current) => current.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>

                          {button.type === "URL" && (
                            <Input
                              aria-label={`Button ${index + 1} website URL`}
                              type="url"
                              inputMode="url"
                              placeholder="https://example.com/orders"
                              value={button.url}
                              onChange={(e) => updateButton(index, { url: e.target.value })}
                              className="mt-2 h-10"
                            />
                          )}
                          {button.type === "PHONE_NUMBER" && (
                            <Input
                              aria-label={`Button ${index + 1} phone number`}
                              type="tel"
                              inputMode="tel"
                              placeholder="+14155550123"
                              value={button.phoneNumber}
                              onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                              className="mt-2 h-10"
                            />
                          )}
                          {errors[`button.${index}`] && (
                            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                              {errors[`button.${index}`]}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {buttons.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                        No buttons yet. Add quick replies or call-to-action buttons above.
                      </p>
                    )}
                  </div>
                </Section>
              </Stagger>
            </div>

            {/* Preview column */}
            <div
              className={cn(
                "scrollbar-thin relative min-h-0 overflow-y-auto border-border/70 bg-aurora px-4 py-6 sm:px-7 lg:border-l",
                mobileView === "edit" && "hidden lg:block",
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Live preview</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-soft">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
                  </span>
                  Updates as you type
                </span>
              </div>

              <TemplatePreview
                samples={samples}
                draft={{
                  ...(headerFormat !== "NONE" && { header: { format: headerFormat, text: headerText } }),
                  body,
                  footer: footer || undefined,
                  buttons: buttons.map((b) => ({ type: b.type, text: b.text })),
                }}
              />

              <div className="mx-auto mt-6 max-w-[320px] rounded-2xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Ready for review
                </p>
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-2.5 text-sm">
                      <AnimatePresence mode="wait" initial={false}>
                        {item.done ? (
                          <motion.span
                            key="done"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"
                          >
                            <Check size={12} strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Circle size={20} className="text-border" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex flex-col gap-3 border-t border-border/70 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {errorCount > 0 ? (
                <span className="font-medium text-destructive">
                  {errorCount} {errorCount === 1 ? "field needs" : "fields need"} attention
                  {errors.form ? ` — ${errors.form}` : ""}
                </span>
              ) : (
                "Drafts can be edited freely until they're submitted to Meta."
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending} className="hidden sm:inline-flex">
                Cancel
              </Button>
              <Button type="submit" variant="outline" loading={pending && !submittingToMeta} disabled={pending}>
                Save draft
              </Button>
              <Button
                type="button"
                onClick={() => handleSave(true)}
                loading={submittingToMeta}
                disabled={pending}
              >
                {!submittingToMeta && <Send size={15} />}
                Save &amp; submit
              </Button>
            </div>
          </footer>
        </form>
      </motion.aside>
    </div>
  );
}

function Section({
  step,
  title,
  description,
  optional,
  children,
}: {
  step: number;
  title: string;
  description: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <StaggerItem>
      <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
            {step}
          </span>
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              {title}
              {optional && (
                <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-[10.5px] font-semibold text-muted-foreground">
                  Optional
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </section>
    </StaggerItem>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon size={15} />
    </button>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums",
        value >= max ? "text-amber-600" : "text-muted-foreground",
      )}
    >
      {value}/{max}
    </span>
  );
}

/** Maps a zod issue path onto the form field that should show it. */
function errorKey(path: (string | number)[]): string {
  if (path[0] === "name") return "name";
  if (path[0] !== "components") return "form";
  if (path[1] === "header") return "headerText";
  if (path[1] === "body") return "body";
  if (path[1] === "footer") return "footer";
  if (path[1] === "buttons" && typeof path[2] === "number") return `button.${path[2]}`;
  return "form";
}
