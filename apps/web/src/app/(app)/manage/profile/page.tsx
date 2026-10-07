"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  Fingerprint,
  Globe,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatedNumber, AnimatePresence, ease, motion } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency, initials } from "@/lib/utils";
import {
  formatDate,
  InfoRow,
  SettingsSection,
  StickySaveBar,
} from "../_components/settings-kit";

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    city: string | null;
    country: string | null;
    avatarUrl: string | null;
  };
  company: {
    companyName: string | null;
    domain: string | null;
    organizationId: string;
  };
  balance: {
    currentBalance: number;
    totalCredit: number;
    totalDebit: number;
    currency: string;
  };
  pricing: {
    marketing: string;
    utility: string;
    auth: string;
    service: string;
  };
  account: {
    roleId: number;
    role: string;
    countryId: number;
    agentId: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    isDemo: boolean;
    demoExpiresAt: string | null;
  };
}

type Tab = "personal" | "security" | "billing" | "account";

const TABS: { value: Tab; label: string; description: string; icon: typeof User }[] = [
  { value: "personal", label: "Personal information", description: "Your name, number and company.", icon: User },
  { value: "security", label: "Password & security", description: "Change password, sign out devices.", icon: ShieldCheck },
  { value: "billing", label: "Billing & balance", description: "Wallet balance and message pricing.", icon: CreditCard },
  { value: "account", label: "Account details", description: "Role, IDs and important dates.", icon: Fingerprint },
];

const FORM_ID = "profile-form";

