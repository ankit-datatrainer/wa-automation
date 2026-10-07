"use client";

import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  FileText,
  LifeBuoy,
  PartyPopper,
  Smartphone,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatedNumber, FadeIn, Stagger, StaggerItem, ease, motion } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Stats {
  totalTemplates: number;
}

interface WabaResponse {
  data: { status: string } | null;
}

/** Onboarding checklist, driven by what the account has actually configured. */
export default function SetupSupportPage() {
  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () => api.get<WabaResponse>("/waba"),
  });

  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<Stats>("/dashboard/stats"),
  });

  const contacts = useQuery({
    queryKey: ["contacts", "count"],
    queryFn: () => api.get<{ total: number }>("/contacts", { page: 1, pageSize: 1 }),
  });

  const chatbots = useQuery({
    queryKey: ["chatbots"],
    queryFn: () => api.get<{ data: unknown[] }>("/chatbots"),
  });

  const loading = waba.isLoading || stats.isLoading || contacts.isLoading || chatbots.isLoading;
  const failed = waba.isError && stats.isError && contacts.isError;
  const connected = waba.data?.data?.status === "connected";

  const steps = [
    {
      icon: Smartphone,
      title: "Connect your WhatsApp number",
      description: "Add your WABA ID, phone number ID and permanent token.",
      href: "/manage/credentials",
      done: connected,
    },
    {
      icon: Building2,
      title: "Set your business profile",
      description: "Your about text, address and website, as customers see them.",
      href: "/manage/business-profile",
      done: connected,
    },
    {
      icon: Users,
      title: "Import your contacts",
      description: "Upload a CSV or add contacts manually.",
      href: "/contacts",
      done: (contacts.data?.total ?? 0) > 0,
    },
    {
      icon: FileText,
      title: "Create a message template",
      description: "Templates are needed to start conversations outside the 24-hour window.",
      href: "/campaigns/templates",
      done: (stats.data?.totalTemplates ?? 0) > 0,
    },
    {
      icon: Bot,
      title: "Set up a chatbot",
      description: "Answer common questions automatically, day and night.",
      href: "/chatbots/library",
      done: (chatbots.data?.data.length ?? 0) > 0,
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const progress = (completed / steps.length) * 100;
  const nextStep = steps.find((step) => !step.done);
  const refetchAll = () => {
    void waba.refetch();
    void stats.refetch();
    void contacts.refetch();
    void chatbots.refetch();
  };

  return (
    <>
      <PageHeader
        title="Setup Support"
        description="Everything you need in place before your first campaign goes out."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <FadeIn>
          <Card className="overflow-hidden">
            {/* Progress header */}
            <div className="relative overflow-hidden border-b bg-gradient-to-br from-brand-50 via-white to-white px-6 py-6">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-200/40 blur-3xl"
              />
              <div className="relative flex flex-wrap items-center gap-5">
                <ProgressRing value={loading ? 0 : progress} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-semibold">
                    {loading ? (
                      "Checking your setup…"
                    ) : completed === steps.length ? (
                      <>
                        You&apos;re <span className="text-gradient">all set</span>
                      </>
                    ) : (
                      <>
                        Getting started — {completed} of {steps.length} complete
                      </>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Work through these in order. Each one links straight to where it&apos;s done.
                  </p>
                </div>
              </div>
            </div>

            {failed ? (
              <div className="p-6">
                <ErrorState message="Could not check your setup." onRetry={refetchAll} />
              </div>
            ) : loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] rounded-xl" />
                ))}
              </div>
            ) : (
              <Stagger className="relative p-3 sm:p-4" stagger={0.07}>
                {steps.map((step, i) => {
                  const isNext = step === nextStep;
                  return (
                    <StaggerItem key={step.href}>
                      <div
                        className={cn(
                          "group relative flex flex-wrap items-center gap-4 rounded-xl p-3 transition-colors sm:flex-nowrap sm:p-4",
                          isNext ? "bg-brand-50/70 ring-1 ring-brand-100" : "hover:bg-brand-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-all duration-300",
                            step.done
                              ? "bg-brand-gradient text-white shadow-glow"
                              : isNext
                                ? "bg-white text-primary ring-2 ring-primary/30"
                                : "bg-white text-muted-foreground ring-1 ring-border",
                          )}
                        >
                          {step.done ? (
                            <motion.span
                              initial={{ scale: 0, rotate: -30 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 18,
                                delay: 0.2 + i * 0.07,
                              }}
                            >
                              <Check size={20} strokeWidth={3} />
                            </motion.span>
                          ) : (
                            <step.icon size={19} />
                          )}
                          {isNext && (
                            <span
                              aria-hidden
                              className="absolute inset-0 animate-pulse-ring rounded-xl ring-2 ring-primary/40"
                            />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 font-semibold">
                            <span
                              className={cn(
                                step.done &&
                                  "text-muted-foreground line-through decoration-brand-300",
                              )}
                            >
                              {step.title}
                            </span>
                            {isNext && (
                              <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Up next
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <Link
                          href={step.href}
                          className={cn(
                            buttonVariants({
                              variant: step.done ? "ghost" : isNext ? "primary" : "outline",
                              size: "sm",
                            }),
                            "ml-auto",
                          )}
                        >
                          {step.done ? "Review" : "Set up"}
                          <ArrowRight
                            size={14}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </Link>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </Card>
        </FadeIn>

        {/* Side panel */}
        <div className="space-y-6">
          <FadeIn delay={0.1}>
            {completed === steps.length && !loading ? (
              <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl"
                />
                <PartyPopper size={28} className="relative" />
                <h3 className="relative mt-3 font-display text-lg font-semibold">
                  Ready to launch
                </h3>
                <p className="relative mt-1 text-sm text-white/85">
                  Your account is fully configured. Send your first campaign whenever you&apos;re
                  ready.
                </p>
                <Link
                  href="/campaigns/new"
                  className="relative mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow-soft transition hover:bg-brand-50"
                >
                  Create a campaign
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <Card className="p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Progress
                </p>
                <p className="mt-2 font-display text-4xl font-bold">
                  <AnimatedNumber
                    value={loading ? 0 : progress}
                    format={(n) => `${Math.round(n)}%`}
                  />
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-50">
                  <motion.div
                    className="h-full rounded-full bg-brand-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${loading ? 0 : progress}%` }}
                    transition={{ duration: 0.6, ease }}
                  />
                </div>
                {nextStep && !loading && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Next: <span className="font-semibold text-foreground">{nextStep.title}</span>
                  </p>
                )}
              </Card>
            )}
          </FadeIn>

          <FadeIn delay={0.16}>
            <Card className="p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-primary ring-1 ring-brand-100">
                <LifeBuoy size={20} />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold">Stuck on a step?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Raise a ticket and our team will help you get connected.
              </p>
              <Link
                href="/support/tickets?new=1"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
              >
                Raise a ticket
                <ArrowRight size={14} />
              </Link>
            </Card>
          </FadeIn>
        </div>
      </div>
    </>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="setup-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6a2ff0" />
            <stop offset="55%" stopColor="#833ab4" />
            <stop offset="100%" stopColor="#e1306c" />
          </linearGradient>
        </defs>
        <circle cx="38" cy="38" r={radius} fill="none" stroke="#f3e8ff" strokeWidth="8" />
        <motion.circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="url(#setup-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 0.6, ease }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold">
        {Math.round(value)}%
      </span>
    </div>
  );
}
