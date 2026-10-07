"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  Gauge,
  KeyRound,
  Link2,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wand2,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatePresence, ease, motion, Stagger, StaggerItem } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  InfoRow,
  SecretValue,
  SettingsSection,
  timeAgo,
  formatDateTime,
} from "../_components/settings-kit";
import { EmbeddedSignup } from "./embedded-signup";

interface WabaAccount {
  waba_id: string;
  phone_number_id: string;
  display_phone: string;
  verified_name: string | null;
  quality_rating: string;
  messaging_tier: string;
  status: string;
  verify_token: string;
  last_synced_at: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WEBHOOK_URL = `${API_BASE}/webhooks/whatsapp`;

const EMPTY_FORM = {
  wabaId: "",
  phoneNumberId: "",
  accessToken: "",
  appSecret: "",
  verifyToken: "",
};

/** Random URL-safe token for the webhook handshake. */
function generateToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function tierLabel(tier: string | null | undefined) {
  if (!tier) return "—";
  const match = /TIER_(\w+)/.exec(tier);
  if (!match) return tier.replace(/_/g, " ").toLowerCase();
  const raw = match[1]!;
  return raw === "UNLIMITED" ? "Unlimited / day" : `${raw.replace(/K$/, ",000")} / day`;
}

export default function CredentialsPage() {
  const queryClient = useQueryClient();
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () => api.get<{ data: WabaAccount | null }>("/waba"),
  });

  const save = useMutation({
    mutationFn: () =>
      api.post("/waba", {
        wabaId: form.wabaId.trim(),
        phoneNumberId: form.phoneNumberId.trim(),
        accessToken: form.accessToken.trim(),
        ...(form.appSecret.trim() && { appSecret: form.appSecret.trim() }),
        verifyToken: form.verifyToken.trim(),
      }),
    onSuccess: () => {
      toast.success("WhatsApp connected");
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ["waba"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not connect"),
  });

  const sync = useMutation({
    mutationFn: () => api.post("/waba/sync"),
    onSuccess: () => {
      toast.success("Synced with WhatsApp");
      void queryClient.invalidateQueries({ queryKey: ["waba"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "Sync failed");
      // A failed sync flips the status to "error" server-side; reflect it.
      void queryClient.invalidateQueries({ queryKey: ["waba"] });
    },
  });

  const account = waba.data?.data;
  const connected = account?.status === "connected";
  const formOpen = Boolean(account) || showManual;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <>
      <PageHeader
        title="Manage Credentials"
        description="Connect your WhatsApp Business Account so campaigns, chatbots and the inbox can send messages."
        actions={
          account && (
            <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
              {!sync.isPending && <RefreshCw size={16} />}
              Sync with Meta
            </Button>
          )
        }
      />

      {waba.isError ? (
        <ErrorState
          message={
            waba.error instanceof ApiClientError
              ? waba.error.message
              : "Could not load your WhatsApp connection."
          }
          onRetry={() => void waba.refetch()}
        />
      ) : waba.isLoading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {/* ---------------------------------------------------- left column */}
          <div className="min-w-0 space-y-5">
            <ConnectionHero account={account ?? null} connected={connected} />

            {account && (
              <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3" stagger={0.07}>
                <StaggerItem>
                  <MetricCard
                    icon={Gauge}
                    label="Quality rating"
                    value={account.quality_rating ?? "unknown"}
                    badge={
                      <Badge tone={statusTone((account.quality_rating ?? "unknown").toLowerCase())}>
                        {account.quality_rating ?? "unknown"}
                      </Badge>
                    }
                  />
                </StaggerItem>
                <StaggerItem>
                  <MetricCard icon={Activity} label="Messaging limit" value={tierLabel(account.messaging_tier)} />
                </StaggerItem>
                <StaggerItem>
                  <MetricCard icon={RefreshCw} label="Last synced" value={timeAgo(account.last_synced_at)} />
                </StaggerItem>
              </Stagger>
            )}

            {account && (
              <SettingsSection
                icon={Phone}
                title="Account identifiers"
                description="The IDs Meta uses for this number. Handy when contacting support."
                delay={0.1}
              >
                <dl className="divide-y divide-border/70">
                  <InfoRow label="Display number" value={account.display_phone} copy={account.display_phone} />
                  <InfoRow label="Verified name" value={account.verified_name ?? "—"} />
                  <InfoRow label="WABA ID" value={account.waba_id} mono copy={account.waba_id} />
                  <InfoRow
                    label="Phone number ID"
                    value={account.phone_number_id}
                    mono
                    copy={account.phone_number_id}
                  />
                  <InfoRow label="Last synced" value={formatDateTime(account.last_synced_at, "Never")} />
                </dl>
              </SettingsSection>
            )}

            {account && (
              <SettingsSection
                icon={Webhook}
                title="Webhook configuration"
                description="Paste these into Meta for Developers → WhatsApp → Configuration."
                delay={0.15}
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold">Callback URL</p>
                    <SecretValue value={WEBHOOK_URL} label="callback URL" masked={false} copyLabel="Callback URL copied" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold">Verify token</p>
                    <SecretValue value={account.verify_token} label="verify token" copyLabel="Verify token copied" />
                  </div>
                  <p className="flex items-start gap-2 rounded-xl bg-brand-50/60 p-3 text-xs text-brand-800">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                    Subscribe to the <b className="mx-0.5">messages</b> field so inbound chats and delivery
                    receipts reach your inbox.
                  </p>
                </div>
              </SettingsSection>
            )}

            {!account && <SetupSteps />}
          </div>

          {/* --------------------------------------------------- right column */}
          <div className="min-w-0 space-y-5">
            {!account && <EmbeddedSignup />}

            {!account && (
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                aria-expanded={showManual}
                className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-brand-200 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-muted-foreground transition hover:border-brand-300 hover:bg-brand-50/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" />
                  {showManual ? "Hide manual setup" : "Or connect manually with your own tokens"}
                </span>
                <motion.span animate={{ rotate: showManual ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown size={16} />
                </motion.span>
              </button>
            )}

            <AnimatePresence initial={false}>
              {formOpen && (
                <motion.div
                  key="manual"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="overflow-hidden"
                >
                  <SettingsSection
                    icon={KeyRound}
                    title={account ? "Update credentials" : "Connect manually"}
                    description={
                      <>
                        Find these in Meta for Developers under your app&apos;s WhatsApp settings. Tokens are
                        encrypted before they are stored.
                      </>
                    }
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        save.mutate();
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="WhatsApp Business Account ID" required>
                          {({ id }) => (
                            <Input
                              id={id}
                              required
                              inputMode="numeric"
                              autoComplete="off"
                              value={form.wabaId}
                              onChange={set("wabaId")}
                              placeholder="102290129340398"
                            />
                          )}
                        </Field>

                        <Field label="Phone number ID" required>
                          {({ id }) => (
                            <Input
                              id={id}
                              required
                              inputMode="numeric"
                              autoComplete="off"
                              value={form.phoneNumberId}
                              onChange={set("phoneNumberId")}
                              placeholder="106540352242922"
                            />
                          )}
                        </Field>
                      </div>

                      <Field
                        label="Permanent access token"
                        required
                        hint="Use a System User token so it does not expire."
                      >
                        {({ id }) => (
                          <PasswordInput
                            id={id}
                            required
                            minLength={20}
                            autoComplete="off"
                            spellCheck={false}
                            value={form.accessToken}
                            onChange={set("accessToken")}
                            placeholder="EAAG..."
                          />
                        )}
                      </Field>

                      <Field label="App secret" hint="Optional, but required to verify webhook signatures.">
                        {({ id }) => (
                          <PasswordInput
                            id={id}
                            autoComplete="off"
                            spellCheck={false}
                            value={form.appSecret}
                            onChange={set("appSecret")}
                          />
                        )}
                      </Field>

                      <Field
                        label="Webhook verify token"
                        required
                        hint="Any string of 8+ characters. Enter the same value in Meta."
                      >
                        {({ id }) => (
                          <div className="flex gap-2">
                            <PasswordInput
                              id={id}
                              wrapperClassName="min-w-0 flex-1"
                              required
                              minLength={8}
                              autoComplete="off"
                              spellCheck={false}
                              value={form.verifyToken}
                              onChange={set("verifyToken")}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => {
                                setForm((f) => ({ ...f, verifyToken: generateToken() }));
                                toast.success("Verify token generated — copy it into Meta too");
                              }}
                            >
                              <Wand2 size={15} />
                              <span className="hidden sm:inline">Generate</span>
                            </Button>
                          </div>
                        )}
                      </Field>

                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">Callback URL for Meta</p>
                        <SecretValue value={WEBHOOK_URL} label="callback URL" masked={false} copyLabel="Callback URL copied" />
                      </div>

                      <Button type="submit" size="lg" className="w-full" loading={save.isPending}>
                        {!save.isPending && <ShieldCheck size={17} />}
                        {account ? "Update and verify" : "Connect and verify"}
                      </Button>
                    </form>
                  </SettingsSection>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
}

function ConnectionHero({ account, connected }: { account: WabaAccount | null; connected: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
    >
      <Card className="relative overflow-hidden p-0">
        <div aria-hidden className="absolute inset-0 bg-brand-gradient opacity-[0.07]" />
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-pink/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="relative shrink-0">
            {connected && (
              <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-2xl bg-emerald-400/40" />
            )}
            <span
              className={cn(
                "relative grid h-16 w-16 place-items-center rounded-2xl text-white shadow-glow",
                account ? "bg-brand-gradient" : "bg-gradient-to-br from-brand-300 to-brand-500",
              )}
            >
              {account ? <BadgeCheck size={28} /> : <Link2 size={28} />}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {account ? "WhatsApp Business" : "Not connected"}
              </p>
              {account && (
                <Badge tone={statusTone(account.status)}>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      connected ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                  {account.status}
                </Badge>
              )}
            </div>
            <h2 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {account ? account.display_phone : "Connect your WhatsApp number"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {account
                ? account.verified_name
                  ? `Verified as ${account.verified_name}`
                  : "Verified name pending review by Meta"
                : "Use one-click Meta signup or paste your own credentials to start sending."}
            </p>
            {account && !connected && (
              <p className="text-sm font-medium text-rose-600">
                The last check with Meta failed. Update your token below, then sync again.
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
      <Card className="h-full p-4 hover:shadow-lift">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Icon size={14} className="text-primary" />
          {label}
        </div>
        <div className="mt-2 truncate font-display text-lg font-bold capitalize">{badge ?? value}</div>
      </Card>
    </motion.div>
  );
}

function SetupSteps() {
  const steps = [
    {
      title: "Create a Meta app",
      body: "In Meta for Developers, create a Business app and add the WhatsApp product.",
    },
    {
      title: "Add a phone number",
      body: "Register a number that isn't already on the WhatsApp consumer app.",
    },
    {
      title: "Generate a permanent token",
      body: "Create a System User in Business Settings and give it whatsapp_business_messaging.",
    },
    {
      title: "Connect & verify",
      body: "Paste the IDs and token here — we validate them with Meta instantly.",
    },
  ];
  return (
    <SettingsSection
      icon={Sparkles}
      title="How to connect"
      description="Four steps and you're live. One-click signup does most of this for you."
      delay={0.1}
      actions={
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Meta guide <ExternalLink size={13} />
        </a>
      }
    >
      <Stagger className="space-y-1" stagger={0.08}>
        {steps.map((step, i) => (
          <StaggerItem key={step.title} className="flex gap-4 rounded-xl p-2 transition hover:bg-brand-50/50">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-glow">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </SettingsSection>
  );
}