export default function UserProfilePage() {
  const [tab, setTab] = useState<Tab>("personal");

  // Deep-link support: /manage/profile#security
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.value === hash)) setTab(hash);
  }, []);

  const changeTab = (value: Tab) => {
    setTab(value);
    window.history.replaceState(null, "", `#${value}`);
  };

  const profile = useQuery({
    queryKey: ["settings", "profile"],
    queryFn: () => api.get<ProfileData>("/settings/profile"),
  });

  const data = profile.data;

  return (
    <>
      <PageHeader title="User Profile" description="Manage your personal details, security and billing." />

      {profile.isError ? (
        <ErrorState
          message={
            profile.error instanceof ApiClientError ? profile.error.message : "Could not load your profile."
          }
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <div className="space-y-6">
          <ProfileHero data={data} loading={profile.isLoading} />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* -------------------------------------------------- tab rail */}
            <nav
              aria-label="Profile sections"
              className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
            >
              {TABS.map((t) => {
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => changeTab(t.value)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex shrink-0 items-center gap-3 rounded-2xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:w-full lg:p-3.5",
                      active ? "text-white" : "text-muted-foreground hover:bg-white hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="profile-tab"
                        className="absolute inset-0 rounded-2xl bg-brand-gradient shadow-glow"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
                        active ? "bg-white/20 text-white" : "bg-white text-primary shadow-soft ring-1 ring-border",
                      )}
                    >
                      <t.icon size={18} />
                    </span>
                    <span className="relative min-w-0 pr-1">
                      <span className="block whitespace-nowrap text-sm font-semibold">{t.label}</span>
                      <span
                        className={cn(
                          "hidden text-xs lg:block",
                          active ? "text-white/80" : "text-muted-foreground",
                        )}
                      >
                        {t.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* ------------------------------------------------- tab panels */}
            <div className="min-w-0">
              {profile.isLoading || !data ? (
                <div className="space-y-4">
                  <Skeleton className="h-56" />
                  <Skeleton className="h-40" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    {tab === "personal" && <PersonalTab data={data} />}
                    {tab === "security" && <SecurityTab email={data.user.email} />}
                    {tab === "billing" && <BillingTab data={data} />}
                    {tab === "account" && <AccountTab data={data} />}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== hero */

function ProfileHero({ data, loading }: { data?: ProfileData; loading: boolean }) {
  const displayName = data?.user.name || data?.user.email?.split("@")[0] || "";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
      <Card className="relative overflow-hidden p-0">
        <div aria-hidden className="h-28 bg-brand-gradient sm:h-32">
          <div className="bg-grid h-full w-full opacity-20" />
        </div>
        <div aria-hidden className="absolute right-10 top-6 h-24 w-24 animate-float rounded-full bg-white/15 blur-2xl" />

        <div className="relative flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7 sm:pb-6">
          <div className="-mt-12 shrink-0 sm:-mt-14">
            {loading ? (
              <Skeleton className="h-24 w-24 rounded-3xl border-4 border-white" />
            ) : data?.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.user.avatarUrl}
                alt=""
                className="h-24 w-24 rounded-3xl border-4 border-white object-cover shadow-lift"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-3xl border-4 border-white bg-gradient-to-br from-brand-600 via-brand-magenta to-brand-pink font-display text-3xl font-bold text-white shadow-lift">
                {initials(displayName, "U")}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            {loading ? (
              <>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-2xl font-bold tracking-tight">{displayName}</h2>
                  {data?.account.role && (
                    <Badge tone="brand" className="capitalize">
                      {data.account.role}
                    </Badge>
                  )}
                  {data?.account.isDemo && <Badge tone="warning">Demo</Badge>}
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Mail size={14} /> <span className="truncate">{data?.user.email}</span>
                  </span>
                  {data?.company.companyName && (
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} /> {data.company.companyName}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>

          {!loading && data && (
            <div className="flex gap-3 sm:text-right">
              <div className="rounded-2xl border bg-brand-50/50 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Wallet</p>
                <p className="font-display text-lg font-bold text-primary">
                  <AnimatedNumber
                    value={data.balance.currentBalance}
                    format={(n) => formatCurrency(n, data.balance.currency)}
                  />
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/* ============================================================== personal */

function PersonalTab({ data }: { data: ProfileData }) {
  const queryClient = useQueryClient();
  const canEditCompany = data.account.role === "owner" || data.account.role === "admin";

  const initial = useMemo(
    () => ({
      name: data.user.name ?? "",
      mobile: data.user.mobile ?? "",
      country: data.user.country ?? "",
      companyName: data.company.companyName ?? "",
    }),
    [data],
  );
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const countryInvalid = form.country.length > 0 && !/^[A-Z]{2}$/.test(form.country);

  const update = useMutation({
    mutationFn: () =>
      api.patch("/settings/profile", {
        ...(form.name.trim() && { name: form.name.trim() }),
        phone: form.mobile.trim(),
        country: form.country.trim().length === 2 ? form.country.trim().toUpperCase() : undefined,
        companyName: canEditCompany ? form.companyName.trim() || undefined : undefined,
      }),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      void queryClient.invalidateQueries({ queryKey: ["settings", "profile"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Failed to update profile"),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <form
      id={FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        if (countryInvalid) return;
        update.mutate();
      }}
      className="space-y-5"
    >
      <SettingsSection icon={User} title="Personal information" description="How you appear to your team.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Full name" required>
            {({ id }) => (
              <Input
                id={id}
                required
                maxLength={120}
                autoComplete="name"
                value={form.name}
                onChange={set("name")}
                placeholder="Your full name"
              />
            )}
          </Field>
          <Field label="Email" hint="Your sign-in email can't be changed here.">
            {({ id }) => <Input id={id} value={data.user.email} disabled readOnly />}
          </Field>
          <Field label="Mobile number">
            {({ id }) => (
              <div className="relative">
                <Phone
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id={id}
                  type="tel"
                  maxLength={20}
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={set("mobile")}
                  placeholder="+91 98765 43210"
                  className="pl-9"
                />
              </div>
            )}
          </Field>
          <Field
            label="Country"
            hint="Two-letter ISO code, e.g. IN, US, AE."
            error={countryInvalid ? "Use a two-letter code like IN" : undefined}
          >
            {({ id }) => (
              <div className="relative">
                <Globe
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id={id}
                  maxLength={2}
                  autoComplete="country"
                  value={form.country}
                  aria-invalid={countryInvalid || undefined}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))
                  }
                  placeholder="IN"
                  className="pl-9 uppercase"
                />
              </div>
            )}
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Building2}
        title="Company"
        description="Shared by everyone in your workspace."
        delay={0.06}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Company name"
            hint={canEditCompany ? undefined : "Only owners and admins can rename the workspace."}
          >
            {({ id }) => (
              <Input
                id={id}
                maxLength={150}
                value={form.companyName}
                onChange={set("companyName")}
                disabled={!canEditCompany}
                placeholder="Your company"
              />
            )}
          </Field>
          <Field label="Workspace domain">
            {({ id }) => <Input id={id} value={data.company.domain ?? "Not set"} disabled readOnly />}
          </Field>
        </div>
      </SettingsSection>

      {!dirty && (
        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        </div>
      )}
      <StickySaveBar
        visible={dirty}
        saving={update.isPending}
        formId={FORM_ID}
        onDiscard={() => setForm(initial)}
      />
    </form>
  );
}

/* ============================================================== security */

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too weak", color: "bg-rose-500" },
    { label: "Weak", color: "bg-rose-400" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-brand-500" },
    { label: "Strong", color: "bg-brand-600" },
    { label: "Excellent", color: "bg-brand-700" },
  ];
  return { score, ...levels[score]! };
}

function SecurityTab({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const strength = passwordStrength(next);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || sameAsCurrent || next.length < 8) return;

    setSaving(true);
    try {
      const supabase = createClient();
      // Re-authenticate first so a borrowed, unlocked session can't change it.
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (authError) throw new Error("Your current password is incorrect");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;

      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password");
    } finally {
      setSaving(false);
    }
  };

  const signOutOthers = async () => {
    setSigningOut(true);
    try {
      const { error } = await createClient().auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out of all other devices");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out other sessions");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-5">
      <SettingsSection icon={KeyRound} title="Change password" description="Use at least 8 characters. Longer is stronger.">
        <form onSubmit={onSubmit} className="max-w-xl space-y-4">
          {/* Hidden username helps password managers pair the new password with this account. */}
          <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

          <Field label="Current password" required>
            {({ id }) => (
              <PasswordInput
                id={id}
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
          </Field>

          <Field
            label="New password"
            required
            error={sameAsCurrent ? "Choose a password different from your current one" : undefined}
          >
            {({ id }) => (
              <div className="space-y-2">
                <PasswordInput
                  id={id}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
                {next && (
                  <div className="space-y-1" aria-live="polite">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.span
                          key={i}
                          className={cn("h-1.5 flex-1 rounded-full", i < strength.score ? strength.color : "bg-muted")}
                          initial={false}
                          animate={{ opacity: i < strength.score ? 1 : 0.6 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: <span className="font-semibold text-foreground">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </Field>

          <Field label="Confirm new password" required error={mismatch ? "Passwords do not match" : undefined}>
            {({ id }) => (
              <PasswordInput
                id={id}
                required
                autoComplete="new-password"
                value={confirm}
                aria-invalid={mismatch || undefined}
                onChange={(e) => setConfirm(e.target.value)}
              />
            )}
          </Field>

          <Button
            type="submit"
            loading={saving}
            disabled={mismatch || sameAsCurrent || next.length < 8 || !current}
          >
            Update password
          </Button>
        </form>
      </SettingsSection>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SettingsSection icon={LogOut} title="Active sessions" description="Signed in somewhere you don't recognise?" delay={0.06}>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign out everywhere except this browser. You&apos;ll stay signed in here.
          </p>
          <Button variant="outline" loading={signingOut} onClick={signOutOthers}>
            {!signingOut && <LogOut size={16} />}
            Sign out other devices
          </Button>
        </SettingsSection>

        <SettingsSection
          icon={ShieldAlert}
          title="Two-factor authentication"
          description="An extra code when you sign in."
          delay={0.1}
          actions={<Badge tone="neutral">Not enabled</Badge>}
        >
          <p className="mb-4 text-sm text-muted-foreground">
            Two-factor sign-in isn&apos;t available for self-service yet. Raise a ticket and our team will help
            you secure the account.
          </p>
          <Link href="/support/tickets" className={buttonVariants({ variant: "secondary" })}>
            <LifeBuoy size={16} />
            Contact support
          </Link>
        </SettingsSection>
      </div>
    </div>
  );
}

/* =============================================================== billing */

function BillingTab({ data }: { data: ProfileData }) {
  const { balance, pricing } = data;
  const fmt = (n: number) => formatCurrency(n, balance.currency);

  const prices = [
    { label: "Marketing", value: pricing.marketing, icon: MessageSquare },
    { label: "Utility", value: pricing.utility, icon: Clock },
    { label: "Authentication", value: pricing.auth, icon: KeyRound },
    { label: "Service", value: pricing.service, icon: LifeBuoy },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
        <Card className="relative overflow-hidden border-0 bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
          <div aria-hidden className="bg-grid absolute inset-0 opacity-15" />
          <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <Wallet size={16} /> Current balance
              </p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                <AnimatedNumber value={balance.currentBalance} format={fmt} />
              </p>
              <p className="mt-1 text-sm text-white/75">Used for WhatsApp conversation charges.</p>
            </div>
            <Link
              href="/analytics/wallet"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-primary shadow-soft transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Wallet history <ArrowUpRight size={16} />
            </Link>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div whileHover={{ y: -3 }}>
          <Card className="flex items-center gap-4 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <ArrowDownLeft size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total credited</p>
              <p className="font-display text-2xl font-bold">
                <AnimatedNumber value={balance.totalCredit} format={fmt} />
              </p>
            </div>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -3 }}>
          <Card className="flex items-center gap-4 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <ArrowUpRight size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total spent</p>
              <p className="font-display text-2xl font-bold">
                <AnimatedNumber value={balance.totalDebit} format={fmt} />
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      <SettingsSection
        icon={MessageSquare}
        title="Message pricing"
        description="Charged per delivered conversation, by category."
        actions={
          <Link href="/analytics/credits" className="text-sm font-semibold text-primary hover:underline">
            Credit history →
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {prices.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease, delay: 0.05 * i }}
              className="rounded-2xl border bg-brand-50/30 p-4"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <p.icon size={13} className="text-primary" />
                {p.label}
              </p>
              <p className="mt-1 font-display text-xl font-bold">{p.value}</p>
              <p className="text-[11px] text-muted-foreground">per message</p>
            </motion.div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

/* =============================================================== account */

function AccountTab({ data }: { data: ProfileData }) {
  const { account, user, company } = data;

  return (
    <div className="space-y-5">
      <SettingsSection icon={Fingerprint} title="Account details" description="System information about your login.">
        <dl className="divide-y divide-border/70">
          <InfoRow label="Role" value={<span className="capitalize">{account.role}</span>} />
          <InfoRow label="User ID" value={user.id} mono copy={user.id} />
          <InfoRow label="Organization ID" value={company.organizationId} mono copy={company.organizationId} />
          <InfoRow label="Agent ID" value={account.agentId ?? "Not assigned"} />
        </dl>
      </SettingsSection>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-brand-100">
            <CalendarDays size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Member since</p>
            <p className="font-semibold">{formatDate(account.createdAt)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-brand-100">
            <Clock size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Last updated</p>
            <p className="font-semibold">{formatDate(account.updatedAt)}</p>
          </div>
        </Card>
      </div>

      {account.isDemo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease }}
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:flex-row sm:items-center"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-soft">
            <ShieldAlert size={20} />
          </span>
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-semibold text-amber-950">Demo account</p>
            <p>
              Some features are limited.
              {account.demoExpiresAt && <> Your demo ends on {formatDate(account.demoExpiresAt)}.</>}
            </p>
          </div>
          <Link href="/support/tickets" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Talk to us
          </Link>
        </motion.div>
      )}
    </div>
  );
}
