"use client";

import { BookOpen, LifeBuoy, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: "Raise a ticket",
    description: "Best for anything account-specific. We track it through to resolution.",
    href: "/support/tickets",
    action: "Open tickets",
  },
  {
    icon: BookOpen,
    title: "Setup checklist",
    description: "Step-by-step guidance for getting your account ready to send.",
    href: "/support/setup",
    action: "View checklist",
  },
  {
    icon: MessageCircle,
    title: "API reference",
    description: "Endpoints, authentication and key management for developers.",
    href: "/settings/api-docs",
    action: "Read the docs",
  },
  {
    icon: Mail,
    title: "Email us",
    description: "For billing questions or anything that doesn't fit a ticket.",
    href: "mailto:support@waautomation.com",
    action: "support@waautomation.com",
  },
];

export default function SettingsSupportPage() {
  return (
    <>
      <PageHeader title="Support" description="How to reach us and where to find answers." />

      <div className="grid gap-4 md:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, title, description, href, action }) => (
          <Card key={href} className="flex flex-col gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon size={20} />
            </span>
            <div className="flex-1 space-y-1">
              <h2 className="font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Link href={href} className="text-sm font-semibold text-primary hover:underline">
              {action} →
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
