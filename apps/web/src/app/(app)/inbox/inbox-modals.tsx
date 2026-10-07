"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import {
  Check,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  MessageCirclePlus,
  Music,
  Plus,
  Search,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { SegmentedTabs, ease } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { ContactAvatar, FieldLabel, ModalShell, SelectRow, useDebouncedValue } from "./inbox-ui";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-2xl" />
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------------
// 1. Template Picker Modal
// --------------------------------------------------------------------------------

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: {
    header?: { type: string; format?: string; text?: string };
    body?: { text: string };
    footer?: { text: string };
    buttons?: { type: string; text: string }[];
  };
}

const TEMPLATE_CATEGORIES = ["all", "marketing", "utility", "authentication"] as const;
type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

function extractPlaceholders(text: string) {
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, "")))).sort(
    (a, b) => Number(a) - Number(b),
  );
}

export function TemplatePickerModal({
  conversationId,
  contactName,
  isOpen,
  onClose,
}: {
  conversationId: string;
  contactName: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const templatesQuery = useQuery({
    queryKey: ["templates", "approved"],
    queryFn: () =>
      api.get<{ data: Template[] }>("/templates", { status: "approved", pageSize: 100 }),
    enabled: isOpen,
  });

  const placeholders = selectedTemplate?.components.body?.text
    ? extractPlaceholders(selectedTemplate.components.body.text)
    : [];
  const missing = placeholders.filter((p) => !variables[p]?.trim());

  const reset = () => {
    setSelectedTemplate(null);
    setVariables({});
    setSearch("");
    setCategory("all");
  };

  const close = () => {
    onClose();
    reset();
  };

  const sendTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      // Only send values for placeholders the template actually has: Meta rejects
      // body parameters for templates that don't declare them.
      const payload: Record<string, string> = {};
      for (const key of placeholders) payload[key] = variables[key]?.trim() ?? "";
      return api.post(`/conversations/${conversationId}/messages`, {
        type: "template",
        templateId: selectedTemplate.id,
        variables: payload,
      });
    },
    onSuccess: () => {
      toast.success("Template message sent");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      close();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to send template")),
  });

  const rawTemplates = templatesQuery.data?.data ?? [];
  const needle = search.trim().toLowerCase();
  const filtered = rawTemplates.filter((tpl) => {
    const matchesCategory = category === "all" || tpl.category?.toLowerCase() === category;
    const matchesSearch =
      !needle ||
      tpl.name.toLowerCase().includes(needle) ||
      (tpl.components.body?.text ?? "").toLowerCase().includes(needle);
    return matchesCategory && matchesSearch;
  });

  const renderPreviewText = () => {
    if (!selectedTemplate?.components.body?.text) return "";
    let body = selectedTemplate.components.body.text;
    for (const key of placeholders) {
      const value = variables[key]?.trim();
      if (value) body = body.replaceAll(`{{${key}}}`, value);
    }
    return body;
  };

  const header = selectedTemplate?.components.header;
  const headerType = (header?.format ?? header?.type ?? "").toUpperCase();

  return (
    <ModalShell
      open={isOpen}
      onClose={close}
      size="xl"
      icon={Sparkles}
      title="Send a message template"
      description={`Approved templates can be sent anytime and reopen the 24-hour window with ${contactName ?? "this contact"}.`}
      bodyClassName="px-0 pb-0 sm:px-0"
      footer={
        <>
          {selectedTemplate && missing.length > 0 && (
            <p className="mr-auto text-xs text-muted-foreground">
              Fill {missing.length} more {missing.length === 1 ? "variable" : "variables"} to send
            </p>
          )}
          <Button variant="outline" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={sendTemplate.isPending}
            disabled={!selectedTemplate || missing.length > 0}
            onClick={() => sendTemplate.mutate()}
          >
            Send template
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 min-h-0 border-t border-border/70 md:h-[520px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Catalog */}
        <div className="flex min-h-0 flex-col border-b border-border/70 md:border-b-0 md:border-r">
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search templates"
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
            <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
              <SegmentedTabs
                layoutId="template-category"
                value={category}
                onChange={setCategory}
                tabs={TEMPLATE_CATEGORIES.map((c) => ({
                  value: c,
                  label: <span className="capitalize">{c}</span>,
                }))}
                className="[&_button]:px-3 [&_button]:text-xs"
              />
            </div>
          </div>

          <div className="scrollbar-thin max-h-[36vh] min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 md:max-h-none">
            {templatesQuery.isLoading ? (
              <ListSkeleton rows={4} />
            ) : templatesQuery.isError ? (
              <p className="p-6 text-center text-sm text-destructive">
                {errorMessage(templatesQuery.error, "Templates could not be loaded.")}
              </p>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold">No approved templates found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rawTemplates.length === 0
                    ? "Create a template and wait for Meta approval to use it here."
                    : "Try another search or category."}
                </p>
                {rawTemplates.length === 0 && (
                  <Link
                    href="/campaigns/templates"
                    className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Go to your templates
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((tpl, i) => {
                const active = selectedTemplate?.id === tpl.id;
                return (
                  <motion.button
                    key={tpl.id}
                    type="button"
                    initial={i < 12 ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease, delay: Math.min(i, 12) * 0.03 }}
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      const ph = tpl.components.body?.text ? extractPlaceholders(tpl.components.body.text) : [];
                      setVariables(contactName && ph.includes("1") ? { "1": contactName } : {});
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active
                        ? "border-brand-300 bg-brand-50/80 shadow-[0_0_0_3px_rgba(131,58,180,0.08)]"
                        : "border-border/80 bg-white hover:border-brand-200 hover:bg-brand-50/30",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{tpl.name}</span>
                      <Badge
                        tone={tpl.category === "marketing" ? "brand" : tpl.category === "authentication" ? "warning" : "info"}
                        className="shrink-0 text-[10px] capitalize"
                      >
                        {tpl.category}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {tpl.components.body?.text ?? "No body text"}
                    </p>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                      {tpl.language}
                    </span>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Customise + preview */}
        <div className="scrollbar-thin min-h-0 overflow-y-auto bg-gradient-to-b from-brand-50/40 to-white p-4 sm:p-5">
          <AnimatePresence mode="wait" initial={false}>
            {selectedTemplate ? (
              <motion.div
                key={selectedTemplate.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Variables
                  </h3>
                  {placeholders.length === 0 ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">This template has no variables.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {placeholders.map((num) => (
                        <VariableInput
                          key={num}
                          num={num}
                          value={variables[num] ?? ""}
                          onChange={(v) => setVariables((prev) => ({ ...prev, [num]: v }))}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Preview
                  </h3>
                  <div className="rounded-3xl border border-border/70 bg-[radial-gradient(hsl(268_25%_88%/0.6)_1px,transparent_1px)] bg-brand-50/50 bg-[length:16px_16px] p-4">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-white p-3 shadow-soft">
                      {headerType === "IMAGE" && (
                        <div className="mb-2 grid h-28 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-400">
                          <ImageIcon size={28} />
                        </div>
                      )}
                      {headerType === "TEXT" && header?.text && (
                        <p className="mb-1 text-sm font-bold">{header.text}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                        {renderPreviewText()}
                      </p>
                      {selectedTemplate.components.footer?.text && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {selectedTemplate.components.footer.text}
                        </p>
                      )}
                      {selectedTemplate.components.buttons && selectedTemplate.components.buttons.length > 0 && (
                        <div className="mt-2.5 space-y-1 border-t border-border/70 pt-2">
                          {selectedTemplate.components.buttons.map((btn, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-center rounded-lg py-1.5 text-center text-xs font-semibold text-primary"
                            >
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid h-full min-h-[200px] place-items-center text-center"
              >
                <div className="max-w-xs space-y-2">
                  <span className="mx-auto grid h-14 w-14 animate-float place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <FileText size={24} />
                  </span>
                  <p className="pt-2 font-display text-base font-semibold">Pick a template</p>
                  <p className="text-xs text-muted-foreground">
                    Choose an approved template to fill its variables and preview exactly what your
                    customer will see.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ModalShell>
  );
}

function VariableInput({
  num,
  value,
  onChange,
}: {
  num: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="grid h-10 w-12 shrink-0 place-items-center rounded-xl bg-white font-mono text-xs font-bold text-primary ring-1 ring-brand-200"
      >
        {`{{${num}}}`}
      </label>
      <Input
        id={id}
        placeholder={`Value for {{${num}}}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
        aria-invalid={!value.trim() || undefined}
      />
    </div>
  );
}

// --------------------------------------------------------------------------------
// 2. Assign Agent Modal
// --------------------------------------------------------------------------------

export interface AgentMember {
  id: string;
  role: string;
  isOnline: boolean;
  user: { id: string; name: string | null; email: string } | null;
  openConversations: number;
}

export function AssignAgentModal({
  conversationId,
  currentAssigneeId,
  isOpen,
  onClose,
}: {
  conversationId: string;
  currentAssigneeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: ["admin", "agents"],
    queryFn: () => api.get<{ data: AgentMember[] }>("/admin/agents"),
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (assignedTo: string | null) =>
      api.patch(`/conversations/${conversationId}`, { assignedTo }),
    onSuccess: (_data, assignedTo) => {
      toast.success(assignedTo ? "Conversation assigned" : "Conversation unassigned");
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "agents"] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to assign conversation")),
  });

  const agents = (agentsQuery.data?.data ?? []).filter((a) => a.user);
  const pendingId = assignMutation.isPending ? (assignMutation.variables ?? "none") : undefined;

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={UserCheck}
      title="Assign conversation"
      description="Route this chat to a teammate. Agents see their assigned conversations first."
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-2">
        {agentsQuery.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <>
            <SelectRow
              selected={!currentAssigneeId}
              disabled={assignMutation.isPending}
              onClick={() => assignMutation.mutate(null)}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
                  <UserMinus size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold">Unassigned</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingId === "none" ? "Updating…" : "Keep it in the shared queue"}
                  </p>
                </div>
              </div>
            </SelectRow>

            {agents.length === 0 && !agentsQuery.isError && (
              <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No agents or managers in this workspace yet.{" "}
                <Link href="/admin/agents" className="font-semibold text-primary hover:underline">
                  Invite your team
                </Link>
              </p>
            )}
            {agentsQuery.isError && (
              <p className="p-4 text-center text-xs text-destructive">
                {errorMessage(agentsQuery.error, "Agents could not be loaded.")}
              </p>
            )}

            {agents.map((agent, i) => {
              const user = agent.user!;
              const isAssigned = currentAssigneeId === user.id;
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease, delay: Math.min(i, 10) * 0.04 }}
                >
                  <SelectRow
                    selected={isAssigned}
                    disabled={assignMutation.isPending}
                    onClick={() => assignMutation.mutate(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                          {initials(user.name ?? user.email, "A")}
                        </span>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                            agent.isOnline ? "bg-emerald-500" : "bg-zinc-300",
                          )}
                          title={agent.isOnline ? "Online" : "Offline"}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user.name ?? user.email}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {pendingId === user.id
                            ? "Assigning…"
                            : `${agent.role} · ${agent.openConversations} open ${agent.openConversations === 1 ? "chat" : "chats"}`}
                        </p>
                      </div>
                    </div>
                  </SelectRow>
                </motion.div>
              );
            })}
          </>
        )}
      </div>
    </ModalShell>
  );
}

// --------------------------------------------------------------------------------
// 3. New Conversation Modal
// --------------------------------------------------------------------------------

const WA_ID_PATTERN = /^[1-9]\d{7,14}$/;

export function NewConversationModal({
  isOpen,
  onClose,
  onSelectConversation,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
}) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const phoneId = useId();
  const nameId = useId();

  const contactsQuery = useQuery({
    queryKey: ["contacts", { search: debouncedSearch }],
    queryFn: () =>
      api.get<{ data: { id: string; name: string | null; wa_id: string }[] }>("/contacts", {
        search: debouncedSearch,
      }),
    enabled: isOpen && tab === "existing",
  });

  const reset = () => {
    setPhone("");
    setName("");
    setSearch("");
    setTouched(false);
    setTab("existing");
  };

  const close = () => {
    onClose();
    reset();
  };

  const startWithExisting = useMutation({
    mutationFn: (contactId: string) => api.post<{ id: string }>("/conversations", { contactId }),
    onSuccess: (res) => {
      toast.success("Conversation opened");
      onSelectConversation(res.id);
      close();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to open conversation")),
  });

  const cleanPhone = phone.replace(/\D/g, "");
  const phoneError = !cleanPhone
    ? "Enter a phone number"
    : !WA_ID_PATTERN.test(cleanPhone)
      ? "Use 8–15 digits with country code, e.g. 919876543210"
      : null;

  const startWithNew = useMutation({
    mutationFn: async () => {
      if (phoneError) throw new Error(phoneError);
      const contact = await api.post<{ id: string }>("/contacts", {
        waId: cleanPhone,
        name: name.trim() || undefined,
        optInStatus: "opted_in",
        attributes: {},
      });
      return api.post<{ id: string }>("/conversations", { contactId: contact.id });
    },
    onSuccess: (res) => {
      toast.success("New conversation started");
      onSelectConversation(res.id);
      close();
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 409) {
        // The number is already a contact — jump to it instead of failing.
        toast.info("That number is already a contact — pick it below.");
        setTab("existing");
        setSearch(cleanPhone);
        return;
      }
      toast.error(errorMessage(err, "Failed to create conversation"));
    },
  });

  const contacts = contactsQuery.data?.data ?? [];

  return (
    <ModalShell
      open={isOpen}
      onClose={close}
      icon={MessageCirclePlus}
      title="New conversation"
      description="Message an existing contact or start a chat with a new number."
    >
      <div className="space-y-4">
        <SegmentedTabs
          layoutId="new-convo-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "existing", label: "Existing contact" },
            { value: "new", label: "New number" },
          ]}
          className="grid w-full grid-cols-2"
        />

        <AnimatePresence mode="wait" initial={false}>
          {tab === "existing" ? (
            <motion.div
              key="existing"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease }}
              className="space-y-3"
            >
              <div className="relative">
                <Search
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search contacts"
                  placeholder="Search by name or number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-10"
                  data-autofocus
                />
              </div>

              <div className="scrollbar-thin -mx-1 max-h-72 space-y-1 overflow-y-auto px-1">
                {contactsQuery.isLoading ? (
                  <ListSkeleton rows={3} />
                ) : contactsQuery.isError ? (
                  <p className="p-6 text-center text-xs text-destructive">
                    {errorMessage(contactsQuery.error, "Contacts could not be loaded.")}
                  </p>
                ) : contacts.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-semibold">No contacts found</p>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = search.replace(/\D/g, "");
                        if (digits) setPhone(digits);
                        setTab("new");
                      }}
                      className="mt-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Start a chat with a new number instead
                    </button>
                  </div>
                ) : (
                  contacts.map((c, i) => (
                    <motion.button
                      key={c.id}
                      type="button"
                      initial={i < 12 ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease, delay: Math.min(i, 12) * 0.025 }}
                      disabled={startWithExisting.isPending}
                      onClick={() => startWithExisting.mutate(c.id)}
                      className="group flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-brand-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ContactAvatar name={c.name} waId={c.wa_id} seed={c.id} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{c.name ?? `+${c.wa_id}`}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">+{c.wa_id}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary opacity-70 ring-1 ring-brand-200 transition-opacity group-hover:opacity-100">
                        {startWithExisting.isPending && startWithExisting.variables === c.id ? "Opening…" : "Chat"}
                      </span>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="new"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease }}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setTouched(true);
                if (!phoneError) startWithNew.mutate();
              }}
            >
              <div>
                <FieldLabel htmlFor={phoneId} hint="Include country code">
                  Phone number
                </FieldLabel>
                <Input
                  id={phoneId}
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="e.g. 919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={(touched && !!phoneError) || undefined}
                  aria-describedby={`${phoneId}-err`}
                  className="tabular-nums"
                />
                {touched && phoneError && (
                  <p id={`${phoneId}-err`} role="alert" className="mt-1 text-xs font-medium text-destructive">
                    {phoneError}
                  </p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor={nameId} hint="Optional">
                  Contact name
                </FieldLabel>
                <Input
                  id={nameId}
                  placeholder="e.g. Jane Cooper"
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <p className="rounded-xl bg-brand-50/70 px-3 py-2 text-[11px] leading-relaxed text-brand-800">
                The contact is saved as opted-in. New chats start with an approved template until
                they reply.
              </p>
              <Button type="submit" className="w-full" loading={startWithNew.isPending}>
                Start conversation
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </ModalShell>
  );
}

// --------------------------------------------------------------------------------
// 4. Edit Attributes Modal
// --------------------------------------------------------------------------------

type AttributeRow = { id: number; key: string; value: string };

export function EditAttributesModal({
  contactId,
  currentAttributes,
  isOpen,
  onClose,
}: {
  contactId: string;
  currentAttributes: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<AttributeRow[]>([]);
  const [nextId, setNextId] = useState(0);

  // Load the latest saved attributes each time the dialog opens (the contact
  // may have loaded after this component mounted).
  useEffect(() => {
    if (!isOpen) return;
    const entries = Object.entries(currentAttributes).map(([k, v], i) => ({
      id: i,
      key: k,
      value: v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v),
    }));
    setRows(entries);
    setNextId(entries.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const keys = rows.map((r) => r.key.trim()).filter(Boolean);
  const duplicate = keys.find((k, i) => keys.indexOf(k) !== i);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const item of rows) {
        if (item.key.trim()) payload[item.key.trim()] = item.value.trim();
      }
      return api.patch(`/contacts/${contactId}`, { attributes: payload });
    },
    onSuccess: () => {
      toast.success("Attributes saved");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to update attributes")),
  });

  const update = (id: number, patch: Partial<AttributeRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => {
    setRows((prev) => [...prev, { id: nextId, key: "", value: "" }]);
    setNextId((n) => n + 1);
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Hash}
      title="Custom attributes"
      description="Store details like city, order ID or plan to personalise replies and campaigns."
      footer={
        <>
          {duplicate && (
            <p className="mr-auto text-xs font-medium text-destructive">Duplicate key “{duplicate}”</p>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={saveMutation.isPending}
            disabled={!!duplicate}
            onClick={() => saveMutation.mutate()}
          >
            Save attributes
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No attributes yet. Add fields like <span className="font-semibold">city</span> or{" "}
            <span className="font-semibold">order_id</span>.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease }}
                className="flex items-center gap-2"
              >
                <Input
                  aria-label="Attribute key"
                  placeholder="Key (e.g. city)"
                  value={item.key}
                  onChange={(e) => update(item.id, { key: e.target.value })}
                  className="h-10 font-semibold"
                />
                <Input
                  aria-label="Attribute value"
                  placeholder="Value"
                  value={item.value}
                  onChange={(e) => update(item.id, { value: e.target.value })}
                  className="h-10"
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.key || "attribute"}`}
                  onClick={() => setRows((prev) => prev.filter((r) => r.id !== item.id))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-rose-50 hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-1 w-full border-dashed">
          <Plus size={15} /> Add field
        </Button>
      </div>
    </ModalShell>
  );
}

// --------------------------------------------------------------------------------
// 5. Manage Tags Modal
// --------------------------------------------------------------------------------

interface TagItem {
  id: string;
  name: string;
  color: string;
}

const TAG_SWATCHES = ["#833AB4", "#C13584", "#E1306C", "#F77737", "#FCAF45", "#6D28D9", "#0EA5E9", "#10B981"];

export function ManageTagsModal({
  contactId,
  assignedTagIds,
  isOpen,
  onClose,
}: {
  contactId: string;
  assignedTagIds: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(assignedTagIds);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#833AB4");

  // Re-sync with the contact's current tags whenever the dialog opens.
  useEffect(() => {
    if (isOpen) setSelected(assignedTagIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagItem[] }>("/tags"),
    enabled: isOpen,
  });

  const createTag = useMutation({
    mutationFn: () => api.post<TagItem>("/tags", { name: newTagName.trim(), color: newTagColor }),
    onSuccess: (newTag) => {
      setSelected((prev) => [...prev, newTag.id]);
      setNewTagName("");
      toast.success(`Tag “${newTag.name}” created`);
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to create tag")),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/contacts/${contactId}`, { tagIds: selected }),
    onSuccess: () => {
      toast.success("Tags updated");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to update tags")),
  });

  const allTags = tagsQuery.data?.data ?? [];
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Tag}
      title="Tags"
      description="Label this contact to segment campaigns and filter your inbox."
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">{selected.length} selected</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save tags
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {tagsQuery.isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        ) : allTags.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No tags yet — create your first one below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Available tags">
            {allTags.map((tag) => {
              const isChecked = selected.includes(tag.id);
              return (
                <motion.button
                  key={tag.id}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  aria-pressed={isChecked}
                  onClick={() => toggle(tag.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isChecked
                      ? "border-transparent bg-brand-gradient text-white shadow-[0_6px_16px_-8px_rgba(131,58,180,0.8)]"
                      : "border-border bg-white text-foreground hover:border-brand-200 hover:bg-brand-50/50",
                  )}
                >
                  {isChecked ? (
                    <Check size={12} />
                  ) : (
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  )}
                  {tag.name}
                </motion.button>
              );
            })}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTagName.trim()) createTag.mutate();
          }}
          className="space-y-3 rounded-2xl border border-border/80 bg-muted/30 p-3"
        >
          <p className="text-xs font-semibold text-foreground/80">Create a new tag</p>
          <div className="flex gap-2">
            <Input
              aria-label="New tag name"
              placeholder="e.g. VIP, Lead, Wholesale"
              maxLength={60}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-10 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-10"
              loading={createTag.isPending}
              disabled={!newTagName.trim()}
            >
              <Plus size={15} /> Add
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Tag color">
            {TAG_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={newTagColor.toLowerCase() === color.toLowerCase()}
                aria-label={`Color ${color}`}
                onClick={() => setNewTagColor(color)}
                className={cn(
                  "h-6 w-6 rounded-full ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  newTagColor.toLowerCase() === color.toLowerCase() && "ring-2 ring-foreground/70",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="relative ml-1 grid h-6 w-6 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border text-muted-foreground hover:border-brand-300">
              <Plus size={12} />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                aria-label="Custom tag color"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}

// --------------------------------------------------------------------------------
// 6. Manage Groups Modal
// --------------------------------------------------------------------------------

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
}

export function ManageGroupsModal({
  contactId,
  assignedGroupIds,
  isOpen,
  onClose,
}: {
  contactId: string;
  assignedGroupIds: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(assignedGroupIds);

  useEffect(() => {
    if (isOpen) setSelected(assignedGroupIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: GroupItem[] }>("/groups"),
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/contacts/${contactId}`, { groupIds: selected }),
    onSuccess: () => {
      toast.success("Groups updated");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to update groups")),
  });

  const allGroups = groupsQuery.data?.data ?? [];

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Users}
      title="Groups"
      description="Add this contact to groups used for broadcasts."
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">{selected.length} selected</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save groups
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {groupsQuery.isLoading ? (
          <ListSkeleton rows={3} />
        ) : allGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No groups created yet.{" "}
            <Link href="/manage/groups" className="font-semibold text-primary hover:underline">
              Create a group
            </Link>
          </div>
        ) : (
          allGroups.map((group, i) => {
            const isChecked = selected.includes(group.id);
            return (
              <motion.div
                key={group.id}
                initial={i < 12 ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease, delay: Math.min(i, 12) * 0.03 }}
              >
                <SelectRow
                  selected={isChecked}
                  onClick={() =>
                    setSelected((prev) =>
                      isChecked ? prev.filter((id) => id !== group.id) : [...prev, group.id],
                    )
                  }
                >
                  <p className="text-sm font-semibold">{group.name}</p>
                  {group.description && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{group.description}</p>
                  )}
                </SelectRow>
              </motion.div>
            );
          })
        )}
      </div>
    </ModalShell>
  );
}

// --------------------------------------------------------------------------------
// 7. Create Support Ticket Modal
// --------------------------------------------------------------------------------

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
type Priority = (typeof PRIORITIES)[number];

export function CreateTicketModal({
  contactName,
  isOpen,
  onClose,
}: {
  contactName: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const subjectId = useId();
  const messageId = useId();

  // Mirrors supportTicketSchema: subject 4–200 chars, message 4–5000 chars.
  const subjectError =
    subject.trim().length < 4 ? "Subject needs at least 4 characters" : null;
  const messageError =
    message.trim().length < 4 ? "Description needs at least 4 characters" : null;

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/support/tickets", {
        subject: subject.trim(),
        priority,
        message: message.trim(),
      }),
    onSuccess: () => {
      toast.success("Support ticket created");
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      onClose();
      setSubject("");
      setMessage("");
      setPriority("medium");
      setTouched(false);
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to create ticket")),
  });

  const submit = () => {
    setTouched(true);
    if (!subjectError && !messageError) createMutation.mutate();
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Ticket}
      title="Raise a support ticket"
      description="Our support team will get back to you on the Support Tickets page."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={createMutation.isPending} onClick={submit}>
            Create ticket
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <FieldLabel htmlFor={subjectId} hint={`${subject.trim().length}/200`}>
            Subject
          </FieldLabel>
          <Input
            id={subjectId}
            maxLength={200}
            placeholder={`e.g. Issue reported by ${contactName ?? "a customer"}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={(touched && !!subjectError) || undefined}
          />
          {touched && subjectError && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {subjectError}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground/90" id={`${subjectId}-priority`}>
            Priority
          </p>
          <SegmentedTabs
            layoutId="ticket-priority"
            value={priority}
            onChange={setPriority}
            tabs={PRIORITIES.map((p) => ({ value: p, label: <span className="capitalize">{p}</span> }))}
            className="grid w-full grid-cols-4 [&_button]:px-1 [&_button]:text-xs"
          />
        </div>

        <div>
          <FieldLabel htmlFor={messageId} hint={`${message.trim().length}/5000`}>
            Description
          </FieldLabel>
          <Textarea
            id={messageId}
            maxLength={5000}
            placeholder="Describe the issue, steps to reproduce, or what the customer reported…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[110px]"
            aria-invalid={(touched && !!messageError) || undefined}
          />
          {touched && messageError && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {messageError}
            </p>
          )}
        </div>
      </form>
    </ModalShell>
  );
}

// --------------------------------------------------------------------------------
// 8. Media Attachment Modal
// --------------------------------------------------------------------------------

export type MediaKind = "image" | "video" | "audio" | "document";

const MEDIA_KINDS: { value: MediaKind; label: string; icon: typeof ImageIcon; example: string }[] = [
  { value: "image", label: "Image", icon: ImageIcon, example: "https://example.com/photo.jpg" },
  { value: "video", label: "Video", icon: Film, example: "https://example.com/clip.mp4" },
  { value: "document", label: "Document", icon: FileText, example: "https://example.com/invoice.pdf" },
  { value: "audio", label: "Audio", icon: Music, example: "https://example.com/note.mp3" },
];

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function MediaAttachmentModal({
  conversationId,
  type,
  isOpen,
  onClose,
}: {
  conversationId: string;
  type: MediaKind;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<MediaKind>(type);
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const urlId = useId();
  const captionId = useId();

  useEffect(() => {
    if (isOpen) setKind(type);
  }, [isOpen, type]);

  useEffect(() => setPreviewFailed(false), [mediaUrl]);

  const trimmedUrl = mediaUrl.trim();
  const urlValid = isHttpUrl(trimmedUrl);
  // WhatsApp audio messages don't support captions.
  const supportsCaption = kind !== "audio";

  const sendMedia = useMutation({
    mutationFn: () =>
      api.post(`/conversations/${conversationId}/messages`, {
        type: "media",
        mediaType: kind,
        mediaUrl: trimmedUrl,
        caption: supportsCaption ? caption.trim() || undefined : undefined,
      }),
    onSuccess: () => {
      toast.success(`${kind[0]!.toUpperCase()}${kind.slice(1)} sent`);
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
      setMediaUrl("");
      setCaption("");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to send media")),
  });

  const meta = MEDIA_KINDS.find((m) => m.value === kind) ?? MEDIA_KINDS[0]!;

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Link2}
      title="Send media"
      description="Paste a public link to the file. WhatsApp downloads it and delivers it to the customer."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={sendMedia.isPending}
            disabled={!urlValid}
            onClick={() => sendMedia.mutate()}
          >
            Send {meta.label.toLowerCase()}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (urlValid) sendMedia.mutate();
        }}
      >
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Media type">
          {MEDIA_KINDS.map(({ value, label, icon: Icon }) => {
            const active = kind === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(value)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active ? "border-transparent text-white" : "border-border bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="media-kind-indicator"
                    className="absolute inset-0 rounded-2xl bg-brand-gradient shadow-glow"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={18} className="relative" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <FieldLabel htmlFor={urlId}>{meta.label} URL</FieldLabel>
          <Input
            id={urlId}
            type="url"
            inputMode="url"
            placeholder={meta.example}
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            aria-invalid={(trimmedUrl.length > 0 && !urlValid) || undefined}
          />
          {trimmedUrl.length > 0 && !urlValid && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              Enter a full http(s) link
            </p>
          )}
        </div>

        <AnimatePresence initial={false}>
          {kind === "image" && urlValid && !previewFailed && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease }}
              className="overflow-hidden rounded-2xl border border-border/70 bg-muted/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trimmedUrl}
                alt="Preview of the image to send"
                onError={() => setPreviewFailed(true)}
                className="max-h-48 w-full object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {supportsCaption && (
          <div>
            <FieldLabel htmlFor={captionId} hint="Optional">
              Caption
            </FieldLabel>
            <Input
              id={captionId}
              maxLength={1024}
              placeholder="Add a caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        )}
      </form>
    </ModalShell>
  );
}
