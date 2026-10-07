"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Braces,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatePresence, ease, motion, SegmentedTabs, Stagger, StaggerItem } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  CodeBlock,
  ConfirmDialog,
  SecretValue,
  SettingsSection,
  timeAgo,
} from "../../manage/_components/settings-kit";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

const ENDPOINTS: { method: Method; path: string; description: string; group: string }[] = [
  { group: "Contacts", method: "GET", path: "/api/contacts", description: "List contacts, paginated and filterable." },
  { group: "Contacts", method: "POST", path: "/api/contacts", description: "Create a contact." },
  { group: "Contacts", method: "GET", path: "/api/contacts/:id", description: "Fetch a single contact." },
  { group: "Contacts", method: "PATCH", path: "/api/contacts/:id", description: "Update a contact." },
  { group: "Contacts", method: "DELETE", path: "/api/contacts/:id", description: "Delete a contact." },
  { group: "Contacts", method: "POST", path: "/api/contacts/import", description: "Bulk import contacts." },
  { group: "Conversations", method: "GET", path: "/api/conversations", description: "List conversations." },
  { group: "Conversations", method: "GET", path: "/api/conversations/:id/messages", description: "Read a conversation's messages." },
  { group: "Conversations", method: "POST", path: "/api/conversations/:id/messages", description: "Send a message." },
  { group: "Templates", method: "GET", path: "/api/templates", description: "List message templates." },
  { group: "Templates", method: "POST", path: "/api/templates/:id/submit", description: "Submit a template to Meta." },
  { group: "Campaigns", method: "GET", path: "/api/campaigns", description: "List campaigns." },
  { group: "Campaigns", method: "POST", path: "/api/campaigns", description: "Create a campaign." },
  { group: "Campaigns", method: "POST", path: "/api/campaigns/:id/send", description: "Start sending a campaign." },
  { group: "Analytics", method: "GET", path: "/api/analytics/overview", description: "Message volume and delivery rates." },
];

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-violet-50 text-violet-700 ring-violet-200",
  POST: "bg-brand-50 text-brand-700 ring-brand-200",
  PATCH: "bg-amber-50 text-amber-700 ring-amber-200",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Lang = "curl" | "js" | "python";

function examples(key: string): Record<Lang, string> {
  return {
    curl: `curl ${API_BASE}/api/contacts \\
  -H "Authorization: Bearer ${key}"

# Send a text message in a conversation
curl -X POST ${API_BASE}/api/conversations/CONVERSATION_ID/messages \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "text", "text": "Hello from the API 👋" }'`,
    js: `const res = await fetch("${API_BASE}/api/contacts", {
  headers: { Authorization: "Bearer ${key}" },
});
const { data } = await res.json();

await fetch("${API_BASE}/api/conversations/CONVERSATION_ID/messages", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ type: "text", text: "Hello from the API 👋" }),
});`,
    python: `import requests

headers = {"Authorization": "Bearer ${key}"}

contacts = requests.get("${API_BASE}/api/contacts", headers=headers).json()

requests.post(
    "${API_BASE}/api/conversations/CONVERSATION_ID/messages",
    headers=headers,
    json={"type": "text", "text": "Hello from the API 👋"},
)`,
  };
}

