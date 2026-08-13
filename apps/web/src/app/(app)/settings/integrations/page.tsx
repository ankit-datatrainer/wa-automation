"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Sheet, Store, Webhook, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface Integration {
  id: string;
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

const PROVIDERS = [
  {
    provider: "webhook",
    name: "Outgoing Webhook",
    description: "Post every inbound message and status change to a URL you control.",
    icon: Webhook,
    field: { key: "url", label: "Endpoint URL", placeholder: "https://example.com/hooks/wa" },
  },
  {
    provider: "zapier",
    name: "Zapier",
    description: "Connect WA Automations to thousands of apps without writing code.",
    icon: Zap,
    field: { key: "hookUrl", label: "Zapier hook URL", placeholder: "https://hooks.zapier.com/..." },
  },
  {
    provider: "shopify",
    name: "Shopify",
    description: "Sync orders and send abandoned-cart and shipping updates.",
    icon: ShoppingBag,
    field: { key: "storeDomain", label: "Store domain", placeholder: "your-store.myshopify.com" },
  },
  {
    provider: "woocommerce",
    name: "WooCommerce",
    description: "Sync your WooCommerce store's orders and customers.",
    icon: Store,
    field: { key: "siteUrl", label: "Site URL", placeholder: "https://example.com" },
  },
  {
    provider: "google_sheets",
    name: "Google Sheets",
    description: "Append new contacts and flow submissions to a spreadsheet.",
    icon: Sheet,
    field: { key: "sheetId", label: "Spreadsheet ID", placeholder: "1AbC..." },
  },
] as const;

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<{ data: Integration[] }>("/settings/integrations"),
  });

  const save = useMutation({
    mutationFn: ({ provider, config }: { provider: string; config: Record<string, string> }) =>
      api.post("/settings/integrations", { provider, config, isActive: true }),
    onSuccess: () => {
      toast.success("Integration saved");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const existing = new Map(integrations.data?.data.map((i) => [i.provider, i]) ?? []);

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect WA Automations to the rest of your stack."
      />

      {integrations.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map(({ provider, name, description, icon: Icon, field }) => {
            const current = existing.get(provider);
            const stored = (current?.config?.[field.key] as string) ?? "";

            return (
              <Card key={provider} className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={20} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold">{name}</h2>
                      {current?.is_active && <Badge tone="success">Connected</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save.mutate({
                      provider,
                      config: { [field.key]: values[provider] ?? stored },
                    });
                  }}
                  className="mt-auto space-y-2"
                >
                  <label className="text-sm font-medium">{field.label}</label>
                  <div className="flex gap-2">
                    <Input
                      required
                      value={values[provider] ?? stored}
                      onChange={(e) =>
                        setValues((current) => ({ ...current, [provider]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                    <Button type="submit" loading={save.isPending && save.variables?.provider === provider}>
                      {current ? "Update" : "Connect"}
                    </Button>
                  </div>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
