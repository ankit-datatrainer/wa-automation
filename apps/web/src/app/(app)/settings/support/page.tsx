"use client";

import { ArrowUpRight, BookOpen, Clock, Code2, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ease, motion, Spotlight, Stagger, StaggerItem } from "@/components/motion";
import { CopyButton } from "../../manage/_components/settings-kit";

const SUPPORT_EMAIL = "support@waautomation.com";

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: "Raise a ticket",
    description: "Best for anything account-specific. We track it through to resolution.",
    href: "/support/tickets",
    action: "Open tickets",
    featured: true,
  },
  {
    icon: BookOpen,
    title: "Setup checklist",
    description: "Step-by-step guidance for getting your account ready to send.",
    href: "/support/setup",
    action: "View checklist",
  },
  {
    icon: Code2,
    title: "API reference",
    description: "Endpoints, authentication and key management for developers.",
    href: "/settings/api-docs",
    action: "Read the docs",
  },
  {
    icon: Mail,
    title: "Email us",
    description: "For billing questions or anything that doesn't fit a ticket.",
    href: `mailto:${SUPPORT_EMAIL}`,
    action: SUPPORT_EMAIL,
  },
];

export default function SettingsSupportPage() {
  return (
    <>
      <PageHeader title="Support" description="How to reach us and where to find answers." />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden border-0 bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
          <div aria-hidden className="bg-grid absolute inset-0 opacity-15" />
          <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">We&apos;re here to help</h2>
              <p className="text-sm text-white/85">
                Raise a ticket or email the team. Include screenshots and the phone number involved and
                we&apos;ll get you sorted faster.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 font-semibold backdrop-blur">
                <Clock size={16} /> Tickets &amp; email support
              </span>
              <span className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 font-semibold backdrop-blur">
                <ShieldCheck size={16} /> Tracked to resolution
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2" stagger={0.08}>
        {CHANNELS.map(({ icon: Icon, title, description, href, action, featured }) => {
          const external = href.startsWith("mailto:");
          return (
            <StaggerItem key={href}>
              <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className="h-full">
                <Spotlight className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-6 shadow-soft transition-shadow hover:border-brand-200 hover:shadow-lift">
                  <div className="relative flex items-start justify-between gap-3">
                    <span
                      className={
                        featured
                          ? "grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
                          : "grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-primary ring-1 ring-brand-100"
                      }
                    >
                      <Icon size={22} />
                    </span>
                    {external && <CopyButton value={SUPPORT_EMAIL} label="Copy support email" toastLabel="Email copied" />}
                  </div>
                  <div className="relative flex-1 space-y-1">
                    <h2 className="font-display text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  {external ? (
                    <a
                      href={href}
                      className="relative inline-flex items-center gap-1 break-all text-sm font-semibold text-primary hover:underline"
                    >
                      {action} <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="relative inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      {action} <ArrowUpRight size={15} />
                    </Link>
                  )}
                </Spotlight>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </>
  );
}
