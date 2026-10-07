"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, Inbox, Send, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import { AnimatedNumber, Stagger, StaggerItem, motion } from "@/components/motion";
import { Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS: { label: string; hint: string; href: string; icon: LucideIcon }[] = [
  { label: "New campaign", hint: "Broadcast a template", href: "/campaigns/new", icon: Send },
  { label: "Open inbox", hint: "Reply to customers", href: "/inbox", icon: Inbox },
  { label: "Import contacts", hint: "Upload a CSV", href: "/contacts", icon: UserPlus },
  { label: "Create template", hint: "Submit for approval", href: "/campaigns/templates", icon: FilePlus2 },
];

function greetingFor(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingHero({
  name,
  organizationName,
  plan,
  trialDaysLeft,
  messagesUsedToday,
  perDayLimit,
  loading,
  usageLoading = false,
}: {
  name: string | null;
  organizationName: string | null;
  plan: string | null;
  trialDaysLeft: number | null;
  messagesUsedToday: number | null;
  /** `null` = unlimited tier, `undefined` = not loaded. */
  perDayLimit: number | null | undefined;
  loading: boolean;
  /** Whether today's usage (dashboard stats) is still loading. */
  usageLoading?: boolean;
}) {
  // Time-of-day depends on the viewer's clock, so resolve it after mount to
  // keep the server and client render identical.
  const [greeting, setGreeting] = useState("Welcome back");
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setGreeting(greetingFor(now.getHours()));
    setToday(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  const firstName = name?.trim().split(/\s+/)[0] ?? null;
  const used = messagesUsedToday ?? 0;
  const ratio = perDayLimit ? Math.min(1, used / perDayLimit) : 0;
  const circumference = 2 * Math.PI * 42;

  return (
    <section
      aria-label="Welcome"
      className="relative isolate overflow-hidden rounded-3xl bg-brand-gradient bg-[length:200%_200%] p-6 text-white shadow-glow animate-gradient-x sm:p-8"
    >
      {/* Decorative layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_70%)]" />
        <motion.div
          className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#fcaf45]/30 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[#e1306c]/40 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-center gap-2 text-xs font-semibold"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 ring-1 ring-inset ring-white/25 backdrop-blur">
              <Sparkles size={13} />
              {today ?? "Today"}
            </span>
            {plan && (
              <span className="rounded-full bg-white/15 px-3 py-1 capitalize ring-1 ring-inset ring-white/25 backdrop-blur">
                {plan} plan
              </span>
            )}
            {trialDaysLeft !== null && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 ring-1 ring-inset backdrop-blur",
                  trialDaysLeft <= 3 ? "bg-white text-brand-pink ring-white" : "bg-white/15 ring-white/25",
                )}
              >
                {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial` : "Trial ended"}
              </span>
            )}
          </motion.div>

          {loading ? (
            <Skeleton className="mt-4 h-10 w-72 max-w-full bg-none bg-white/20" />
          ) : (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </motion.h2>
          )}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-2 max-w-xl text-sm text-white/85 sm:text-base"
          >
            Here&apos;s what&apos;s happening
            {organizationName ? (
              <>
                {" "}at <span className="font-semibold text-white">{organizationName}</span>
              </>
            ) : null}{" "}
            today. Jump back in with a quick action below.
          </motion.p>

          <Stagger delay={0.15} stagger={0.06} className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <StaggerItem key={action.href}>
                  <Link
                    href={action.href}
                    className="group flex h-full flex-col gap-2 rounded-2xl bg-white/10 p-3 ring-1 ring-inset ring-white/25 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-foreground hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                      <Icon size={17} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-tight">{action.label}</span>
                      <span className="mt-0.5 block text-[11px] text-white/75 transition-colors group-hover:text-muted-foreground">
                        {action.hint}
                      </span>
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>

        {/* Today's usage ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex shrink-0 items-center gap-5 rounded-3xl bg-white/10 p-5 ring-1 ring-inset ring-white/25 backdrop-blur lg:flex-col lg:gap-3 lg:px-8"
        >
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="9" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - (perDayLimit === null ? 0.04 : ratio)) }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-2xl font-bold leading-none">
                  {messagesUsedToday === null ? "—" : <AnimatedNumber value={used} />}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">sent today</p>
              </div>
            </div>
          </div>
          <div className="text-left lg:text-center">
            <p className="text-sm font-semibold">Daily messaging limit</p>
            <p className="text-xs text-white/80">
              {perDayLimit === undefined
                ? usageLoading
                  ? "Loading…"
                  : "Usage unavailable"
                : perDayLimit === null
                  ? "Unlimited tier"
                  : `${Math.max(0, perDayLimit - used).toLocaleString()} of ${perDayLimit.toLocaleString()} left`}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
