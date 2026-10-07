"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Code2, MessageCircle, Palette, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { ease, motion, SegmentedTabs } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { CodeBlock, SettingsSection, StickySaveBar } from "../_components/settings-kit";

interface WabaAccount {
  display_phone: string;
}

interface Integration {
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

interface LiveChatConfig {
  greeting: string;
  buttonText: string;
  position: "right" | "left";
  openHour: string;
  closeHour: string;
  color: string;
  hideOutsideHours: boolean;
}

const DEFAULTS: LiveChatConfig = {
  greeting: "Hi! How can we help you today?",
  buttonText: "Chat with us",
  position: "right",
  openHour: "09:00",
  closeHour: "18:00",
  color: "#833AB4",
  hideOutsideHours: false,
};

const COLORS = [
  { value: "#833AB4", label: "Purple" },
  { value: "#C13584", label: "Magenta" },
  { value: "#E1306C", label: "Pink" },
  { value: "#25D366", label: "WhatsApp green" },
  { value: "#111827", label: "Ink" },
];

const FORM_ID = "live-chat-form";

/**
 * Live chat settings are kept on the "webhook" integration row under a
 * `liveChat` key so they never overwrite the outgoing webhook's own URL/secret.
 * Older saves stored the fields at the top level, so fall back to those.
 */
function readConfig(integration: Integration | undefined): LiveChatConfig {
  const config = integration?.config ?? {};
  const nested = (config.liveChat ?? {}) as Partial<LiveChatConfig>;
  const legacy = config as Partial<Record<keyof LiveChatConfig, unknown>>;
  const str = (key: keyof LiveChatConfig) => {
    const v = nested[key] ?? legacy[key];
    return typeof v === "string" && v ? v : (DEFAULTS[key] as string);
  };
  return {
    greeting: str("greeting"),
    buttonText: str("buttonText"),
    position: str("position") === "left" ? "left" : "right",
    openHour: str("openHour"),
    closeHour: str("closeHour"),
    color: /^#[0-9a-f]{6}$/i.test(str("color")) ? str("color") : DEFAULTS.color,
    hideOutsideHours: Boolean(nested.hideOutsideHours),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export default function LiveChatSettingPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LiveChatConfig>(DEFAULTS);
  const [snippetTab, setSnippetTab] = useState<"html" | "link">("html");

  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () => api.get<{ data: WabaAccount | null }>("/waba"),
  });

  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<{ data: Integration[] }>("/settings/integrations"),
  });

  const webhook = integrations.data?.data.find((i) => i.provider === "webhook");
  const saved = useMemo(() => readConfig(webhook), [webhook]);

  useEffect(() => {
    if (integrations.data) setForm(saved);
  }, [integrations.data, saved]);

  const dirty = integrations.isSuccess && JSON.stringify(form) !== JSON.stringify(saved);

  const save = useMutation({
    mutationFn: () => {
      // Preserve the outgoing webhook's url/secret; drop legacy top-level keys.
      const rest = { ...(webhook?.config ?? {}) };
      for (const key of ["greeting", "buttonText", "position", "openHour", "closeHour"]) {
        delete rest[key];
      }
      return api.post("/settings/integrations", {
        provider: "webhook",
        config: { ...rest, liveChat: form },
        // Saving widget settings must not switch the outgoing webhook on.
        isActive: webhook?.is_active ?? false,
      });
    },
    onSuccess: () => {
      toast.success("Live chat settings saved");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const set = <K extends keyof LiveChatConfig>(key: K, value: LiveChatConfig[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const phone = waba.data?.data?.display_phone?.replace(/\D/g, "") ?? "";
  const link = `https://wa.me/${phone || "YOUR_NUMBER"}?text=${encodeURIComponent(form.greeting)}`;

  const hoursScript = form.hideOutsideHours
    ? `
<script>
  (function () {
    var now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    if (m < ${toMinutes(form.openHour)} || m >= ${toMinutes(form.closeHour)}) {
      document.getElementById("wa-chat-button").style.display = "none";
    }
  })();
</script>`
    : "";

  const snippet = `<a id="wa-chat-button"
  href="${link}"
  target="_blank" rel="noreferrer"
  style="position:fixed;bottom:24px;${form.position}:24px;z-index:9999;
         display:flex;align-items:center;gap:8px;padding:12px 20px;
         background:${form.color};color:#fff;border-radius:9999px;
         font:600 15px system-ui;text-decoration:none;
         box-shadow:0 4px 16px rgba(0,0,0,.2)">
  ${escapeHtml(form.buttonText)}
</a>${hoursScript}`;

  const hoursInvalid = toMinutes(form.closeHour) <= toMinutes(form.openHour);

  return (
    <>
      <PageHeader
        title="Live Chat Setting"
        description="A WhatsApp chat button for your website, plus the hours your team is available."
      />

      {!waba.isLoading && !phone && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900"
        >
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <p className="flex-1">Connect a WhatsApp number to generate a working chat link.</p>
          <Link href="/manage/credentials" className="font-semibold text-amber-900 underline-offset-4 hover:underline">
            Manage Credentials →
          </Link>
        </motion.div>
      )}

      {integrations.isError ? (
        // Without the saved row we can't merge safely — saving now would wipe the
        // outgoing webhook's URL/secret, so block the form until it loads.
        <ErrorState
          message={
            integrations.error instanceof ApiClientError
              ? integrations.error.message
              : "Could not load your live chat settings."
          }
          onRetry={() => void integrations.refetch()}
        />
      ) : integrations.isLoading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-[480px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault();
              if (hoursInvalid) {
                toast.error("Closing time must be after opening time");
                return;
              }
              save.mutate();
            }}
            className="min-w-0 space-y-5"
          >
            <SettingsSection icon={MessageCircle} title="Widget" description="How the button looks and what it prefills.">
              <div className="space-y-5">
                <Field label="Button text">
                  {({ id }) => (
                    <Input
                      id={id}
                      maxLength={40}
                      value={form.buttonText}
                      onChange={(e) => set("buttonText", e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Prefilled message" hint="What the visitor's chat opens with.">
                  {({ id }) => (
                    <Textarea
                      id={id}
                      rows={3}
                      maxLength={500}
                      value={form.greeting}
                      onChange={(e) => set("greeting", e.target.value)}
                    />
                  )}
                </Field>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground/90">Position</p>
                  <SegmentedTabs
                    layoutId="livechat-position"
                    value={form.position}
                    onChange={(v) => set("position", v)}
                    tabs={[
                      { value: "left", label: "Bottom left" },
                      { value: "right", label: "Bottom right" },
                    ]}
                  />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection icon={Palette} title="Colour" description="Match the button to your website." delay={0.06}>
              <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Button colour">
                {COLORS.map((c) => {
                  const active = form.color.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={c.label}
                      title={c.label}
                      onClick={() => set("color", c.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        active ? "ring-2 ring-primary" : "hover:scale-110",
                      )}
                      style={{ background: c.value }}
                    >
                      {active && (
                        <motion.span
                          layoutId="livechat-color"
                          className="absolute inset-[-5px] rounded-full border-2 border-primary/30"
                        />
                      )}
                    </button>
                  );
                })}
                <label className="flex items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 text-sm font-medium">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => set("color", e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
                    aria-label="Custom colour"
                  />
                  <span className="font-mono text-xs uppercase">{form.color}</span>
                </label>
              </div>
            </SettingsSection>

            <SettingsSection icon={Clock} title="Availability" description="The hours your team answers chats." delay={0.12}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Opens at">
                  {({ id }) => (
                    <Input id={id} type="time" value={form.openHour} onChange={(e) => set("openHour", e.target.value)} />
                  )}
                </Field>
                <Field label="Closes at" error={hoursInvalid ? "Must be after opening time" : undefined}>
                  {({ id }) => (
                    <Input
                      id={id}
                      type="time"
                      value={form.closeHour}
                      aria-invalid={hoursInvalid || undefined}
                      onChange={(e) => set("closeHour", e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border bg-brand-50/40 p-4">
                <div>
                  <p id="hide-hours-label" className="text-sm font-semibold">
                    Hide the button outside these hours
                  </p>
                  <p className="text-xs text-muted-foreground">Uses the visitor&apos;s local time.</p>
                </div>
                <Switch
                  checked={form.hideOutsideHours}
                  onCheckedChange={(v) => set("hideOutsideHours", v)}
                  aria-label="Hide the button outside business hours"
                />
              </div>
            </SettingsSection>

            {!dirty && (
              <div className="flex justify-end">
                <Button type="submit" loading={save.isPending}>
                  Save settings
                </Button>
              </div>
            )}
            <StickySaveBar
              visible={dirty}
              saving={save.isPending}
              formId={FORM_ID}
              saveLabel="Save settings"
              onDiscard={() => setForm(saved)}
            />
          </form>

          <div className="min-w-0 space-y-5 xl:sticky xl:top-4">
            <WidgetPreview config={form} />

            <SettingsSection
              icon={Code2}
              title="Embed code"
              description={
                <>
                  Paste this just before <code className="text-xs">&lt;/body&gt;</code> on your site.
                </>
              }
              actions={
                <SegmentedTabs
                  layoutId="livechat-snippet"
                  value={snippetTab}
                  onChange={setSnippetTab}
                  tabs={[
                    { value: "html", label: "HTML" },
                    { value: "link", label: "Link" },
                  ]}
                />
              }
            >
              {waba.isLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <CodeBlock
                  code={snippetTab === "html" ? snippet : link}
                  title={snippetTab === "html" ? "index.html" : "Click-to-chat link"}
                />
              )}
            </SettingsSection>
          </div>
        </div>
      )}
    </>
  );
}

function WidgetPreview({ config }: { config: LiveChatConfig }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-pink/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-400/70" />
        </span>
        <span className="ml-2 flex-1 truncate rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground">
          yourwebsite.com
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
          <Sparkles size={12} /> Preview
        </span>
      </div>
      <div className="relative h-64 bg-aurora">
        <div className="space-y-3 p-6" aria-hidden>
          <div className="h-4 w-1/2 rounded-full bg-brand-100" />
          <div className="h-3 w-3/4 rounded-full bg-brand-50" />
          <div className="h-3 w-2/3 rounded-full bg-brand-50" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="h-16 rounded-xl bg-white/80 shadow-soft" />
            <div className="h-16 rounded-xl bg-white/80 shadow-soft" />
            <div className="h-16 rounded-xl bg-white/80 shadow-soft" />
          </div>
        </div>

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={cn(
            "absolute bottom-4 flex flex-col gap-2",
            config.position === "right" ? "right-4 items-end" : "left-4 items-start",
          )}
        >
          <motion.div
            key={config.greeting}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
            className="max-w-[220px] rounded-2xl bg-white px-3 py-2 text-xs text-foreground shadow-lift"
          >
            <span className="line-clamp-3">{config.greeting || "…"}</span>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              Typically replies {config.openHour}–{config.closeHour}
            </span>
          </motion.div>
          <motion.span
            whileHover={{ scale: 1.04 }}
            className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,.2)]"
            style={{ background: config.color }}
          >
            <MessageCircle size={16} />
            {config.buttonText || "Chat with us"}
          </motion.span>
        </motion.div>
      </div>
    </Card>
  );
}
