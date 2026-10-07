/**
 * Shared shapes and helpers for the "Your Templates" and "Template Library"
 * pages. Kept free of JSX so both pages and the builder can import it.
 */
import type { TemplateDraft } from "./template-preview";

export type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type TemplateCategory = "marketing" | "utility" | "authentication";
export type TemplateStatus = "draft" | "pending" | "approved" | "rejected" | "paused" | "disabled";

/** Components as stored by the API. Older/demo rows use `header.type` instead of `header.format`. */
export interface RawComponents {
  header?: { format?: HeaderFormat; type?: HeaderFormat; text?: string; mediaHandle?: string };
  body?: { text?: string; examples?: string[] };
  footer?: { text?: string };
  buttons?: { type: string; text: string; url?: string; phoneNumber?: string }[];
}

/** One row from GET /templates. */
export interface TemplateRecord {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: RawComponents;
  rejection_reason?: string | null;
  meta_template_id?: string | null;
  created_at: string;
}

export interface TemplatesResponse {
  data: TemplateRecord[];
  page?: number;
  pageSize?: number;
  total: number;
  totalPages?: number;
}

/** What the builder is seeded with: an existing template (with id) or a starting point. */
export interface BuilderInitial {
  id?: string;
  name: string;
  language: string;
  category: TemplateCategory;
  components: RawComponents;
}

export const LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "bn", label: "Bengali" },
];

export function languageLabel(code: string) {
  const match = LANGUAGES.find((l) => l.value.toLowerCase() === code.toLowerCase());
  return match?.label ?? code;
}

/** Normalises library codes like "EN_US" to Meta's "en_US" form. */
export function normalizeLanguage(code: string) {
  const [lang, region] = code.split("_");
  return region ? `${lang!.toLowerCase()}_${region.toUpperCase()}` : code.toLowerCase();
}

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; description: string; className: string }
> = {
  marketing: {
    label: "Marketing",
    description: "Offers, launches, announcements and re-engagement.",
    className: "bg-brand-50 text-brand-700 ring-brand-200",
  },
  utility: {
    label: "Utility",
    description: "Order updates, reminders, receipts and alerts.",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  authentication: {
    label: "Authentication",
    description: "One-time passcodes and login verification.",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "In review",
  approved: "Approved",
  rejected: "Rejected",
  paused: "Paused",
  disabled: "Disabled",
};

export function headerFormatOf(components: RawComponents | undefined): HeaderFormat | undefined {
  return components?.header?.format ?? components?.header?.type;
}

/** Converts stored components into the shape the WhatsApp preview renders. */
export function toDraft(components: RawComponents | undefined): TemplateDraft {
  const format = headerFormatOf(components);
  return {
    ...(format && { header: { format, text: components?.header?.text } }),
    body: components?.body?.text ?? "",
    footer: components?.footer?.text || undefined,
    buttons: (components?.buttons ?? []).map((b) => ({ type: b.type, text: b.text })),
  };
}

/** Maps a template's stored examples back onto its {{n}} variables. */
export function samplesFrom(components: RawComponents | undefined, variables: string[]) {
  const examples = components?.body?.examples ?? [];
  const samples: Record<string, string> = {};
  variables.forEach((v, i) => {
    const value = examples[i];
    if (value && !/^Sample \d+$/.test(value)) samples[v] = value;
  });
  return samples;
}

/** Only drafts and rejected templates can be edited or (re)submitted to Meta. */
export function isEditable(status: TemplateStatus) {
  return status === "draft" || status === "rejected";
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function toTemplateName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