export default function ApiDocsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("curl");
  const [endpointFilter, setEndpointFilter] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<ApiKey | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<{ data: ApiKey[] }>("/settings/api-keys"),
    retry: (count, error) => !(error instanceof ApiClientError && error.status === 403) && count < 2,
  });

  const create = useMutation({
    mutationFn: () => api.post<{ key: string }>("/settings/api-keys", { name: name.trim(), scopes: [] }),
    onSuccess: (result) => {
      setNewKey(result.key);
      setName("");
      toast.success("API key created — copy it now, it won't be shown again");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the key"),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/api-keys/${id}`),
    onSuccess: () => {
      toast.success("Key revoked");
      setPendingRevoke(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not revoke"),
  });

  const rows = keys.data?.data ?? [];
  const forbidden = keys.error instanceof ApiClientError && keys.error.status === 403;

  const filteredEndpoints = useMemo(() => {
    const q = endpointFilter.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase() === q ||
        e.group.toLowerCase().includes(q),
    );
  }, [endpointFilter]);

  const code = examples(newKey ?? "wa_your_api_key_here")[lang];

  return (
    <>
      <PageHeader title="API Docs" description="Programmatic access to your WA Automation workspace." />

      {/* --------------------------------------------------------------- hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div aria-hidden className="absolute inset-0 bg-brand-gradient opacity-[0.06]" />
          <div aria-hidden className="bg-grid absolute inset-0 opacity-50 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-3">
              <Badge tone="brand">
                <Braces size={12} /> REST · JSON
              </Badge>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Build on <span className="text-gradient">WA Automation</span>
              </h2>
              <p className="max-w-lg text-sm text-muted-foreground">
                Every request is authenticated with a bearer token. All responses are JSON, and errors
                carry a machine-readable <code className="text-xs">code</code> plus a human message.
              </p>
            </div>
            <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" stagger={0.08}>
              {[
                { icon: Terminal, label: "Base URL", value: `${API_BASE}/api` },
                { icon: ShieldCheck, label: "Auth", value: "Authorization: Bearer" },
                { icon: BookOpen, label: "Endpoints", value: `${ENDPOINTS.length} documented` },
              ].map((item) => (
                <StaggerItem key={item.label} className="min-w-0 rounded-2xl border bg-white/90 p-3.5 shadow-soft">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <item.icon size={13} className="text-primary" /> {item.label}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs font-semibold" title={item.value}>
                    {item.value}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* --------------------------------------------------------- API keys */}
        <SettingsSection
          icon={KeyRound}
          title="API keys"
          description="The full key is shown once at creation. Store it somewhere safe."
        >
          <div className="space-y-5">
            {/* The API middleware only accepts signed-in session tokens today, so be
                upfront that a wa_ key can't authenticate requests yet. */}
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                Key-based authentication isn&apos;t switched on for this server yet. Requests currently need
                a signed-in session token, so you can create and revoke keys here, but they won&apos;t
                authenticate API calls until it&apos;s enabled.
              </span>
            </p>

            {!forbidden && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1">
                  <Field label="Key name" hint="So you can tell keys apart later.">
                    {({ id }) => (
                      <Input
                        id={id}
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Production server"
                      />
                    )}
                  </Field>
                </div>
                <Button type="submit" loading={create.isPending} className="sm:mb-[22px]">
                  {!create.isPending && <Plus size={16} />}
                  Create key
                </Button>
              </form>
            )}

            <AnimatePresence initial={false}>
              {newKey && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.98 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
                    <p className="flex items-start gap-2 text-sm font-semibold text-brand-800">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand-pink" />
                      Copy your new key now — for security it won&apos;t be shown again.
                    </p>
                    <SecretValue value={newKey} label="new API key" copyLabel="API key copied" className="bg-white" />
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                        I&apos;ve saved it
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {forbidden ? (
              <EmptyState
                icon={ShieldCheck}
                title="Admins only"
                description="Ask an owner or admin of this workspace to create an API key for you."
              />
            ) : keys.isError ? (
              <ErrorState message="Could not load API keys." onRetry={() => void keys.refetch()} />
            ) : keys.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No API keys yet"
                description="Create a key to call the WA Automation API from your own systems."
              />
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {rows.map((key, i) => {
                    const isRevoked = Boolean(key.revoked_at);
                    const shown = revealed[key.id];
                    return (
                      <motion.li
                        key={key.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease, delay: Math.min(i, 10) * 0.04 } }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3.5 transition hover:border-brand-200 hover:shadow-soft",
                          isRevoked && "opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                            isRevoked ? "bg-muted text-muted-foreground" : "bg-brand-gradient text-white shadow-glow",
                          )}
                        >
                          <KeyRound size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{key.name}</p>
                            <Badge tone={isRevoked ? "danger" : "success"}>{isRevoked ? "Revoked" : "Active"}</Badge>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <code className="font-mono">
                                {shown ? `${key.key_prefix}…` : "wa_••••••••••"}
                              </code>
                              <button
                                type="button"
                                onClick={() => setRevealed((r) => ({ ...r, [key.id]: !r[key.id] }))}
                                aria-label={shown ? `Hide prefix of ${key.name}` : `Show prefix of ${key.name}`}
                                aria-pressed={shown}
                                className="grid h-6 w-6 place-items-center rounded-md transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                {shown ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </span>
                            <span>Last used {timeAgo(key.last_used_at)}</span>
                            <span>Created {timeAgo(key.created_at, "—")}</span>
                          </div>
                        </div>
                        {!isRevoked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Revoke ${key.name}`}
                            onClick={() => setPendingRevoke(key)}
                            className="text-destructive hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Revoke</span>
                          </Button>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </SettingsSection>

        {/* --------------------------------------------------- quick start */}
        <SettingsSection
          icon={Terminal}
          title="Quick start"
          description={newKey ? "Examples below already include your new key." : "Send your key as a bearer token on every request."}
          actions={
            <SegmentedTabs
              layoutId="api-lang"
              value={lang}
              onChange={setLang}
              tabs={[
                { value: "curl", label: "cURL" },
                { value: "js", label: "JavaScript" },
                { value: "python", label: "Python" },
              ]}
            />
          }
          delay={0.06}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={lang}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <CodeBlock
                code={code}
                title={lang === "curl" ? "Terminal" : lang === "js" ? "index.js" : "main.py"}
              />
            </motion.div>
          </AnimatePresence>
          <CodeBlock
            className="mt-4"
            title="Error response"
            code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": { ... }
  }
}`}
          />
        </SettingsSection>
      </div>

      {/* ------------------------------------------------------- endpoints */}
      <SettingsSection
        className="mt-5"
        icon={BookOpen}
        title="Endpoints"
        description="All responses are JSON. Errors carry a code and message."
        delay={0.1}
        contentClassName="p-0 sm:p-0"
        actions={
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Filter endpoints"
              value={endpointFilter}
              onChange={(e) => setEndpointFilter(e.target.value)}
              placeholder="Filter endpoints…"
              className="h-10 pl-9"
            />
          </div>
        }
      >
        {filteredEndpoints.length === 0 ? (
          <EmptyState icon={Search} title="No endpoints match" description="Try a path, method or resource name." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-24">Method</TH>
                <TH>Path</TH>
                <TH className="hidden md:table-cell">Resource</TH>
                <TH>Description</TH>
              </TR>
            </THead>
            <TBody>
              {filteredEndpoints.map((endpoint) => (
                <TR key={`${endpoint.method}-${endpoint.path}`}>
                  <TD>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ring-1 ring-inset",
                        METHOD_STYLES[endpoint.method],
                      )}
                    >
                      {endpoint.method}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap font-mono text-xs">{endpoint.path}</TD>
                  <TD className="hidden text-xs font-semibold text-muted-foreground md:table-cell">
                    {endpoint.group}
                  </TD>
                  <TD className="min-w-[200px] text-sm text-muted-foreground">{endpoint.description}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </SettingsSection>

      <ConfirmDialog
        open={Boolean(pendingRevoke)}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => pendingRevoke && revoke.mutate(pendingRevoke.id)}
        loading={revoke.isPending}
        confirmLabel="Revoke key"
        title="Revoke this API key?"
        description={
          pendingRevoke ? (
            <>
              Any system using <b>{pendingRevoke.name}</b> will immediately lose access. This can&apos;t be
              undone.
            </>
          ) : undefined
        }
      />
    </>
  );
}
