"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Building2,
  Check,
  Loader2,
  LogOut,
  Megaphone,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/logo";
import { ease, fadeUp } from "@/components/motion";
import { photos, portraits, unsplash } from "@/lib/marketing-images";
import { cn, initials } from "@/lib/utils";

type Phase = "verifying" | "creating" | "redirecting" | "form";

const STEPS = [
  { label: "Account", icon: ShieldCheck },
  { label: "Workspace", icon: Building2 },
  { label: "Dashboard", icon: Rocket },
];

const PROGRESS_TASKS: { phase: Exclude<Phase, "form">; label: string }[] = [
  { phase: "verifying", label: "Verifying your account" },
  { phase: "creating", label: "Creating your workspace" },
  { phase: "redirecting", label: "Opening your dashboard" },
];

const NEXT_UP = [
  { icon: MessageCircle, title: "Connect your WhatsApp number", text: "Link your Business API account in Settings." },
  { icon: Users, title: "Import your contacts", text: "Upload a CSV or add customers one by one." },
  { icon: Megaphone, title: "Launch your first campaign", text: "Pick an approved template and hit send." },
];

/**
 * Creates the organization for a user who has a session but no membership yet.
 * Runs automatically when signup supplied a business name; otherwise it asks.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("verifying");
  const attempted = useRef(false);

  const bootstrap = async (name: string, phone?: string, country?: string) => {
    setSubmitting(true);
    setPhase((p) => (p === "form" ? p : "creating"));
    try {
      await api.post("/auth/bootstrap", {
        organizationName: name,
        ...(phone && { phone }),
        ...(country && { country }),
      });
      setPhase("redirecting");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your workspace");
      setSubmitting(false);
      setPhase("form");
    }
  };

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

      if (!user) {
        router.replace("/login");
        return;
      }

      const meta = user.user_metadata ?? {};
      const nameFromSignup = meta.organization_name as string | undefined;

      if (nameFromSignup) {
        // Prefill in case the automatic attempt fails and we fall back to the form.
        setOrgName(nameFromSignup);
        await bootstrap(
          nameFromSignup,
          meta.phone as string | undefined,
          meta.country as string | undefined,
        );
        return;
      }
      setPhase("form");
    })();
    // Runs once on mount; the ref guards against StrictMode double-invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = orgName.trim();
  const nameError =
    trimmed.length < 2
      ? "Use at least 2 characters"
      : trimmed.length > 120
        ? "Keep it under 120 characters"
        : undefined;

  const activeStep = phase === "redirecting" ? 2 : 1;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-aurora">
      {/* Decorative orbs */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-brand-pink/15 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Logo href="/" />
        <Link
          href="/logout"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <LogOut size={15} aria-hidden />
          Sign out
        </Link>
      </header>

      {/* Inputs render at 16px below lg so iOS Safari doesn't zoom on focus. */}
      <main className="relative mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 pb-16 pt-2 sm:px-6 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12 lg:px-8 lg:pt-8 xl:gap-16 max-lg:[&_input]:text-base">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center lg:mx-0 lg:max-w-none">
          <OnboardingBanner />

          {/* Stepper */}
          <motion.ol
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="mb-8 flex w-full items-center"
            aria-label="Setup progress"
          >
            {STEPS.map((step, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              return (
                <li key={step.label} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl border text-sm transition-all duration-300",
                        done && "border-transparent bg-brand-gradient text-white shadow-glow",
                        active && "border-primary bg-white text-primary ring-4 ring-primary/10",
                        !done && !active && "border-border bg-white text-muted-foreground",
                      )}
                      aria-current={active ? "step" : undefined}
                    >
                      {done ? <Check size={18} strokeWidth={3} aria-hidden /> : <step.icon size={18} aria-hidden />}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        done || active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className="relative mx-2 mb-5 h-1 flex-1 overflow-hidden rounded-full bg-brand-100">
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
                        initial={{ width: 0 }}
                        animate={{ width: i < activeStep ? "100%" : "0%" }}
                        transition={{ duration: 0.6, ease, delay: 0.2 }}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </motion.ol>

          <AnimatePresence mode="wait">
            {phase === "form" ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease }}
                className="w-full"
              >
                <motion.form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setTouched(true);
                    if (nameError) return;
                    void bootstrap(trimmed);
                  }}
                  noValidate
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
                  className="surface w-full space-y-6 p-6 shadow-lift sm:p-8"
                >
                  <motion.div variants={fadeUp} className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-primary">
                      Step 2 of 3
                    </span>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Name your <span className="text-gradient">workspace</span>
                    </h1>
                    <p className="text-[15px] text-muted-foreground">
                      This is the business your WhatsApp number will be connected to. You can change it later.
                    </p>
                  </motion.div>

                  {/* Live preview of the workspace tile */}
                  <motion.div
                    variants={fadeUp}
                    className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-3"
                  >
                    <motion.span
                      key={initials(trimmed, "WA")}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 20 }}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient font-display text-lg font-bold text-white shadow-glow"
                    >
                      {initials(trimmed, "WA")}
                    </motion.span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{trimmed || "Your business"}</p>
                      <p className="text-xs text-muted-foreground">Owner · 30-day trial workspace</p>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Field label="Business name" required error={touched ? nameError : undefined}>
                      {({ id }) => (
                        <div className="group/icon relative">
                          <Building2
                            size={17}
                            aria-hidden
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/icon:text-primary"
                          />
                          <Input
                            id={id}
                            required
                            minLength={2}
                            maxLength={120}
                            autoFocus
                            autoComplete="organization"
                            placeholder="Acme Retail"
                            className="pl-10"
                            aria-invalid={touched && nameError ? true : undefined}
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            onBlur={() => setTouched(true)}
                          />
                        </div>
                      )}
                    </Field>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Button type="submit" size="lg" className="group w-full" loading={submitting}>
                      {submitting ? "Creating workspace…" : "Create workspace"}
                      {!submitting && (
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
                      )}
                    </Button>
                  </motion.div>

                  <motion.div variants={fadeUp} className="border-t pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What&apos;s next
                    </p>
                    <ul className="space-y-3">
                      {NEXT_UP.map((item) => (
                        <li key={item.title} className="flex items-start gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-primary">
                            <item.icon size={16} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                            <span className="block text-xs text-muted-foreground">{item.text}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </motion.form>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease }}
                className="surface w-full p-6 text-center shadow-lift sm:p-8"
                role="status"
                aria-live="polite"
              >
                <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center">
                  <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-400/30" />
                  <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow">
                    <Rocket size={32} aria-hidden />
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Setting up your <span className="text-gradient">workspace</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">This only takes a moment.</p>

                <ul className="mx-auto mt-6 max-w-xs space-y-3 text-left">
                  {PROGRESS_TASKS.map((task, i) => {
                    const current = PROGRESS_TASKS.findIndex((t) => t.phase === phase);
                    const done = i < current;
                    const active = i === current;
                    return (
                      <motion.li
                        key={task.phase}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease, delay: 0.1 + i * 0.08 }}
                        className="flex items-center gap-3"
                      >
                        <span
                          className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors duration-300",
                            done && "bg-success text-white",
                            active && "bg-brand-50 text-primary",
                            !done && !active && "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <Check size={14} strokeWidth={3} aria-hidden />
                          ) : active ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            done || active ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {task.label}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <OnboardingVisual workspaceName={trimmed} ready={phase === "redirecting"} />
      </main>
    </div>
  );
}

