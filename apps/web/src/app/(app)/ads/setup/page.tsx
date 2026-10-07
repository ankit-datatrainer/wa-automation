"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Megaphone,
  MousePointerClick,
  Pencil,
  Phone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FadeIn, Stagger, fadeUp, motion } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

interface MeLite {
  organization: { id: string; name: string };
  waba: { displayPhone: string | null; verifiedName: string | null; status: string } | null;
}

const STORAGE_KEY = "wa.ads.adAccountId";
const AD_ACCOUNT_PATTERN = /^act_\d{5,20}$/;

function storageKey(orgId: string | undefined) {
  return orgId ? `${STORAGE_KEY}.${orgId}` : STORAGE_KEY;
}

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Click-to-WhatsApp ads are created in Meta Ads Manager. Direct Ads API access
 * needs its own OAuth grant (ads_management / ads_read), which the backend does
 * not implement yet — so this page stores the ad account on this device for
 * quick links and explains how ad-driven chats flow into the app.
 */
export default function AdsSetupPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<MeLite>("/me") });
  const orgId = me.data?.organization.id;

  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me.isLoading) return;
    const value = readStored(storageKey(orgId));
    setSaved(value);
    setDraft(value ?? "");
    setEditing(!value);
  }, [orgId, me.isLoading]);

  const accountNumber = saved?.replace(/^act_/, "");
  const waba = me.data?.waba;
  const connected = waba?.status === "connected";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = draft.trim().replace(/^(\d)/, "act_$1");
    if (!AD_ACCOUNT_PATTERN.test(value)) {
      setError("Use the format act_ followed by the account number, e.g. act_1234567890.");
      return;
    }
    try {
      window.localStorage.setItem(storageKey(orgId), value);
    } catch {
      // Storage can be blocked; the links below still work for this session.
    }
    setSaved(value);
    setDraft(value);
    setError(null);
    setEditing(false);
    toast.success("Ad account saved");
  };

  const forget = () => {
    try {
      window.localStorage.removeItem(storageKey(orgId));
    } catch {
      // ignore
    }
    setSaved(null);
    setDraft("");
    setEditing(true);
  };

  return (
    <>
      <PageHeader
        title="Ads Manager Setup"
        description="Run Click-to-WhatsApp campaigns on Facebook and Instagram that open a chat with your business."
      />

      <FadeIn>
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
          <div aria-hidden className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand-orange/40 blur-3xl" />
          <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles size={13} />
                Click-to-WhatsApp
              </span>
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                Turn ad clicks into WhatsApp conversations
              </h2>
              <p className="text-sm text-white/85 sm:text-base">
                Customers tap your ad, WhatsApp opens with a prefilled message, and the chat lands in your
                Inbox — where your chatbots can greet them instantly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://adsmanager.facebook.com/adsmanager/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Open Ads Manager
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </section>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad destination number</CardTitle>
              <CardDescription>Click-to-WhatsApp ads must point at your connected number.</CardDescription>
            </CardHeader>
            <CardContent>
              {me.isLoading ? (
                <Skeleton className="h-16" />
              ) : waba?.displayPhone ? (
                <div className="flex items-center gap-3 rounded-2xl border bg-brand-50/40 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                    <Phone size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{waba.verifiedName ?? me.data?.organization.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">{waba.displayPhone}</p>
                  </div>
                  <Badge tone={connected ? "success" : "warning"}>{connected ? "Connected" : waba.status}</Badge>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    No WhatsApp number is connected yet. Connect one before running ads.
                  </p>
                  <Link href="/manage/credentials" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Connect WhatsApp
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your ad account</CardTitle>
              <CardDescription>
                Save your Meta ad account ID for one-click access to its campaigns. It&apos;s stored on this
                device only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {saved && !editing ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-soft">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ad account</p>
                      <p className="truncate font-mono text-sm font-semibold">{saved}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Edit ad account"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil size={15} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants()}
                    >
                      View campaigns
                      <ExternalLink size={15} />
                    </a>
                    <a
                      href={`https://business.facebook.com/settings/ad-accounts/${accountNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Account settings
                      <ExternalLink size={15} />
                    </a>
                    <Button variant="ghost" onClick={forget}>
                      Forget
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <Field
                    label="Meta Ad Account ID"
                    required
                    hint="Find it in Ads Manager → Account Settings. Format: act_1234567890"
                    error={error ?? undefined}
                  >
                    {({ id }) => (
                      <Input
                        id={id}
                        required
                        className="font-mono"
                        placeholder="act_1234567890"
                        aria-invalid={Boolean(error)}
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          setError(null);
                        }}
                      />
                    )}
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={!draft.trim()}>
                      Save ad account
                    </Button>
                    {saved && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDraft(saved);
                          setError(null);
                          setEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  <p className="rounded-xl bg-brand-50/60 p-3 text-xs text-muted-foreground">
                    Syncing ad spend and results into this app requires the Meta Ads API (
                    <code>ads_management</code>, <code>ads_read</code>), which isn&apos;t connected yet. Track
                    results in Ads Manager in the meantime.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.14}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>From ad to conversation in four steps.</CardDescription>
            </CardHeader>
            <CardContent>
              <Stagger delay={0.2} stagger={0.08}>
                <ol className="relative space-y-1 before:absolute before:bottom-6 before:left-[21px] before:top-6 before:w-0.5 before:bg-gradient-to-b before:from-brand-300 before:to-brand-pink/40">
                  <Step
                    n={1}
                    icon={Megaphone}
                    title="Create a Click-to-WhatsApp ad"
                    description="In Ads Manager choose the Engagement or Sales objective and set WhatsApp as the message destination."
                  />
                  <Step
                    n={2}
                    icon={MousePointerClick}
                    title="A customer taps the ad"
                    description="WhatsApp opens a chat with your number, prefilled with the greeting you set on the ad."
                  />
                  <Step
                    n={3}
                    icon={Inbox}
                    title="The chat lands in your Inbox"
                    description="It arrives like any other conversation, so your team can reply right away."
                    href="/inbox"
                    cta="Open Inbox"
                  />
                  <Step
                    n={4}
                    icon={Bot}
                    title="Chatbots respond instantly"
                    description="A Welcome chatbot greets first-time contacts, and keyword bots can match the ad's prefilled text."
                    href="/chatbots"
                    cta="Set up chatbots"
                  />
                </ol>
              </Stagger>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-brand-50/40 p-4 text-sm">
                <BarChart3 size={18} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Tip: put a unique keyword in each ad&apos;s prefilled message (e.g. <code>DIWALI24</code>) and
                  create a keyword chatbot for it — you&apos;ll see every run in{" "}
                  <Link href="/chatbots/history" className="font-semibold text-primary hover:underline">
                    Chatbot History
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  n: number;
  icon: typeof Megaphone;
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <motion.li variants={fadeUp} className="relative flex gap-4 rounded-2xl p-2 transition-colors hover:bg-brand-50/50">
        <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-soft ring-1 ring-brand-200">
          <Icon size={18} />
          <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
            {n}
          </span>
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {href && cta && (
            <Link href={href} className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">
              {cta} →
            </Link>
          )}
        </div>
    </motion.li>
  );
}
