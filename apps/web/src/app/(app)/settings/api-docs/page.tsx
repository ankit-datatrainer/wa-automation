"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const ENDPOINTS = [
  { method: "GET", path: "/api/contacts", description: "List contacts, paginated and filterable." },
  { method: "POST", path: "/api/contacts", description: "Create a contact." },
  { method: "POST", path: "/api/contacts/import", description: "Bulk import contacts." },
  { method: "GET", path: "/api/conversations", description: "List conversations." },
  { method: "POST", path: "/api/conversations/:id/messages", description: "Send a message." },
  { method: "GET", path: "/api/templates", description: "List message templates." },
  { method: "POST", path: "/api/templates/:id/submit", description: "Submit a template to Meta." },
  { method: "POST", path: "/api/campaigns", description: "Create a campaign." },
  { method: "POST", path: "/api/campaigns/:id/send", description: "Start sending a campaign." },
  { method: "GET", path: "/api/analytics/overview", description: "Message volume and delivery rates." },
];

export default function ApiDocsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<{ data: ApiKey[] }>("/settings/api-keys"),
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
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not revoke"),
  });

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const rows = keys.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="API Docs"
        description="Programmatic access to your WA Automations workspace."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Send your key as a bearer token on every request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
{`curl ${process.env.NEXT_PUBLIC_API_URL}/api/contacts \\
  -H "Authorization: Bearer wa_your_api_key_here"`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>
              The full key is shown once at creation. Store it somewhere safe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-48 flex-1 space-y-1.5">
                <label className="text-sm font-medium">Key name</label>
                <Input
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production server"
                />
              </div>
              <Button type="submit" loading={create.isPending}>
                <Plus size={16} />
                Create key
              </Button>
            </form>

            {newKey && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-accent p-4">
                <code className="flex-1 break-all font-mono text-xs">{newKey}</code>
                <Button size="sm" variant="outline" onClick={() => copy(newKey)}>
                  <Copy size={14} />
                  Copy
                </Button>
              </div>
            )}

            {keys.isLoading ? (
              <Skeleton className="h-32" />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No API keys yet"
                description="Create a key to call the WA Automations API from your own systems."
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Key</TH>
                    <TH>Last used</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((key) => (
                    <TR key={key.id}>
                      <TD className="font-medium">{key.name}</TD>
                      <TD className="font-mono text-xs">{key.key_prefix}…</TD>
                      <TD className="text-xs text-muted-foreground">
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}
                      </TD>
                      <TD>
                        <Badge tone={key.revoked_at ? "danger" : "success"}>
                          {key.revoked_at ? "Revoked" : "Active"}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex justify-end">
                          {!key.revoked_at && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Revoke ${key.name}`}
                              onClick={() => revoke.mutate(key.id)}
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>All responses are JSON. Errors carry a code and message.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH className="w-20">Method</TH>
                  <TH>Path</TH>
                  <TH>Description</TH>
                </TR>
              </THead>
              <TBody>
                {ENDPOINTS.map((endpoint) => (
                  <TR key={`${endpoint.method}-${endpoint.path}`}>
                    <TD>
                      <Badge tone={endpoint.method === "GET" ? "info" : "success"}>
                        {endpoint.method}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-xs">{endpoint.path}</TD>
                    <TD className="text-sm text-muted-foreground">{endpoint.description}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