const ONBOARDING_PHOTO = photos.ownersReviewing;

/** Purple → magenta wash that keeps white text readable over the photo. */
function PhotoWash() {
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-brand-gradient opacity-60 mix-blend-multiply" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-brand-900/60 via-brand-900/10 to-brand-900/85" />
    </>
  );
}

/** Phones and tablets: a short photo banner above the stepper. */
function OnboardingBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative isolate mb-8 h-32 w-full overflow-hidden rounded-3xl shadow-lift sm:h-44 lg:hidden"
    >
      <Image
        src={unsplash(ONBOARDING_PHOTO.id, 1000)}
        alt={ONBOARDING_PHOTO.alt}
        fill
        priority
        sizes="(min-width: 1024px) 1px, (min-width: 640px) 576px, 100vw"
        className="-z-10 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10">
        <PhotoWash />
      </div>
      <div className="flex h-full flex-col justify-end p-4 text-white sm:p-6">
        <p className="font-display text-lg font-bold leading-tight sm:text-2xl">
          Your team&apos;s WhatsApp HQ
        </p>
        <p className="mt-1 text-xs text-white/85 sm:text-sm">
          One inbox, campaigns and chatbots — ready in about a minute.
        </p>
      </div>
    </motion.div>
  );
}

/** Desktop: a tall photo with the live workspace tile and a customer quote. */
function OnboardingVisual({ workspaceName, ready }: { workspaceName: string; ready: boolean }) {
  const tile = initials(workspaceName, "WA");
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.15 }}
      className="sticky top-8 hidden lg:block"
      aria-label="About your new workspace"
    >
      <div className="relative isolate flex h-[min(42rem,calc(100vh-7rem))] min-h-[30rem] flex-col justify-between overflow-hidden rounded-[2rem] p-7 text-white shadow-lift xl:p-8">
        <Image
          src={unsplash(ONBOARDING_PHOTO.id, 1400)}
          alt={ONBOARDING_PHOTO.alt}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 1px"
          className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10">
          <PhotoWash />
        </div>

        {/* Live workspace tile */}
        <div className="flex items-center gap-3 self-start rounded-2xl border border-white/40 bg-white/85 py-2.5 pl-2.5 pr-4 text-foreground shadow-[0_18px_40px_-14px_rgba(30,6,60,0.45)] backdrop-blur-xl">
          <motion.span
            key={tile}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient font-display font-bold text-white"
          >
            {tile}
          </motion.span>
          <span className="min-w-0">
            <span className="block max-w-[14rem] truncate text-sm font-semibold">
              {workspaceName || "Your business"}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {ready ? (
                <>
                  <Check size={12} strokeWidth={3} className="text-success" aria-hidden />
                  Workspace ready
                </>
              ) : (
                "Setting up your workspace"
              )}
            </span>
          </span>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col items-start gap-2">
            {[
              { icon: MessageCircle, label: "WhatsApp number connected", delay: 0.5 },
              { icon: Megaphone, label: "First campaign scheduled", delay: 0.65 },
            ].map((chip) => (
              <motion.span
                key={chip.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease, delay: chip.delay }}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-md"
              >
                <chip.icon size={14} aria-hidden />
                {chip.label}
              </motion.span>
            ))}
          </div>

          <figure className="rounded-2xl border border-white/20 bg-brand-900/35 p-5 backdrop-blur-md">
            <blockquote className="text-[15px] font-medium leading-snug">
              &ldquo;Setup took two minutes. By lunch the whole team was answering customers from one
              shared inbox.&rdquo;
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/70">
                <Image
                  src={unsplash(portraits.womanGlasses.id, 160)}
                  alt={portraits.womanGlasses.alt}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
              <span className="text-xs text-white/80">
                <span className="block text-sm font-semibold text-white">Neha Kapoor</span>
                Co-founder, Chai &amp; Co.
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </motion.aside>
  );
}
