/**
 * Shared types + helpers for the "Send to Contacts" and "Send By Tags" flows.
 * Shapes mirror the API responses in apps/api/src/routes (templates, tags,
 * contacts, campaigns).
 */

export interface TemplateButtonOption {
  type: string;
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface TemplateOption {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: {
    // Real rows use `format`; the API's sample fallback uses `type`.
    header?: { format?: string; type?: string; text?: string } | null;
    body?: { text: string } | null;
    footer?: { text?: string } | null;
    buttons?: TemplateButtonOption[] | null;
  } | null;
}

export interface TagOption {
  id: string;
  name: string;
  color?: string | null;
  contactCount?: number;
}

interface TagRelation {
  id: string;
  name: string;
  color: string | null;
}

export interface ContactRow {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  opt_in_status: "opted_in" | "opted_out" | "unknown" | string;
  contact_tags?: { tag_id?: string; tags: TagRelation | TagRelation[] | null }[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A contact as shown in the preview / selection tray. */
export interface SampleContact {
  id: string;
  name: string | null;
  waId: string;
}

export type AudienceKind = "contacts" | "tags";

export type VariableSource = "contact.name" | "contact.phone" | "custom";

export interface VariableBinding {
  source: VariableSource;
  value: string;
}

export interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: {
    total?: number;
    sent?: number;
    delivered?: number;
    read?: number;
    replied?: number;
    failed?: number;
  } | null;
  templates?: { name: string } | { name: string }[] | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The API falls back to built-in sample rows (ids like "tpl1", "t1") when an
 * organization has none of its own. Those cannot be used to create a campaign,
 * so the UI flags them instead of letting the request fail.
 */
export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

export function extractVariables(body: string | null | undefined): string[] {
  if (!body) return [];
  const matches = body.matchAll(/\{\{(\d+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]!))].sort((a, b) => Number(a) - Number(b));
}

export function templateBody(template: TemplateOption | null | undefined): string {
  return template?.components?.body?.text ?? "";
}

export function headerFormat(template: TemplateOption | null | undefined): string | null {
  const header = template?.components?.header;
  if (!header) return null;
  return (header.format ?? header.type ?? null)?.toUpperCase() ?? null;
}

export function formatPhone(waId: string | null | undefined): string {
  if (!waId) return "";
  const digits = waId.replace(/\D/g, "");
  return digits ? `+${digits}` : waId;
}

export function contactTags(contact: ContactRow): TagRelation[] {
  return (contact.contact_tags ?? [])
    .flatMap((ct) => (Array.isArray(ct.tags) ? ct.tags : ct.tags ? [ct.tags] : []))
    .filter(Boolean);
}

/** Default: {{1}} is the contact's name, everything else a literal. */
export function defaultBinding(variable: string): VariableBinding {
  return variable === "1" ? { source: "contact.name", value: "" } : { source: "custom", value: "" };
}

export function isBindingComplete(binding: VariableBinding | undefined): boolean {
  if (!binding) return false;
  return binding.source !== "custom" || binding.value.trim().length > 0;
}

/**
 * Converts the UI bindings into the API's `variableMapping`: the campaign
 * worker reads "contact.name" / "contact.phone" as contact fields and treats
 * anything else as literal text.
 */
export function toVariableMapping(
  variables: string[],
  bindings: Record<string, VariableBinding>,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const v of variables) {
    const b = bindings[v] ?? defaultBinding(v);
    mapping[v] = b.source === "custom" ? b.value.trim() : b.source;
  }
  return mapping;
}

/** The text a variable will render as for one sample contact. */
export function resolveBinding(
  binding: VariableBinding | undefined,
  sample: SampleContact | null,
): { text: string; placeholder: boolean } {
  if (!binding) return { text: "", placeholder: true };
  if (binding.source === "contact.name") {
    return sample
      ? { text: sample.name?.trim() || "there", placeholder: false }
      : { text: "Contact name", placeholder: true };
  }
  if (binding.source === "contact.phone") {
    return sample
      ? { text: sample.waId, placeholder: false }
      : { text: "Contact phone", placeholder: true };
  }
  return binding.value.trim()
    ? { text: binding.value, placeholder: false }
    : { text: "", placeholder: true };
}

export function toOne<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export function displayName(contact: { name: string | null; waId?: string; wa_id?: string }) {
  return contact.name?.trim() || formatPhone(contact.waId ?? contact.wa_id ?? "");
}
