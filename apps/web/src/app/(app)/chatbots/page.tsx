"use client";

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  BookOpen,
  CheckCircle2,
  History,
  ListChecks,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { relation } from "@/components/data/ledger-table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { ChatbotList } from "./chatbot-list";
import { humanize, timeAgo, useChatbotHistory, useChatbots } from "./_components/data";
import { StatTile } from "./_components/stat-tile";

const SHORTCUTS = [
  {
    href: "/chatbots/library",
    label: "Chatbot Library",
    description: "Prebuilt templates by industry",
    icon: BookOpen,
  },
  { href: "/flows", label: "Manage Flows", description: "Build the conversation steps", icon: Workflow },
  {
    href: "/chatbots/history",
    label: "Chatbot History",
    description: "Every run, step by step",
    icon: History,
  },
  {
    href: "/flows/submissions",
    label: "Flow Submissions",
    description: "Answers customers gave",
    icon: ListChecks,
  },
] as const;

export default function ChatbotsPage() {
  const chatbots = useChatbots();
  const history = useChatbotHistory();

  const bots = chatbots.data?.data;
  const runs = history.data?.data;
  const completed = runs?.filter((r) => r.status === "completed").length ?? 0;
  const completionRate = runs && runs.length ? Math.round((completed / runs.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Chatbots"
        description="Automated replies triggered by keywords, first contact, or outside working hours."
        actions={
          <Link href="/chatbots/library" className={buttonVariants({ variant: "outline" })}>
            <BookOpen size={16} />
            Browse library
          </Link>
        }
      />

      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={Bot} label="Chatbots" value={bots?.length} hint="In this workspace" />
        <StatTile
          icon={Zap}
          label="Live now"
          accent="pink"
          value={bots ? bots.filter((b) => b.is_active).length : undefined}
          hint="Answering customers"
        />
        <StatTile
          icon={Activity}
          label="Recent runs"
          accent="orange"
          value={runs?.length}
          hint="Latest 100 conversations"
        />
        <StatTile
          icon={CheckCircle2}
          label="Completion"
          accent="violet"
          value={runs ? completionRate : undefined}
          format={(n) => `${Math.round(n)}%`}
          hint="Runs that reached the end"
        />
      </Stagger>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FadeIn delay={0.1} className="min-w-0">
          <ChatbotList limit={6} />
        </FadeIn>

        <div className="space-y-6">
          <FadeIn delay={0.15}>
            <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow">
              <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
              <div aria-hidden className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-brand-orange/40 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  <Sparkles size={13} />
                  Quick start
                </span>
                <h2 className="mt-3 font-display text-xl font-bold leading-snug">
                  Launch a chatbot in under a minute
                </h2>
                <p className="mt-1.5 text-sm text-white/85">
                  Pick a template, add your keywords, and switch it on. Fine-tune every reply in the
                  flow editor.
                </p>
                <Link
                  href="/chatbots/library"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Explore templates
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </FadeIn>

          <Stagger delay={0.2} className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map(({ href, label, description, icon: Icon }) => (
              <StaggerItem key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-border/80 bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                      <Icon size={17} />
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>

          <FadeIn delay={0.25}>
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">Recent activity</h2>
                <Link href="/chatbots/history" className="text-xs font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              {history.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : history.isError ? (
                <p className="text-sm text-muted-foreground">Could not load recent runs.</p>
              ) : !runs?.length ? (
                <p className="rounded-xl bg-brand-50/50 p-4 text-center text-sm text-muted-foreground">
                  No runs yet. Activate a chatbot and its conversations will show up here.
                </p>
              ) : (
                <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
                  {runs.slice(0, 5).map((run) => {
                    const bot = relation<{ name: string }>(run.chatbots);
                    const contact = relation<{ wa_id: string; name: string | null }>(run.contacts);
                    return (
                      <li key={run.id} className="relative flex gap-3 pl-6">
                        <span className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-[3px] border-white bg-primary shadow-[0_0_0_1px_rgba(131,58,180,0.25)]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {contact?.name ?? (contact?.wa_id ? `+${contact.wa_id}` : "Unknown contact")}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {bot?.name ?? "Deleted chatbot"} · {timeAgo(run.started_at)}
                          </p>
                        </div>
                        <Badge tone={statusTone(run.status)} className="h-fit shrink-0">
                          {humanize(run.status)}
                        </Badge>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </FadeIn>
        </div>
      </div>
    </>
  );
}
