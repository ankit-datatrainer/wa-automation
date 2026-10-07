"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plug, Search, ShoppingBag, Sheet, Store, Webhook, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { ErrorState, EmptyState, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { ease, motion, SegmentedTabs, Spotlight } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { StatTile } from "../../manage/_components/settings-kit";

interface Integration {
  id: string;
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

type Provider = "webhook" | "zapier" | "shopify" | "woocommerce" | "google_sheets";

const PROVIDERS: {
  provider: Provider;
  name: string;
  description: string;
  icon: typeof Webhook;
  category: "automation" | "commerce" | "data";
  field: { key: string; label: string; placeholder: string; type: "url" | "text" };
  /** Providers the server POSTs events to can sign them with a shared secret. */
  signed?: boolean;
}[] = [
  {
    provider: "webhook",
    name: "Outgoing Webhook",
    description: "Post every inbound message and status change to a URL you control.",
    icon: Webhook,
    category: "automation",
    field: { key: "url", label: "Endpoint URL", placeholder: "https://example.com/hooks/wa", type: "url" },
    signed: true,
  },
  {
    provider: "zapier",
    name: "Zapier",
    description: "Connect WA Automation to thousands of apps without writing code.",
    icon: Zap,
    category: "automation",
    field: { key: "hookUrl", label: "Zapier hook URL", placeholder: "https://hooks.zapier.com/...", type: "url" },
    signed: true,
  },
  {
    provider: "shopify",
    name: "Shopify",
    description: "Sync orders and send abandoned-cart and shipping updates.",
    icon: ShoppingBag,
    category: "commerce",
    field: { key: "storeDomain", label: "Store domain", placeholder: "your-store.myshopify.com", type: "text" },
  },
  {
    provider: "woocommerce",
    name: "WooCommerce",
    description: "Sync your WooCommerce store's orders and customers.",
    icon: Store,
    category: "commerce",
    field: { key: "siteUrl", label: "Site URL", placeholder: "https://example.com", type: "url" },
  },
  {
    provider: "google_sheets",
    name: "Google Sheets",
    description: "Append new contacts and flow submissions to a spreadsheet.",
    icon: Sheet,
    category: "data",
    field: { key: "sheetId", label: "Spreadsheet ID", placeholder: "1AbC...", type: "text" },
  },
];

type Category = "all" | "automation" | "commerce" | "data";

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");

  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<{ data: Integration[] }>("/settings/integrations"),
  });

  const save = useMutation({
    mutationFn: ({
      provider,
      config,
      isActive = true,
    }: {
      provider: string;
      config: Record<string, unknown>;
      isActive?: boolean;
    }) => api.post("/settings/integrations", { provider, config, isActive }),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive === false ? "Integration paused" : "Integration saved");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const existing = useMemo(
    () => new Map(integrations.data?.data.map((i) => [i.provider, i]) ?? []),
    [integrations.data],
  );

  // An integration counts as connected only when it is active AND has its key field set;
  // the webhook row can also exist just to hold live-chat settings.
  const isConnected = (provider: Provider, key: string) => {
    const current = existing.get(provider);
    return Boolean(current?.is_active && typeof current.config?.[key] === "string" && current.config[key]);
  };

  const connectedCount = PROVIDERS.filter((p) => isConnected(p.provider, p.field.key)).length;

  const visible = PROVIDERS.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!search.trim() || `${p.name} ${p.description}`.toLowerCase().includes(search.trim().toLowerCase())),
  );

  return (
    <>
      <PageHeader title="Integrations" description="Connect WA Automation to the rest of your stack." />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={Plug} label="Available" value={PROVIDERS.length} />
        <StatTile
          icon={CheckCircle2}
          label="Connected"
          tone="success"
          value={integrations.isSuccess ? connectedCount : null}
        />
        <StatTile
          icon={Webhook}
          label="Event delivery"
          tone="soft"
          value={integrations.isSuccess ? PROVIDERS.filter((p) => p.signed && isConnected(p.provider, p.field.key)).length : null}
          hint="Webhook endpoints receiving events"
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
          <SegmentedTabs
            layoutId="integration-category"
            value={category}
            onChange={setCategory}
            tabs={[
              { value: "all", label: "All" },
              { value: "automation", label: "Automation" },
              { value: "commerce", label: "Commerce" },
              { value: "data", label: "Data" },
            ]}
          />
        </div>
        <div className="relative w-full md:w-72">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search integrations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="h-10 pl-9"
          />
        </div>
      </div>

      {integrations.isError ? (
        <ErrorState message="Could not load integrations." onRetry={() => void integrations.refetch()} />
      ) : integrations.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={Search} title="No integrations match" description="Try another category or search." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map(({ provider, name, description, icon: Icon, field, signed }, i) => {
            const current = existing.get(provider);
            const config = current?.config ?? {};
            const stored = typeof config[field.key] === "string" ? (config[field.key] as string) : "";
            const storedSecret = typeof config.secret === "string" ? config.secret : "";
            const connected = isConnected(provider, field.key);
            const paused = Boolean(current && !current.is_active && stored);
            const pending = save.isPending && save.variables?.provider === provider;

            return (
              <motion.div
                key={provider}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease, delay: Math.min(i, 8) * 0.06 }}
                whileHover={{ y: -3 }}
              >
                <Spotlight
                  className={cn(
                    "flex h-full flex-col gap-5 rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift",
                    connected && "border-brand-200",
                  )}
                >
                  <div className="relative flex items-start gap-3">
                    <span
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition",
                        connected ? "bg-brand-gradient text-white shadow-glow" : "bg-brand-50 text-primary ring-1 ring-brand-100",
                      )}
                    >
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-semibold">{name}</h2>
                        {connected && <Badge tone="success">Connected</Badge>}
                        {paused && <Badge tone="warning">Paused</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                    </div>
                    {current && stored && (
                      <Switch
                        checked={current.is_active}
                        disabled={pending}
                        onCheckedChange={(checked) =>
                          save.mutate({ provider, config, isActive: checked })
                        }
                        aria-label={`${current.is_active ? "Pause" : "Resume"} ${name}`}
                      />
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const secret = secrets[provider] ?? storedSecret;
                      save.mutate({
                        provider,
                        // Merge so other keys on the row (e.g. live-chat settings) survive.
                        config: {
                          ...config,
                          [field.key]: (values[provider] ?? stored).trim(),
                          ...(signed && { secret: secret.trim() || undefined }),
                        },
                        isActive: true,
                      });
                    }}
                    className="relative mt-auto space-y-3"
                  >
                    <Field label={field.label} required>
                      {({ id }) => (
                        <Input
                          id={id}
                          required
                          type={field.type}
                          value={values[provider] ?? stored}
                          onChange={(e) =>
                            setValues((current) => ({ ...current, [provider]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                        />
                      )}
                    </Field>

                    {signed && (
                      <Field
                        label="Signing secret"
                        hint="Optional. We sign each payload with HMAC-SHA256 in the X-WA-Signature-256 header."
                      >
                        {({ id }) => (
                          <PasswordInput
                            id={id}
                            autoComplete="off"
                            spellCheck={false}
                            value={secrets[provider] ?? storedSecret}
                            onChange={(e) =>
                              setSecrets((current) => ({ ...current, [provider]: e.target.value }))
                            }
                            placeholder="whsec_..."
                          />
                        )}
                      </Field>
                    )}

                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      variant={connected ? "outline" : "primary"}
                      loading={pending}
                    >
                      {connected ? "Update" : "Connect"}
                    </Button>
                  </form>
                </Spotlight>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
