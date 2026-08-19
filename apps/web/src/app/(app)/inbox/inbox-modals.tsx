"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Tag,
  Ticket,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";

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
  const [category, setCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const templatesQuery = useQuery({
    queryKey: ["templates", "approved"],
    queryFn: () => api.get<{ data: Template[] }>("/templates", { status: "approved" }),
    enabled: isOpen,
  });

  const sendTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      return api.post(`/conversations/${conversationId}/messages`, {
        type: "template",
        templateId: selectedTemplate.id,
        variables,
      });
    },
    onSuccess: () => {
      toast.success("Template message sent successfully");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
      setSelectedTemplate(null);
      setVariables({});
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send template");
    },
  });

  if (!isOpen) return null;

  const rawTemplates = templatesQuery.data?.data ?? [];
  const filtered = rawTemplates.filter((tpl) => {
    const matchesCategory = category === "all" || tpl.category === category;
    const matchesSearch =
      tpl.name.toLowerCase().includes(search.toLowerCase()) ||
      (tpl.components.body?.text ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const extractPlaceholders = (text: string) => {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
  };

  const placeholders = selectedTemplate?.components.body?.text
    ? extractPlaceholders(selectedTemplate.components.body.text)
    : [];

  const renderPreviewText = () => {
    if (!selectedTemplate?.components.body?.text) return "";
    let body = selectedTemplate.components.body.text;
    for (const [key, val] of Object.entries(variables)) {
      body = body.replaceAll(`{{${key}}}`, val || `{{${key}}}`);
    }
    return body;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex h-[620px] w-full max-w-4xl flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Browse Message Templates</h3>
            <p className="text-xs text-muted-foreground">
              Send an approved WhatsApp template to restart the 24-hour window with {contactName ?? "this contact"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Split layout */}
        <div className="flex flex-1 min-h-0 divide-x">
          {/* Left: Template Catalog */}
          <div className="flex w-1/2 flex-col p-4">
            <div className="space-y-2 pb-3">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {["all", "marketing", "utility", "authentication"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-semibold capitalize transition-colors",
                      category === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto pr-1">
              {templatesQuery.isLoading ? (
                <div className="grid h-40 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No approved templates match your search.
                </div>
              ) : (
                filtered.map((tpl) => {
                  const active = selectedTemplate?.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setVariables(
                          contactName
                            ? { "1": contactName }
                            : {},
                        );
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-border/80 hover:bg-muted/40",
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-sm text-foreground truncate">{tpl.name}</span>
                        <Badge tone={tpl.category === "marketing" ? "warning" : "info"} className="text-[10px] capitalize">
                          {tpl.category}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {tpl.components.body?.text ?? "No body text"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Customization & Preview */}
          <div className="flex w-1/2 flex-col bg-muted/10 p-5">
            {selectedTemplate ? (
              <div className="flex flex-1 flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Template Variables
                    </h4>
                    {placeholders.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        This template has no variable placeholders.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {placeholders.map((num) => (
                          <div key={num} className="flex items-center gap-2">
                            <span className="grid h-8 w-10 shrink-0 place-items-center rounded-lg bg-muted text-xs font-mono font-bold">
                              {`{{${num}}}`}
                            </span>
                            <Input
                              placeholder={`Value for {{${num}}}...`}
                              value={variables[num] ?? ""}
                              onChange={(e) =>
                                setVariables((prev) => ({ ...prev, [num]: e.target.value }))
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Live WhatsApp Preview
                    </h4>
                    <div className="rounded-2xl border bg-[#EFEAE2] dark:bg-zinc-900 p-4 shadow-inner">
                      <div className="max-w-[85%] rounded-xl bg-white dark:bg-zinc-800 p-3 shadow-md">
                        {selectedTemplate.components.header?.type === "IMAGE" && (
                          <div className="mb-2 grid h-28 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                            <ImageIcon size={28} />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words text-xs text-zinc-900 dark:text-zinc-100">
                          {renderPreviewText()}
                        </p>
                        {selectedTemplate.components.footer?.text && (
                          <p className="mt-2 text-[10px] text-zinc-500">
                            {selectedTemplate.components.footer.text}
                          </p>
                        )}
                        {selectedTemplate.components.buttons && selectedTemplate.components.buttons.length > 0 && (
                          <div className="mt-2.5 space-y-1 border-t pt-2">
                            {selectedTemplate.components.buttons.map((btn, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-center rounded-md bg-zinc-50 dark:bg-zinc-700/50 py-1 text-center text-xs font-semibold text-[#00C268]"
                              >
                                {btn.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    loading={sendTemplate.isPending}
                    onClick={() => sendTemplate.mutate()}
                    className="bg-[#00C268] hover:bg-[#00B05D] text-white"
                  >
                    Send Template Message
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid flex-1 place-items-center text-center">
                <div className="max-w-xs space-y-2">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="text-sm font-semibold">Select a template</p>
                  <p className="text-xs text-muted-foreground">
                    Choose an approved template from the list on the left to preview and customize variables before sending.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 2. Assign Agent Modal
// --------------------------------------------------------------------------------

interface AgentMember {
  id: string;
  role: string;
  isOnline: boolean;
  user: { id: string; name: string | null; email: string };
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
    onSuccess: () => {
      toast.success("Assignment updated");
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to assign conversation");
    },
  });

  if (!isOpen) return null;

  const agents = agentsQuery.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-[#00C268]" />
            <h3 className="text-base font-bold">Assign Conversation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {agentsQuery.isLoading ? (
            <div className="grid h-32 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => assignMutation.mutate(null)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                  !currentAssigneeId ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    ∅
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Unassigned</p>
                    <p className="text-xs text-muted-foreground">Leave in the general inbox queue</p>
                  </div>
                </div>
                {!currentAssigneeId && <Check size={16} className="text-primary" />}
              </button>

              {agents.map((agent) => {
                const isAssigned = currentAssigneeId === agent.user.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => assignMutation.mutate(agent.user.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      isAssigned ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(agent.user.name, "A")}
                        </span>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card",
                            agent.isOnline ? "bg-emerald-500" : "bg-zinc-400",
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{agent.user.name ?? agent.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.role} · {agent.openConversations} active {agent.openConversations === 1 ? "chat" : "chats"}
                        </p>
                      </div>
                    </div>
                    {isAssigned && <Check size={16} className="text-primary" />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 3. New Conversation Modal
// --------------------------------------------------------------------------------

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
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const contactsQuery = useQuery({
    queryKey: ["contacts", { search }],
    queryFn: () => api.get<{ data: { id: string; name: string | null; wa_id: string }[] }>("/contacts", { search }),
    enabled: isOpen && tab === "existing",
  });

  const startWithExisting = useMutation({
    mutationFn: (contactId: string) => api.post<{ id: string }>("/conversations", { contactId }),
    onSuccess: (res) => {
      toast.success("Conversation opened");
      onSelectConversation(res.id);
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to open conversation");
    },
  });

  const startWithNew = useMutation({
    mutationFn: async () => {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 8) {
        throw new Error("Please enter a valid phone number with country code");
      }
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
      onClose();
      setPhone("");
      setName("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create conversation");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-[#00C268]" />
            <h3 className="text-base font-bold">New Conversation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("existing")}
            className={cn(
              "flex-1 rounded-lg py-1.5 transition-colors",
              tab === "existing" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            Select Existing Contact
          </button>
          <button
            type="button"
            onClick={() => setTab("new")}
            className={cn(
              "flex-1 rounded-lg py-1.5 transition-colors",
              tab === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            Direct Number
          </button>
        </div>

        {tab === "existing" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto">
              {contactsQuery.isLoading ? (
                <div className="grid h-28 place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : contactsQuery.data?.data.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  No contacts found.
                </p>
              ) : (
                contactsQuery.data?.data.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => startWithExisting.mutate(c.id)}
                    className="flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(c.name, c.wa_id.slice(-2))}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{c.name ?? `+${c.wa_id}`}</p>
                        <p className="text-xs text-muted-foreground">+{c.wa_id}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary">Chat →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Phone Number (with Country Code)</label>
              <Input
                placeholder="e.g. 919266806659"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Contact Name (Optional)</label>
              <Input
                placeholder="e.g. Ayush Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <Button
              className="w-full bg-[#00C268] hover:bg-[#00B05D] text-white"
              loading={startWithNew.isPending}
              onClick={() => startWithNew.mutate()}
            >
              Start Conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 4. Edit Attributes Modal
// --------------------------------------------------------------------------------

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
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>(() =>
    Object.entries(currentAttributes).map(([k, v]) => ({ key: k, value: String(v ?? "") })),
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const item of attributes) {
        if (item.key.trim()) {
          payload[item.key.trim()] = item.value.trim();
        }
      }
      return api.patch(`/contacts/${contactId}`, { attributes: payload });
    },
    onSuccess: () => {
      toast.success("Contact attributes updated");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update attributes");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold">Manage Custom Attributes</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {attributes.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              No attributes yet. Add custom fields like Department, Order ID, or City.
            </p>
          ) : (
            attributes.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Key (e.g. department)"
                  value={item.key}
                  onChange={(e) => {
                    const next = [...attributes];
                    next[idx].key = e.target.value;
                    setAttributes(next);
                  }}
                  className="h-8 text-xs font-semibold"
                />
                <Input
                  placeholder="Value (e.g. SMM)"
                  value={item.value}
                  onChange={(e) => {
                    const next = [...attributes];
                    next[idx].value = e.target.value;
                    setAttributes(next);
                  }}
                  className="h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAttributes([...attributes, { key: "", value: "" }])}
          className="w-full text-xs"
        >
          <Plus size={14} className="mr-1" /> Add Field
        </Button>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#00C268] hover:bg-[#00B05D] text-white"
          >
            Save Attributes
          </Button>
        </div>
      </div>
    </div>
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
  const [newTagColor, setNewTagColor] = useState("#16A34A");

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
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create tag");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/contacts/${contactId}`, { tagIds: selected }),
    onSuccess: () => {
      toast.success("Contact tags updated");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update tags");
    },
  });

  if (!isOpen) return null;

  const allTags = tagsQuery.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-[#00C268]" />
            <h3 className="text-base font-bold">Assign Tags</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {tagsQuery.isLoading ? (
            <div className="grid h-24 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : allTags.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">No tags exist yet.</p>
          ) : (
            allTags.map((tag) => {
              const isChecked = selected.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      isChecked ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-colors",
                    isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-semibold">{tag.name}</span>
                  </div>
                  {isChecked && <Check size={16} className="text-primary" />}
                </button>
              );
            })
          )}
        </div>

        {/* Quick create tag */}
        <div className="rounded-xl border bg-muted/30 p-2.5 space-y-2">
          <p className="text-xs font-bold text-muted-foreground">Create New Tag</p>
          <div className="flex gap-2">
            <Input
              placeholder="Tag name (e.g. SMM, VIP)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              aria-label="Tag color"
              className="h-8 w-8 cursor-pointer rounded-lg border p-0.5 bg-transparent"
            />
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              loading={createTag.isPending}
              disabled={!newTagName.trim()}
              onClick={() => createTag.mutate()}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#00C268] hover:bg-[#00B05D] text-white"
          >
            Save Tags
          </Button>
        </div>
      </div>
    </div>
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

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: GroupItem[] }>("/groups"),
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/contacts/${contactId}`, { groupIds: selected }),
    onSuccess: () => {
      toast.success("Contact groups updated");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update groups");
    },
  });

  if (!isOpen) return null;

  const allGroups = groupsQuery.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#00C268]" />
            <h3 className="text-base font-bold">Assign Groups</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {groupsQuery.isLoading ? (
            <div className="grid h-28 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : allGroups.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">No groups created yet.</p>
          ) : (
            allGroups.map((group) => {
              const isChecked = selected.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      isChecked ? prev.filter((id) => id !== group.id) : [...prev, group.id],
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                    isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  {isChecked && <Check size={16} className="text-primary" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#00C268] hover:bg-[#00B05D] text-white"
          >
            Save Groups
          </Button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 7. Create Support Ticket Modal
// --------------------------------------------------------------------------------

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
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [message, setMessage] = useState("");

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
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create ticket");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-[#00C268]" />
            <h3 className="text-base font-bold">Raise Support Ticket</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Subject</label>
            <Input
              placeholder={`e.g. Issue reported by ${contactName ?? "customer"}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Priority</label>
            <div className="mt-1 flex gap-2">
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition-colors border",
                    priority === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Initial Description / Note</label>
            <Textarea
              placeholder="Describe the issue or user complaint..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 text-xs min-h-[90px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={createMutation.isPending}
            disabled={!subject.trim() || !message.trim()}
            onClick={() => createMutation.mutate()}
            className="bg-[#00C268] hover:bg-[#00B05D] text-white"
          >
            Create Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 8. Media Attachment Modal
// --------------------------------------------------------------------------------

export function MediaAttachmentModal({
  conversationId,
  type,
  isOpen,
  onClose,
}: {
  conversationId: string;
  type: "image" | "document" | "audio";
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");

  const sendMedia = useMutation({
    mutationFn: () =>
      api.post(`/conversations/${conversationId}/messages`, {
        type: "media",
        mediaType: type,
        mediaUrl: mediaUrl.trim(),
        caption: caption.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Media message sent");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
      setMediaUrl("");
      setCaption("");
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send media");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold capitalize">Send {type}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">
              {type === "image" ? "Image URL" : type === "document" ? "Document URL" : "Audio URL"}
            </label>
            <Input
              placeholder="https://example.com/file.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="mt-1 text-sm font-mono"
            />
          </div>

          {type !== "audio" && (
            <div>
              <label className="text-xs font-bold text-muted-foreground">Caption (Optional)</label>
              <Input
                placeholder="Enter caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={sendMedia.isPending}
            disabled={!mediaUrl.trim()}
            onClick={() => sendMedia.mutate()}
            className="bg-[#00C268] hover:bg-[#00B05D] text-white"
          >
            Send {type}
          </Button>
        </div>
      </div>
    </div>
  );
}
