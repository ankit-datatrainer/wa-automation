"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Building2,
  Car,
  Dumbbell,
  GraduationCap,
  Headphones,
  Hotel,
  Landmark,
  MessageCircle,
  MonitorSmartphone,
  Plane,
  Scissors,
  Search,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, AnimatedNumber, FadeIn, motion, Spotlight, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  industry: string;
}

const INDUSTRY_ICONS: [RegExp, LucideIcon][] = [
  [/bank|financ|insur/i, Landmark],
  [/logistic|deliver|courier|shipping/i, Truck],
  [/restaurant|food|cafe/i, UtensilsCrossed],
  [/commerce|retail|shop/i, ShoppingBag],
  [/saas|software|tech/i, MonitorSmartphone],
  [/health|clinic|medic|hospital|pharma/i, Stethoscope],
  [/educat|school|course|coach/i, GraduationCap],
  [/real ?estate|property/i, Building2],
  [/travel|airline|tour/i, Plane],
  [/hotel|hospitality/i, Hotel],
  [/fitness|gym/i, Dumbbell],
  [/auto|car/i, Car],
  [/salon|beauty|spa/i, Scissors],
  [/general|support|service/i, Headphones],
];

const GRADIENTS = [
  "from-brand-600 to-brand-magenta",
  "from-brand-magenta to-brand-pink",
  "from-brand-pink to-brand-orange",
  "from-brand-500 to-brand-pink",
  "from-brand-700 to-brand-500",
  "from-brand-orange to-brand-pink",
];

function industryIcon(industry: string): LucideIcon {
  return INDUSTRY_ICONS.find(([pattern]) => pattern.test(industry))?.[1] ?? Bot;
}

export default function ChatbotLibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const library = useQuery({
    queryKey: ["chatbot-library"],
    queryFn: () => api.get<{ data: LibraryItem[]; total: number }>("/chatbots/library"),
  });

  const clone = useMutation({
    mutationFn: (id: string) =>
      api.post<{ chatbotId: string; flowId: string }>(`/chatbots/library/${id}/clone`),
    onSuccess: (result) => {
      toast.success("Template added to your chatbots", {
        description: "Review the flow, then add keywords and activate it.",
      });
      // The clone created a chatbot and a flow; refresh both lists so they show up
      // immediately instead of after the 30s stale window.
      void queryClient.invalidateQueries({ queryKey: ["chatbots"] });
      void queryClient.invalidateQueries({ queryKey: ["flows"] });
      router.push(`/flows/${result.flowId}`);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not use this template",
      ),
    onSettled: () => setCloningId(null),
  });

  const all = library.data?.data ?? [];

  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of all) counts.set(item.industry, (counts.get(item.industry) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);

  const items = all.filter((item) => {
    if (industry !== "All" && item.industry !== industry) return false;
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.description.toLowerCase().includes(needle) ||
      item.industry.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <PageHeader
        title="Chatbot Library"
        description="Discover prebuilt chatbot templates to accelerate your workflow."
        actions={
          <Link href="/chatbots/mine" className={buttonVariants({ variant: "outline" })}>
            <MessageCircle size={16} />
            Your chatbots
          </Link>
        }
      />

      <FadeIn>
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-brand-100 bg-white p-6 shadow-soft sm:p-8">
          <div aria-hidden className="absolute inset-0 bg-aurora opacity-80" />
          <div aria-hidden className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur">
                <Sparkles size={13} />
                Ready-made conversations
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  Start from a <span className="text-gradient">proven chatbot</span>
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                  Each template clones into your workspace as a draft flow plus a paused chatbot, so you
                  can review every message before it reaches a customer.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <p>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {library.data ? <AnimatedNumber value={library.data.total} /> : "—"}
                  </span>{" "}
                  <span className="text-muted-foreground">templates</span>
                </p>
                <p>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {library.data ? <AnimatedNumber value={industries.length} /> : "—"}
                  </span>{" "}
                  <span className="text-muted-foreground">industries</span>
                </p>
              </div>
              <div className="relative max-w-lg">
                <Search
                  size={18}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search templates"
                  placeholder="Search by name, use case or industry…"
                  className="h-12 rounded-2xl pl-11 text-base shadow-soft"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <ChatMockup />
          </div>
        </section>
      </FadeIn>

      {industries.length > 1 && (
        <div className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Filter by industry" className="flex w-max gap-2">
            {[["All", all.length] as [string, number], ...industries].map(([name, count]) => {
              const active = industry === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setIndustry(name)}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    active
                      ? "border-transparent text-white"
                      : "border-border bg-white text-muted-foreground hover:border-brand-200 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="industry-pill"
                      className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{name}</span>
                  <span
                    className={cn(
                      "relative rounded-full px-1.5 text-[11px]",
                      active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {library.isError ? (
        <ErrorState
          message="Could not load the chatbot library."
          onRetry={() => void library.refetch()}
        />
      ) : library.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bot}
            title="No templates match your search"
            description="Try a different keyword or industry."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setIndustry("All");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => {
              const Icon = industryIcon(item.industry);
              const gradient = GRADIENTS[all.indexOf(item) % GRADIENTS.length];
              const busy = cloningId === item.id && clone.isPending;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.45, ease, delay: Math.min(index, 12) * 0.04 },
                  }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  whileHover={{ y: -4 }}
                >
                  <Spotlight className="flex h-full flex-col rounded-2xl border border-border/80 bg-white p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift">
                    <div className="relative flex items-center justify-between">
                      <span
                        className={cn(
                          "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-glow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105",
                          gradient,
                        )}
                      >
                        <Icon size={22} />
                      </span>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                        {item.industry}
                      </span>
                    </div>
                    <div className="relative mt-5 flex-1 space-y-2">
                      <h3 className="font-display text-lg font-semibold leading-snug">{item.title}</h3>
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <Button
                      className="relative mt-6 w-full justify-between"
                      loading={busy}
                      disabled={clone.isPending}
                      onClick={() => {
                        setCloningId(item.id);
                        clone.mutate(item.id);
                      }}
                    >
                      {busy ? "Setting up…" : "Try this template"}
                      {!busy && (
                        <ArrowRight
                          size={16}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      )}
                    </Button>
                  </Spotlight>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}

/** Decorative WhatsApp-style preview for the hero. */
function ChatMockup() {
  const bubbles = [
    { from: "them", text: "Hi! Where is my order?" },
    { from: "bot", text: "Happy to help 👋 Please share your order ID." },
    { from: "them", text: "#A1042" },
    { from: "bot", text: "It's out for delivery and arrives today 🚚" },
  ] as const;
  return (
    <div aria-hidden className="relative hidden lg:block">
      <div className="absolute -inset-6 rounded-[2rem] bg-brand-gradient opacity-20 blur-2xl" />
      <div className="relative animate-float rounded-3xl border border-white/70 bg-white/90 p-4 shadow-lift backdrop-blur">
        <div className="mb-3 flex items-center gap-2.5 border-b border-border/60 pb-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white">
            <Bot size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold">Support bot</p>
            <p className="text-[11px] font-medium text-emerald-600">online</p>
          </div>
        </div>
        <div className="space-y-2">
          {bubbles.map((bubble, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.35, duration: 0.4, ease }}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                bubble.from === "bot"
                  ? "ml-auto rounded-br-md bg-brand-gradient text-white"
                  : "rounded-bl-md bg-muted text-foreground",
              )}
            >
              {bubble.text}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
