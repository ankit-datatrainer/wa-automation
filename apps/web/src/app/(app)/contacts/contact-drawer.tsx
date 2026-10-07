"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import {
  CalendarDays,
  Copy,
  MessageCircle,
  Plus,
  Radio,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { NewTagForm } from "./tags-modal";
import {
  ContactAvatar,
  formatPhone,
  isUuid,
  OptInBadge,
  TagChip,
  useEscape,
  type GroupOption,
  type OptInStatus,
  type TagOption,
} from "./ui";
import { useStartConversation } from "./use-start-conversation";

interface ContactDetail {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  opt_in_status: OptInStatus;
  attributes?: Record<string, unknown> | null;
  source?: string | null;
  created_at?: string;
  last_seen_at?: string | null;
  contact_tags?: { tags: TagOption | null }[];
  contact_groups?: { groups: GroupOption | null }[];
}

const OPT_IN_OPTIONS: { value: OptInStatus; label: string; hint: string }[] = [
  { value: "opted_in", label: "Opted in", hint: "Can receive marketing" },
  { value: "unknown", label: "Unknown", hint: "Not yet confirmed" },
  { value: "opted_out", label: "Opted out", hint: "Never message" },
];

const formSchema = z.object({
  waId: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(
      (v) => /^[1-9]\d{7,14}$/.test(v.replace(/\D/g, "")),
      "Enter 8–15 digits including the country code, e.g. 919876543210",
    ),
  name: z.string().trim().max(120, "Keep the name under 120 characters"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]),
  optInStatus: z.enum(["opted_in", "opted_out", "unknown"]),
  attributes: z.array(z.object({ key: z.string(), value: z.string() })),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = { waId: "", name: "", email: "", optInStatus: "unknown", attributes: [] };

function stringify(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function ContactDrawer({
  open,
  contactId,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean;
  contactId: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (contactId: string) => void;
}) {
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const startConversation = useStartConversation();
  useEscape(open, onClose);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY });
  const attributes = useFieldArray({ control: form.control, name: "attributes" });
  const errors = form.formState.errors;
  const optIn = form.watch("optInStatus");
  const watchedName = form.watch("name");
  const watchedWaId = form.watch("waId");

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
    enabled: open,
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: GroupOption[] }>("/groups"),
    enabled: open,
  });

  const detail = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => api.get<ContactDetail>(`/contacts/${contactId}`),
    enabled: open && !!contactId,
  });

  // Only persisted tags/groups can be linked — the API validates UUIDs.
  const tagOptions = (tags.data?.data ?? []).filter((t) => isUuid(t.id));
  const groupOptions = (groups.data?.data ?? []).filter((g) => isUuid(g.id));

  // GET /contacts/:id answers an unknown id with a sample contact instead of a
  // 404, so only trust a record whose id matches the one we asked for.
  const record = detail.data && detail.data.id === contactId ? detail.data : undefined;
  const loadFailed = !!contactId && (detail.isError || (detail.isSuccess && !record));

  // Load the record into the form when editing; clear it when adding.
  useEffect(() => {
    if (!open) return;
    setShowNewTag(false);
    if (contactId && record) {
      const d = record;
      form.reset({
        waId: d.wa_id,
        name: d.name ?? "",
        email: d.email ?? "",
        optInStatus: d.opt_in_status ?? "unknown",
        attributes: Object.entries(d.attributes ?? {}).map(([key, value]) => ({
          key,
          value: stringify(value),
        })),
      });
      setTagIds((d.contact_tags ?? []).map((ct) => ct.tags?.id).filter((id): id is string => !!id));
      setGroupIds((d.contact_groups ?? []).map((cg) => cg.groups?.id).filter((id): id is string => !!id));
    } else if (!contactId) {
      form.reset(EMPTY);
      setTagIds([]);
      setGroupIds([]);
    }
    // `form` is stable; resetting on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contactId, record]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const original = record?.attributes ?? {};
      const attrs: Record<string, unknown> = {};
      for (const { key, value } of values.attributes) {
        const k = key.trim();
        if (!k) continue;
        // Keep non-string originals (numbers, objects) when left untouched.
        attrs[k] = k in original && stringify(original[k]) === value ? original[k] : value;
      }
      const payload = {
        waId: values.waId.replace(/\D/g, ""),
        name: values.name.trim() || undefined,
        email: values.email.trim(),
        optInStatus: values.optInStatus,
        tagIds: tagIds.filter(isUuid),
        groupIds: groupIds.filter(isUuid),
        attributes: attrs,
      };
      return contactId ? api.patch(`/contacts/${contactId}`, payload) : api.post("/contacts", payload);
    },
    onSuccess: () => {
      toast.success(contactId ? "Contact updated" : "Contact created");
      onSaved();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the contact"),
  });

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    setter((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const d = record;
  const editing = !!contactId;
  const displayName = (watchedName || d?.name || "").trim();
  const digits = (watchedWaId || "").replace(/\D/g, "");

  const copyNumber = async () => {
    if (!d?.wa_id) return;
    try {
      await navigator.clipboard.writeText(`+${d.wa_id}`);
      toast.success("Number copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div key="contact-drawer" className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-brand-900/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit contact" : "Add contact"}
            className="relative flex h-full w-full max-w-[480px] flex-col bg-white shadow-[-24px_0_60px_-20px_rgba(76,29,149,0.25)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.42, ease }}
          >
            {/* Header */}
            <header className="relative overflow-hidden border-b border-border/70">
              <div aria-hidden className="absolute inset-0 bg-aurora opacity-90" />
              <div aria-hidden className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
              <div className="relative flex items-start gap-4 p-5 sm:p-6">
                {editing ? (
                  <ContactAvatar name={displayName || null} waId={digits || d?.wa_id} seed={contactId ?? undefined} size="xl" />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <UserPlus size={26} />
                  </span>
                )}
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/80">
                    {editing ? "Contact profile" : "New contact"}
                  </p>
                  <h2 className="truncate font-display text-xl font-semibold leading-tight">
                    {editing ? displayName || formatPhone(d?.wa_id) : "Add a contact"}
                  </h2>
                  {editing && d ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{formatPhone(d.wa_id)}</span>
                      <OptInBadge status={optIn} />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Save a WhatsApp number to your audience.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <X size={18} />
                </button>
              </div>

              {editing && d && (
                <div className="relative flex flex-wrap gap-2 px-5 pb-5 sm:px-6">
                  <Button
                    size="sm"
                    type="button"
                    loading={startConversation.isPending}
                    onClick={() => startConversation.mutate(d.id)}
                  >
                    {!startConversation.isPending && <MessageCircle size={15} />}
                    Message
                  </Button>
                  <Button size="sm" variant="outline" type="button" onClick={() => void copyNumber()}>
                    <Copy size={14} />
                    Copy number
                  </Button>
                  {onDelete && contactId && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      onClick={() => onDelete(contactId)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </header>

            {editing && detail.isLoading ? (
              <div className="flex-1 space-y-4 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : loadFailed ? (
              <div className="flex-1 p-6">
                <ErrorState
                  message={
                    detail.error instanceof ApiClientError
                      ? detail.error.message
                      : "This contact could not be loaded. It may have been deleted."
                  }
                  onRetry={() => void detail.refetch()}
                />
              </div>
            ) : (
              <form
                onSubmit={form.handleSubmit((values) => save.mutate(values))}
                className="flex min-h-0 flex-1 flex-col"
                noValidate
              >
                <div className="scrollbar-thin flex-1 space-y-7 overflow-y-auto p-5 sm:p-6">
                  {editing && d && (
                    <dl className="grid grid-cols-3 gap-2">
                      {[
                        { icon: Radio, label: "Source", value: d.source ? d.source.replace(/_/g, " ") : "—" },
                        {
                          icon: CalendarDays,
                          label: "Added",
                          value: d.created_at ? format(new Date(d.created_at), "d MMM yyyy") : "—",
                        },
                        {
                          icon: MessageCircle,
                          label: "Last seen",
                          value: d.last_seen_at ? format(new Date(d.last_seen_at), "d MMM, p") : "—",
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-border/70 bg-brand-50/30 px-3 py-2.5">
                          <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <item.icon size={11} />
                            {item.label}
                          </dt>
                          <dd className="mt-0.5 truncate text-xs font-semibold capitalize">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <section className="space-y-4">
                    <SectionTitle>Details</SectionTitle>
                    <Field
                      label="WhatsApp number"
                      required
                      error={errors.waId?.message}
                      hint="Include the country code, digits only — e.g. 919876543210."
                    >
                      {({ id }) => (
                        <Input
                          id={id}
                          inputMode="tel"
                          autoComplete="off"
                          placeholder="919876543210"
                          aria-invalid={!!errors.waId}
                          {...form.register("waId")}
                        />
                      )}
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Name" error={errors.name?.message}>
                        {({ id }) => (
                          <Input id={id} placeholder="Full name" aria-invalid={!!errors.name} {...form.register("name")} />
                        )}
                      </Field>
                      <Field label="Email" error={errors.email?.message}>
                        {({ id }) => (
                          <Input
                            id={id}
                            type="email"
                            placeholder="name@company.com"
                            aria-invalid={!!errors.email}
                            {...form.register("email")}
                          />
                        )}
                      </Field>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <SectionTitle hint="Marketing messages may only go to opted-in contacts.">Opt-in status</SectionTitle>
                    <div role="radiogroup" aria-label="Opt-in status" className="grid grid-cols-3 gap-2">
                      {OPT_IN_OPTIONS.map((option) => {
                        const active = optIn === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => form.setValue("optInStatus", option.value, { shouldDirty: true })}
                            className={cn(
                              "relative rounded-xl border px-2.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                              active ? "border-transparent" : "border-border bg-white hover:border-brand-200",
                            )}
                          >
                            {active && (
                              <motion.span
                                layoutId="optin-active"
                                className={cn(
                                  "absolute inset-0 rounded-xl ring-2",
                                  option.value === "opted_in"
                                    ? "bg-emerald-50 ring-emerald-400"
                                    : option.value === "opted_out"
                                      ? "bg-rose-50 ring-rose-300"
                                      : "bg-brand-50 ring-brand-300",
                                )}
                                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                              />
                            )}
                            <span className="relative block text-sm font-semibold">{option.label}</span>
                            <span className="relative block text-[11px] text-muted-foreground">{option.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <SectionTitle>Tags</SectionTitle>
                      <button
                        type="button"
                        onClick={() => setShowNewTag((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-brand-50"
                      >
                        <Plus size={13} />
                        {showNewTag ? "Close" : "New tag"}
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {showNewTag && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease }}
                          className="overflow-hidden"
                        >
                          <NewTagForm
                            onCreated={(tag) => {
                              if (isUuid(tag.id)) setTagIds((l) => [...l, tag.id]);
                              setShowNewTag(false);
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {tags.isLoading ? (
                      <Skeleton className="h-8 w-2/3" />
                    ) : tagOptions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {tagOptions.map((tag) => {
                          const active = tagIds.includes(tag.id);
                          return (
                            <motion.button
                              key={tag.id}
                              type="button"
                              aria-pressed={active}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => toggle(setTagIds, tag.id)}
                              className={cn(
                                "rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                                active ? "ring-2 ring-primary/70 ring-offset-1" : "opacity-60 hover:opacity-100",
                              )}
                            >
                              <TagChip tag={tag} />
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags yet — create one with “New tag”.</p>
                    )}
                  </section>

                  <section className="space-y-3">
                    <SectionTitle>Groups</SectionTitle>
                    {groups.isLoading ? (
                      <Skeleton className="h-8 w-1/2" />
                    ) : groupOptions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {groupOptions.map((group) => {
                          const active = groupIds.includes(group.id);
                          return (
                            <button
                              key={group.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggle(setGroupIds, group.id)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                                active
                                  ? "border-primary bg-brand-50 text-primary"
                                  : "border-border bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                              )}
                            >
                              {group.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No groups yet — create them under{" "}
                        <Link href="/manage/groups" className="font-semibold text-primary hover:underline">
                          Manage Groups
                        </Link>
                        .
                      </p>
                    )}
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <SectionTitle hint="Custom fields you can use as template variables.">Attributes</SectionTitle>
                      <button
                        type="button"
                        onClick={() => attributes.append({ key: "", value: "" })}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-brand-50"
                      >
                        <Plus size={13} />
                        Add field
                      </button>
                    </div>
                    {attributes.fields.length === 0 ? (
                      <p className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                        No attributes yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        <AnimatePresence initial={false}>
                          {attributes.fields.map((field, index) => (
                            <motion.li
                              key={field.id}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 12 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-2"
                            >
                              <Input
                                aria-label={`Attribute ${index + 1} name`}
                                placeholder="Field"
                                className="h-10 w-2/5"
                                {...form.register(`attributes.${index}.key` as const)}
                              />
                              <Input
                                aria-label={`Attribute ${index + 1} value`}
                                placeholder="Value"
                                className="h-10 flex-1"
                                {...form.register(`attributes.${index}.value` as const)}
                              />
                              <button
                                type="button"
                                aria-label={`Remove attribute ${index + 1}`}
                                onClick={() => attributes.remove(index)}
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </section>
                </div>

                <footer className="flex gap-3 border-t border-border/70 bg-white/90 p-4 backdrop-blur sm:p-5">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" loading={save.isPending}>
                    {editing ? "Save changes" : "Create contact"}
                  </Button>
                </footer>
              </form>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold tracking-tight">{children}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
