"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useScroll, useSpring, useTransform } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarCheck,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Lock,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  Quote,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Upload,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AnimatePresence,
  AnimatedNumber,
  FadeIn,
  SegmentedTabs,
  Spotlight,
  Stagger,
  StaggerItem,
  Tilt,
  ease,
  motion,
} from "@/components/motion";
import { cn } from "@/lib/utils";
import { photos, portraits, unsplash, type Photo } from "@/lib/marketing-images";

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "customers", label: "Customers" },
  { id: "faq", label: "FAQ" },
] as const;

const SUPPORT_EMAIL = "support@waautomation.com";

const LOGOS = [
  "Nova Store",
  "Kirana+",
  "UrbanNest",
  "Bloom & Co",
  "FitFuel",
  "Zestly",
  "Trailhead",
  "Lumen Labs",
  "Peakwear",
  "Spice Route",
];

const STEPS = [
  {
    icon: QrCode,
    title: "Connect your number",
    body: "Link your WhatsApp Business number through Meta's official Cloud API in a few clicks. No phone needs to stay online.",
  },
  {
    icon: Upload,
    title: "Import & organise",
    body: "Bring in contacts from CSV, tag and group them, and get message templates approved right from the dashboard.",
  },
  {
    icon: Send,
    title: "Launch & automate",
    body: "Send targeted broadcasts, switch on chatbots and flows, and let your team handle every reply from one inbox.",
  },
];

const STATS = [
  { value: 2000, label: "Businesses growing on WhatsApp", format: (n: number) => `${Math.round(n).toLocaleString()}+` },
  { value: 48, label: "Messages delivered every month", format: (n: number) => `${Math.round(n)}M+` },
  { value: 98.6, label: "Average delivery rate", format: (n: number) => `${n.toFixed(1)}%` },
  { value: 3.4, label: "Average return on campaign spend", format: (n: number) => `${n.toFixed(1)}x` },
];

const TESTIMONIALS = [
  {
    quote:
      "We moved our festive sale from SMS to WhatsApp broadcasts and the read rate jumped overnight. The tag-based targeting means every customer gets an offer that actually fits.",
    name: "Priya Raman",
    role: "Growth Lead, Bloom & Co",
    photo: portraits.womanRed,
  },
  {
    quote:
      "Five agents, one number, zero confusion. Assignments, notes and canned replies made our support queue feel calm for the first time.",
    name: "Daniel Okafor",
    role: "Head of Support, Peakwear",
    photo: portraits.manVneck,
  },
  {
    quote:
      "The chatbot answers order-status questions all night and hands off to a human the moment it's needed. It paid for itself in the first month.",
    name: "Meera Shah",
    role: "Founder, Spice Route",
    photo: portraits.womanScarf,
  },
];

const USE_CASES: {
  photo: Photo;
  icon: React.ElementType;
  label: string;
  title: string;
  body: string;
  stat: string;
  statLabel: string;
}[] = [
  {
    photo: photos.foodVendor,
    icon: ShoppingBag,
    label: "Restaurants & cloud kitchens",
    title: "Orders and delivery updates, right in the chat",
    body: "Share the menu, confirm orders and send live delivery updates without a single phone call.",
    stat: "3.1x",
    statLabel: "more repeat orders",
  },
  {
    photo: photos.boutiqueOwner,
    icon: Megaphone,
    label: "Fashion & D2C brands",
    title: "New-drop alerts that actually sell out",
    body: "Tag shoppers by taste and send the right collection to the right customer, the moment it lands.",
    stat: "86%",
    statLabel: "average read rate",
  },
  {
    photo: photos.shopOwnerPhone,
    icon: MessageCircle,
    label: "Cafés & local stores",
    title: "Bookings, reminders and loyalty offers",
    body: "Answer questions from one shared number and bring regulars back with timely, personal offers.",
    stat: "2.4 min",
    statLabel: "average first reply",
  },
];

/** Faces for the hero social-proof avatar stack. */
const HERO_AVATARS = [portraits.womanGlasses, portraits.manHenley, portraits.womanBlonde, portraits.manVneck];

type Billing = "monthly" | "yearly";

const PLANS: {
  name: string;
  tagline: string;
  price: Record<Billing, number> | null;
  features: string[];
  cta: { label: string; href?: string };
  featured?: boolean;
}[] = [
  {
    name: "Starter",
    tagline: "For small teams sending their first campaigns.",
    price: { monthly: 1499, yearly: 1199 },
    features: [
      "1 WhatsApp number",
      "Up to 3 team members",
      "Shared team inbox",
      "Broadcasts & scheduled campaigns",
      "Template manager",
      "Email support",
    ],
    cta: { label: "Start free", href: "/signup" },
  },
  {
    name: "Growth",
    tagline: "For brands automating sales and support at scale.",
    price: { monthly: 3999, yearly: 3199 },
    features: [
      "Everything in Starter",
      "Up to 15 team members",
      "Chatbots & WhatsApp Flows",
      "Catalogue & order management",
      "Advanced analytics & exports",
      "Priority chat support",
    ],
    cta: { label: "Start free", href: "/signup" },
    featured: true,
  },
  {
    name: "Enterprise",
    tagline: "For multi-brand teams with custom requirements.",
    price: null,
    features: [
      "Everything in Growth",
      "Unlimited numbers & members",
      "Roles, permissions & audit logs",
      "API access & webhooks",
      "Dedicated success manager",
      "SSO & custom SLAs",
    ],
    cta: { label: "Talk to sales" },
  },
];

const FAQS = [
  {
    q: "Do I need the official WhatsApp Business API?",
    a: "Yes — and we make it easy. WA Automation runs on Meta's official Cloud API, so you connect your number through Meta's embedded signup in minutes, with no risk of bans from unofficial workarounds.",
  },
  {
    q: "Can multiple team members share one WhatsApp number?",
    a: "Absolutely. Every conversation lands in a shared inbox where you can assign chats, leave internal notes, use canned replies and control what each member can see with roles and permissions.",
  },
  {
    q: "How are WhatsApp conversation charges billed?",
    a: "Meta charges per conversation depending on category and country. Those charges are passed through at cost from your wallet, separately from your WA Automation plan — you can track them in the credits analytics.",
  },
  {
    q: "Can I send campaigns to a specific segment of customers?",
    a: "Yes. Target by tags, contact groups, an uploaded CSV or hand-picked contacts, then send immediately or schedule for later. Delivery, read and reply stats update live.",
  },
  {
    q: "Do I need to know how to code to build a chatbot?",
    a: "No. Pick a ready-made bot from the library or build your own with keyword triggers, quick replies and WhatsApp Flows — and hand off to a human agent whenever it's needed.",
  },
  {
    q: "Is there a free trial?",
    a: "You can create an account and explore the full dashboard for free. Pick a plan when you're ready to go live — there's no credit card required to get started.",
  },
];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top, behavior: "smooth" });
  window.history.replaceState(null, "", `#${id}`);
}

function SectionLink({
  id,
  className,
  children,
  onNavigate,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.();
        scrollToSection(id);
      }}
    >
      {children}
    </a>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 shadow-soft backdrop-blur",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <FadeIn inView className={cn("mx-auto max-w-2xl space-y-4 text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-balance text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
      )}
    </FadeIn>
  );
}

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Rounded photo that reveals with a gentle scale-in when scrolled into view and
 * zooms slightly when any ancestor `group` is hovered. Lazy-loaded by next/image.
 */
function PhotoFrame({
  photo,
  width = 800,
  sizes,
  className,
  imgClassName,
  overlay = "soft",
  children,
}: {
  photo: Photo;
  width?: number;
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** Brand-tinted gradient laid over the photo so it sits inside the purple palette. */
  overlay?: "none" | "soft" | "strong";
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-brand-100", className)}>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.08 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.9, ease }}
      >
        <Image
          src={unsplash(photo.id, width)}
          alt={photo.alt}
          fill
          sizes={sizes}
          className={cn(
            "object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]",
            imgClassName,
          )}
        />
      </motion.div>
      {overlay !== "none" && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0",
            overlay === "soft"
              ? "bg-gradient-to-t from-brand-900/45 via-brand-900/5 to-brand-600/10"
              : "bg-gradient-to-t from-brand-900/90 via-brand-900/35 to-brand-700/10",
          )}
        />
      )}
      {children}
    </div>
  );
}

/** Small circular portrait used for avatars. */
function Avatar({ photo, size = 40, className }: { photo: Photo; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-full bg-brand-100", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={unsplash(photo.id, 200)}
        alt={photo.alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = useCallback(() => setDemoOpen(true), []);
  const closeDemo = useCallback(() => setDemoOpen(false), []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <ScrollProgress />
      <Navbar onBookDemo={openDemo} />
      <main>
        <Hero onBookDemo={openDemo} />
        <LogoMarquee />
        <Features />
        <UseCases />
        <HowItWorks />
        <StatsBand />
        <Testimonials />
        <Pricing onBookDemo={openDemo} />
        <Faq />
        <CtaBand onBookDemo={openDemo} />
      </main>
      <Footer onBookDemo={openDemo} />
      <ContactWidget onBookDemo={openDemo} />
      <DemoModal open={demoOpen} onClose={closeDemo} />
    </div>
  );
}

/* --------------------------------- Chrome --------------------------------- */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-brand-gradient"
    />
  );
}

function Navbar({ onBookDemo }: { onBookDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the nav link for the section currently in view.
  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled || mobileOpen
          ? "border-b border-border/70 bg-white/75 shadow-[0_8px_30px_-18px_rgba(76,29,149,0.25)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo href="/" />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <SectionLink
              key={link.id}
              id={link.id}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active === link.id ? "text-brand-700" : "text-foreground/70 hover:text-foreground",
              )}
            >
              {active === link.id && (
                <motion.span
                  layoutId="home-nav-active"
                  className="absolute inset-0 rounded-full bg-brand-50 ring-1 ring-brand-100"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </SectionLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
          >
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
            Get started
            <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="home-mobile-menu"
            className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-foreground shadow-soft transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileOpen ? "x" : "menu"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="home-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden border-t border-border/70 bg-white lg:hidden"
          >
            <Stagger stagger={0.04} className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
              {NAV_LINKS.map((link) => (
                <StaggerItem key={link.id}>
                  <SectionLink
                    id={link.id}
                    onNavigate={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-brand-50"
                  >
                    {link.label}
                    <ArrowRight size={16} className="text-brand-500" />
                  </SectionLink>
                </StaggerItem>
              ))}
              <StaggerItem className="grid grid-cols-2 gap-2 pt-3">
                <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                  Sign in
                </Link>
                <Link href="/signup" className={buttonVariants()}>
                  Get started
                </Link>
              </StaggerItem>
              <StaggerItem>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onBookDemo();
                  }}
                  className="mt-1 w-full rounded-xl px-3 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Book a live demo
                </button>
              </StaggerItem>
            </Stagger>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------------------------------- Hero ---------------------------------- */

function Hero({ onBookDemo }: { onBookDemo: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <section ref={ref} className="relative -mt-[72px] overflow-x-clip pt-[72px]">
      <HeroBackground />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-10 sm:gap-16 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.02fr] lg:gap-10 lg:pb-28 lg:pt-16 xl:gap-16">
        <motion.div style={{ y: copyY }} className="relative z-10 mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-none lg:text-left">
          <Stagger stagger={0.08} className="space-y-6 sm:space-y-7">
            <StaggerItem>
              <SectionLink
                id="features"
                className="group inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-brand-200/80 bg-white/80 py-1 pl-1 pr-3 text-xs font-semibold text-foreground/80 shadow-soft backdrop-blur transition hover:border-brand-300"
              >
                <span className="shrink-0 rounded-full bg-brand-gradient px-2.5 py-0.5 text-[11px] text-white">New</span>
                <span className="truncate">No-code chatbots & WhatsApp Flows</span>
                <ArrowRight size={13} className="shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5" />
              </SectionLink>
            </StaggerItem>

            <StaggerItem>
              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl">
                Turn WhatsApp into your{" "}
                <span className="relative whitespace-nowrap">
                  <span className="text-gradient">best sales</span>
                  <motion.svg
                    aria-hidden
                    viewBox="0 0 300 16"
                    preserveAspectRatio="none"
                    className="absolute -bottom-2 left-0 h-3 w-full"
                  >
                    <motion.path
                      d="M3 12C60 4 140 2 297 8"
                      fill="none"
                      stroke="url(#hero-underline)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.9, delay: 0.6, ease }}
                    />
                    <defs>
                      <linearGradient id="hero-underline" x1="0" x2="1">
                        <stop offset="0" stopColor="#833AB4" />
                        <stop offset="0.6" stopColor="#C13584" />
                        <stop offset="1" stopColor="#F77737" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>{" "}
                channel.
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                Broadcast campaigns, a shared team inbox, chatbots, catalogue orders and live analytics — all on
                Meta&apos;s official WhatsApp Cloud API, in one beautifully simple workspace.
              </p>
            </StaggerItem>

            <StaggerItem className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-2xl px-7 sm:w-auto")}>
                Get started free
                <ArrowRight size={18} />
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={onBookDemo}
                className="w-full rounded-2xl px-7 sm:w-auto"
              >
                <CalendarCheck size={18} className="text-brand-600" />
                Book a demo
              </Button>
            </StaggerItem>

            <StaggerItem className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <div className="flex -space-x-2.5">
                {HERO_AVATARS.map((p) => (
                  <Avatar key={p.id} photo={p} size={36} className="ring-[3px] ring-white" />
                ))}
                <span className="relative grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-[10px] font-bold text-white ring-[3px] ring-white">
                  2k+
                </span>
              </div>
              <div className="text-center text-sm sm:text-left">
                <div className="flex justify-center gap-0.5 sm:justify-start" role="img" aria-label="Rated 4.9 out of 5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} className="fill-brand-yellow text-brand-yellow" />
                  ))}
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  <span className="font-semibold text-foreground">4.9/5</span> from 2,000+ growing businesses
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                {["Official Meta Cloud API", "No credit card required", "Live in 5 minutes"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-50 text-brand-600">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          </Stagger>
        </motion.div>

        <motion.div style={{ y: mockupY }} className="relative z-10">
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <div className="absolute inset-0 bg-aurora" />
      <div
        className="absolute inset-0 bg-grid opacity-60"
        style={{
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      <motion.div
        className="absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full bg-brand-300/40 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10rem] top-[-6rem] h-[30rem] w-[30rem] rounded-full bg-brand-pink/20 blur-3xl"
        animate={{ x: [0, -50, 20, 0], y: [0, 60, 10, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-8rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-brand-orange/15 blur-3xl"
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

/* ------------------------------ Hero mockup ------------------------------- */

type ChatMsg = {
  id: number;
  from: "customer" | "business";
  text: string;
  product?: boolean;
};

const CHAT_SCRIPT: Omit<ChatMsg, "id">[] = [
  { from: "customer", text: "Hi! Is the Aurora hoodie back in stock? 👀" },
  { from: "business", text: "It's back in every size 🎉 Here it is:" },
  { from: "business", text: "Aurora Hoodie", product: true },
  { from: "customer", text: "Size M please!" },
  { from: "business", text: "Done ✅ Order #1042 is confirmed. We'll share tracking soon." },
];

const QUICK_REPLIES: { label: string; reply: string }[] = [
  { label: "Track order", reply: "Order #1042 is packed and ships today 🚚 Expected delivery: Friday." },
  { label: "Talk to an agent", reply: "Connecting you with Riya from our team — she'll reply in a moment 💬" },
  { label: "Browse catalogue", reply: "Here's our latest drop — 24 new styles, free shipping over ₹999 🛍️" },
];

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:max-w-[600px]">
      {/* Soft brand glow behind the composition */}
      <div aria-hidden className="absolute -inset-3 rounded-[3rem] bg-brand-gradient opacity-25 blur-3xl sm:-inset-8" />

      {/* Hero photograph */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease, delay: 0.15 }}
        className="relative sm:ml-auto sm:w-[86%]"
      >
        <div className="rounded-[2.2rem] bg-brand-gradient p-[3px] shadow-glow">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-brand-100 sm:aspect-[4/5]">
            <Image
              src={unsplash(photos.heroFounder.id, 1400)}
              alt={photos.heroFounder.alt}
              fill
              priority
              sizes="(min-width: 1280px) 520px, (min-width: 640px) 480px, 100vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-brand-900/50 via-brand-900/0 to-brand-700/10"
            />
            <div aria-hidden className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/25" />
          </div>
        </div>
      </motion.div>

      {/* Interactive WhatsApp chat: in flow on phones, floating over the photo from `sm` up */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.45 }}
        className="relative z-20 mx-auto -mt-12 w-[94%] max-w-[360px] sm:absolute sm:-bottom-8 sm:left-0 sm:mx-0 sm:mt-0 sm:w-[300px] sm:max-w-none lg:w-[280px] xl:w-[300px]"
      >
        <Tilt max={5}>
          <HeroChatCard />
        </Tilt>
      </motion.div>

      {/* Floating stat chips — only one on phones so nothing collides */}
      <FloatingChip className="left-3 top-3 sm:left-0 sm:top-12" delay={0.7} floatDelay="0s">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white">
          <TrendingUp size={15} />
        </span>
        <span>
          <span className="block text-sm font-bold text-foreground">+38%</span>
          <span className="block text-[11px] text-muted-foreground">reply rate</span>
        </span>
      </FloatingChip>
      <FloatingChip className="hidden sm:-top-4 sm:right-4 sm:block" delay={0.9} floatDelay="1.2s">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Bot size={16} />
        </span>
        <span>
          <span className="block text-sm font-bold text-foreground">82%</span>
          <span className="block text-[11px] text-muted-foreground">chats auto-resolved</span>
        </span>
      </FloatingChip>
      <FloatingChip className="hidden sm:-bottom-5 sm:right-6 sm:block" delay={1.1} floatDelay="2.4s">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <ShoppingBag size={15} />
        </span>
        <span>
          <span className="block text-sm font-bold text-foreground">New order · ₹2,499</span>
          <span className="block text-[11px] text-muted-foreground">via WhatsApp catalogue</span>
        </span>
      </FloatingChip>
      {/* Campaign card: hidden at lg (narrow column) and shown again from xl */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease, delay: 1 }}
        className="absolute right-[-0.5rem] top-[38%] z-10 hidden w-[200px] sm:block lg:hidden xl:right-[-1.5rem] xl:block"
      >
        <HeroCampaignCard />
      </motion.div>
    </div>
  );
}

function HeroChatCard() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const nextId = useRef(0);
  const replyTimer = useRef<number | null>(null);

  const push = useCallback((msg: Omit<ChatMsg, "id">) => {
    nextId.current += 1;
    const id = nextId.current;
    setMessages((prev) => [...prev, { ...msg, id }].slice(-5));
  }, []);

  // Auto-play the scripted conversation on a loop until the visitor interacts.
  useEffect(() => {
    if (userTookOver) return;
    let index = 0;
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    const step = () => {
      if (cancelled) return;
      if (index >= CHAT_SCRIPT.length) {
        later(() => {
          setMessages([]);
          index = 0;
          later(step, 500);
        }, 4200);
        return;
      }
      const msg = CHAT_SCRIPT[index];
      index += 1;
      if (msg.from === "business") {
        setTyping(true);
        later(() => {
          setTyping(false);
          push(msg);
          later(step, 1300);
        }, 950);
      } else {
        push(msg);
        later(step, 1200);
      }
    };
    later(step, 700);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      setTyping(false);
    };
  }, [userTookOver, push]);

  useEffect(
    () => () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current);
    },
    [],
  );

  const sendQuickReply = (qr: (typeof QUICK_REPLIES)[number]) => {
    setUserTookOver(true);
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    push({ from: "customer", text: qr.label });
    setTyping(true);
    replyTimer.current = window.setTimeout(() => {
      setTyping(false);
      push({ from: "business", text: qr.reply });
    }, 900);
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/70 bg-white/90 shadow-lift backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="relative shrink-0">
          <Avatar photo={photos.happyCustomer} size={38} className="ring-2 ring-brand-100" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Ananya Kapoor</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {typing ? <span className="text-brand-600">Nova Store is replying…</span> : "Customer · via WhatsApp"}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 min-[380px]:inline-flex lg:hidden xl:inline-flex">
          <ShieldCheck size={11} /> Official API
        </span>
      </div>

      <div
        className="relative flex h-[230px] flex-col justify-end gap-2 overflow-hidden bg-brand-50/60 px-3 py-3 lg:h-[210px] xl:h-[230px]"
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.3, ease }}
              className={cn("flex", m.from === "business" ? "justify-end" : "justify-start")}
            >
              {m.product ? (
                <div className="w-[170px] overflow-hidden rounded-2xl rounded-tr-md border border-brand-100 bg-white shadow-soft">
                  <div className="relative h-16 bg-ig-gradient">
                    <ShoppingBag className="absolute bottom-2 right-2 h-5 w-5 text-white/90" />
                  </div>
                  <div className="space-y-1 p-2.5">
                    <p className="text-xs font-semibold">Aurora Hoodie</p>
                    <p className="text-[11px] text-muted-foreground">₹2,499 · Sizes S–XL</p>
                    <span className="mt-1 block rounded-lg bg-brand-50 py-1 text-center text-[11px] font-semibold text-brand-700">
                      View in catalogue
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug shadow-[0_1px_1px_rgba(40,16,70,0.06)]",
                    m.from === "business"
                      ? "rounded-tr-md border border-brand-100 bg-brand-100/70 text-brand-900"
                      : "rounded-tl-md border bg-white text-foreground",
                  )}
                >
                  {m.text}
                  {m.from === "business" && (
                    <span className="ml-1.5 inline-flex translate-y-0.5 items-center text-brand-600">
                      <CheckCheck size={13} />
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
          {typing && (
            <motion.div
              key="typing"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-end"
            >
              <div className="flex gap-1 rounded-2xl rounded-tr-md border border-brand-100 bg-brand-100/70 px-3 py-2.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-brand-500"
                    animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t bg-white p-2.5">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Try a quick reply
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr.label}
              type="button"
              onClick={() => sendQuickReply(qr)}
              className="min-h-10 rounded-full border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-8 sm:px-2.5 sm:text-[11px]"
            >
              {qr.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingChip({
  className,
  delay,
  floatDelay,
  children,
}: {
  className?: string;
  delay: number;
  floatDelay: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      className={cn("absolute z-30", className)}
    >
      <div
        className="glass flex animate-float items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-lift"
        style={{ animationDelay: floatDelay }}
      >
        {children}
      </div>
    </motion.div>
  );
}

const CAMPAIGN_BARS = [38, 52, 46, 70, 64, 88, 76];

function HeroCampaignCard() {
  return (
    <div className="glass animate-float rounded-[22px] p-4 shadow-lift" style={{ animationDelay: "0.6s" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-muted-foreground">Campaign</p>
          <p className="truncate text-sm font-semibold">Festive Drop</p>
        </div>
        <Badge tone="success" className="shrink-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </Badge>
      </div>

      <div className="mt-3 flex h-14 items-end gap-1.5">
        {CAMPAIGN_BARS.map((h, i) => (
          <motion.span
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-pink/80"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.6, ease, delay: 1.1 + i * 0.06 }}
          />
        ))}
      </div>

      <div className="mt-3 space-y-2.5">
        <ProgressRow label="Delivered" value={98.2} delay={1.2} />
        <ProgressRow label="Read" value={86.4} delay={1.35} />
      </div>
    </div>
  );
}

function ProgressRow({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted-foreground">{label}</span>
        <AnimatedNumber value={value} format={(n) => `${n.toFixed(1)}%`} className="font-semibold text-foreground" />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-brand-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease, delay }}
        />
      </div>
    </div>
  );
}

/* ------------------------------- Logo marquee ------------------------------ */

function LogoMarquee() {
  return (
    <section aria-label="Trusted by" className="relative py-10 sm:py-14">
      <FadeIn inView className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Trusted by <span className="font-semibold text-foreground">2,000+</span> fast-growing brands across retail,
          D2C, education and services
        </p>
        <div className="mask-fade-x group mt-8 overflow-hidden">
          <div className="flex w-max animate-marquee gap-14 group-hover:[animation-play-state:paused]">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <div
                key={`${name}-${i}`}
                aria-hidden={i >= LOGOS.length}
                className="flex shrink-0 items-center gap-2.5 text-foreground/45 transition-colors hover:text-foreground"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-foreground/10 bg-white text-xs font-bold">
                  {name.charAt(0)}
                </span>
                <span className="font-display text-lg font-semibold tracking-tight">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* --------------------------------- Features -------------------------------- */

function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  className,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <StaggerItem className={className}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="h-full"
      >
        <Spotlight className="flex h-full flex-col rounded-3xl border border-border/80 bg-white p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift sm:p-7">
          <div className="relative flex items-start justify-between gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Icon size={20} />
            </span>
            <Link
              href={href}
              aria-label={`Open ${title}`}
              className="grid h-10 w-10 place-items-center rounded-full border bg-white text-muted-foreground transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <h3 className="relative mt-5 text-xl font-bold text-foreground">{title}</h3>
          <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {children && <div className="relative mt-6 flex flex-1 flex-col">{children}</div>}
        </Spotlight>
      </motion.div>
    </StaggerItem>
  );
}

function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Everything in one place"
          title={
            <>
              One workspace for every <span className="text-gradient">WhatsApp conversation</span>
            </>
          }
          description="From the first broadcast to the final order confirmation — WA Automation gives marketing, sales and support the same live view of every customer."
        />

        <Stagger inView stagger={0.08} className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 md:grid-cols-2 lg:grid-cols-6">
          <FeatureCard
            icon={Inbox}
            title="Shared team inbox"
            description="Every chat in one place. Assign conversations, leave private notes, reply with canned messages and never miss the 24-hour window."
            href="/inbox"
            className="md:col-span-2 lg:col-span-4"
          >
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-[0.85fr_1.15fr]">
              <PhotoFrame
                photo={photos.supportTeam}
                sizes="(min-width: 1024px) 340px, (min-width: 640px) 40vw, 100vw"
                className="aspect-[16/10] rounded-2xl sm:aspect-auto sm:h-full sm:min-h-[220px]"
              >
                <span className="glass absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-soft">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />5 agents online
                </span>
              </PhotoFrame>
              <div className="flex flex-col justify-center">
                <InboxIllustration />
              </div>
            </div>
          </FeatureCard>
          <FeatureCard
            icon={Megaphone}
            title="Campaigns & broadcasts"
            description="Send approved templates to tags, groups, CSVs or hand-picked contacts — now or on a schedule."
            href="/campaigns"
            className="lg:col-span-2"
          >
            <PhotoFrame
              photo={photos.shoppers}
              sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 100vw"
              className="min-h-[300px] flex-1 rounded-2xl"
            >
              <div className="glass absolute inset-x-3 bottom-3 rounded-2xl p-3 shadow-lift">
                <FunnelIllustration />
              </div>
            </PhotoFrame>
          </FeatureCard>
          <FeatureCard
            icon={Workflow}
            title="Chatbots & flows"
            description="Keyword triggers, quick replies and WhatsApp Flows that qualify leads and answer FAQs around the clock."
            href="/chatbots"
            className="lg:col-span-2"
          >
            <PhotoFrame
              photo={photos.womanPhone}
              sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 100vw"
              className="min-h-[280px] flex-1 rounded-2xl"
            >
              <div className="absolute inset-x-3 bottom-3">
                <FlowIllustration />
              </div>
            </PhotoFrame>
          </FeatureCard>
          <FeatureCard
            icon={ShoppingBag}
            title="Catalogue & orders"
            description="Share products inside the chat and manage every order that comes in through WhatsApp."
            href="/catalogue"
            className="lg:col-span-2"
          >
            <PhotoFrame
              photo={photos.storeInterior}
              sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 100vw"
              className="min-h-[280px] flex-1 rounded-2xl"
            >
              <div className="absolute inset-x-3 bottom-6">
                <CatalogueIllustration />
              </div>
            </PhotoFrame>
          </FeatureCard>
          <FeatureCard
            icon={Users}
            title="Team & permissions"
            description="Invite agents, set roles and control exactly who can see, send and manage what."
            href="/admin/agents"
            className="lg:col-span-2"
          >
            <TeamIllustration />
          </FeatureCard>
          <FeatureCard
            icon={BarChart3}
            title="Analytics that explain growth"
            description="Track delivery, read and reply rates, chat volume, credits and subscriptions in real time — and see exactly which campaigns drive revenue."
            href="/analytics"
            className="md:col-span-2 lg:col-span-6"
          >
            <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.6fr] lg:gap-6">
              <PhotoFrame
                photo={photos.ownersReviewing}
                sizes="(min-width: 1024px) 420px, 100vw"
                className="aspect-[16/9] rounded-2xl lg:aspect-auto lg:h-full lg:min-h-[260px]"
              >
                <span className="glass absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-soft">
                  <TrendingUp size={12} className="text-emerald-600" /> Revenue up 24% this month
                </span>
              </PhotoFrame>
              <AnalyticsIllustration />
            </div>
          </FeatureCard>
        </Stagger>
      </div>
    </section>
  );
}

function InboxIllustration() {
  const rows = [
    { name: "Aarav M.", msg: "Can I change my delivery address?", tag: "Order", unread: 2, agent: "R" },
    { name: "Sofia L.", msg: "Thanks, the discount code worked! 🎉", tag: "Resolved", unread: 0, agent: "K" },
    { name: "Kabir S.", msg: "Do you ship to Pune?", tag: "Lead", unread: 1, agent: "A" },
  ];
  return (
    <div className="space-y-2 rounded-2xl border bg-muted/40 p-2.5">
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease, delay: 0.2 + i * 0.1 }}
          className={cn(
            "flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(40,16,70,0.05)]",
            i === 0 && "ring-1 ring-brand-200",
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {r.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <Badge tone={r.tag === "Resolved" ? "success" : r.tag === "Lead" ? "warning" : "brand"} className="hidden text-[10px] sm:inline-flex">
                <Tag size={10} />
                {r.tag}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{r.msg}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {r.unread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-gradient px-1.5 text-[10px] font-bold text-white">
                {r.unread}
              </span>
            )}
            <span
              title="Assigned agent"
              className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-brand-600 text-[10px] font-bold text-white"
            >
              {r.agent}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FunnelIllustration() {
  const rows = [
    { label: "Sent", value: 100 },
    { label: "Delivered", value: 97 },
    { label: "Read", value: 84 },
    { label: "Replied", value: 31 },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs font-medium text-foreground/70">{r.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-lg bg-white/70">
            <motion.div
              className="flex h-full items-center justify-end rounded-lg bg-brand-gradient pr-2 text-[11px] font-semibold text-white"
              initial={{ width: 0 }}
              whileInView={{ width: `${r.value}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease, delay: 0.2 + i * 0.1 }}
            >
              {r.value}%
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowIllustration() {
  return (
    <div className="glass relative rounded-2xl p-4 shadow-lift">
      <svg aria-hidden viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <motion.path
          d="M100 34 V58 M100 58 C100 70 50 66 50 84 M100 58 C100 70 150 66 150 84"
          fill="none"
          stroke="#c4a3e0"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease, delay: 0.3 }}
        />
      </svg>
      <div className="relative flex flex-col items-center gap-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1.5 text-[11px] font-semibold text-white shadow-glow">
          <Zap size={12} /> Keyword: &ldquo;price&rdquo;
        </span>
        <div className="grid w-full grid-cols-2 gap-3">
          <span className="rounded-xl border bg-white px-2 py-2 text-center text-[11px] font-semibold shadow-soft">
            Send catalogue
          </span>
          <span className="rounded-xl border bg-white px-2 py-2 text-center text-[11px] font-semibold shadow-soft">
            Hand off to agent
          </span>
        </div>
      </div>
    </div>
  );
}

function CatalogueIllustration() {
  const items = [
    { name: "Linen Shirt", price: "₹1,299", tone: "from-brand-300 to-brand-500" },
    { name: "Canvas Tote", price: "₹749", tone: "from-brand-pink/70 to-brand-orange/70" },
  ];
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.name} className="overflow-hidden rounded-2xl border bg-white shadow-soft">
            <div className={cn("h-16 bg-gradient-to-br", it.tone)} />
            <div className="p-2.5">
              <p className="truncate text-xs font-semibold">{it.name}</p>
              <p className="text-[11px] text-muted-foreground">{it.price}</p>
            </div>
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease, delay: 0.5 }}
        className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold shadow-lift"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        New order received
      </motion.div>
    </div>
  );
}

function TeamIllustration() {
  const roles = [
    { role: "Owner", name: "Kavya", perms: "Full access", on: true, photo: portraits.womanGlasses },
    { role: "Admin", name: "Rohan", perms: "Campaigns & settings", on: true, photo: portraits.manHenley },
    { role: "Agent", name: "Emma", perms: "Assigned chats only", on: false, photo: portraits.womanBlonde },
  ];
  return (
    <div className="space-y-2">
      {roles.map((r, i) => (
        <motion.div
          key={r.role}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease, delay: 0.2 + i * 0.08 }}
          className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative shrink-0">
              <Avatar photo={r.photo} size={36} className="ring-2 ring-brand-100" />
              <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-white bg-brand-50 text-brand-600">
                <Lock size={9} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {r.name} <span className="font-medium text-muted-foreground">· {r.role}</span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{r.perms}</p>
            </div>
          </div>
          <span
            aria-hidden
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              r.on ? "bg-brand-gradient" : "bg-muted ring-1 ring-inset ring-border",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                r.on ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </motion.div>
      ))}
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-3 py-2.5 text-xs font-semibold text-brand-700">
        <Plus size={14} /> Invite a teammate
      </div>
    </div>
  );
}

function AnalyticsIllustration() {
  const kpis = [
    { label: "Read rate", value: 86.4, format: (n: number) => `${n.toFixed(1)}%` },
    { label: "Avg. first reply", value: 2.4, format: (n: number) => `${n.toFixed(1)} min` },
    { label: "Revenue influenced", value: 412000, format: (n: number) => formatINR(n) },
  ];
  return (
    <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[1fr_1.6fr]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {kpis.map((k) => (
          <div key={k.label} className="min-w-0 rounded-2xl border bg-muted/40 p-3 sm:p-4">
            <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{k.label}</p>
            <AnimatedNumber
              value={k.value}
              format={k.format}
              className="mt-1 block font-display text-base font-bold text-foreground sm:text-2xl"
            />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Conversations this month</p>
          <Badge tone="success">
            <TrendingUp size={12} /> 24%
          </Badge>
        </div>
        <svg viewBox="0 0 400 140" className="h-36 w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="home-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#833AB4" stopOpacity="0.28" />
              <stop offset="1" stopColor="#833AB4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="home-line" x1="0" x2="1">
              <stop offset="0" stopColor="#6D28D9" />
              <stop offset="0.6" stopColor="#C13584" />
              <stop offset="1" stopColor="#E1306C" />
            </linearGradient>
          </defs>
          {[35, 70, 105].map((y) => (
            <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="hsl(268 25% 91%)" strokeDasharray="3 5" />
          ))}
          <motion.path
            d="M0 118 C40 110 60 96 100 98 S160 72 200 76 S260 44 300 50 S360 20 400 14 L400 140 L0 140 Z"
            fill="url(#home-area)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />
          <motion.path
            d="M0 118 C40 110 60 96 100 98 S160 72 200 76 S260 44 300 50 S360 20 400 14"
            fill="none"
            stroke="url(#home-line)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease, delay: 0.2 }}
          />
        </svg>
      </div>
    </div>
  );
}

/* --------------------------------- Use cases -------------------------------- */

function UseCases() {
  return (
    <section id="use-cases" aria-labelledby="use-cases-title" className="relative scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <FadeIn inView className="max-w-2xl space-y-4">
            <Eyebrow>Built for businesses like yours</Eyebrow>
            <h2
              id="use-cases-title"
              className="text-balance text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl md:text-5xl"
            >
              Real shops. Real customers. <span className="text-gradient">Real conversations.</span>
            </h2>
          </FadeIn>
          <FadeIn inView delay={0.1} className="max-w-md">
            <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              From the corner café to fast-growing D2C labels, owners use WA Automation to sell, support and stay
              close to the people who keep them in business.
            </p>
          </FadeIn>
        </div>

        <Stagger inView stagger={0.12} className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {USE_CASES.map((u, i) => (
            <StaggerItem key={u.label} className={cn(i === 2 && "sm:col-span-2 lg:col-span-1")}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="group relative h-full overflow-hidden rounded-[1.75rem] shadow-soft ring-1 ring-brand-100 transition-shadow duration-300 hover:shadow-lift"
              >
                <PhotoFrame
                  photo={u.photo}
                  width={900}
                  overlay="strong"
                  sizes={
                    i === 2
                      ? "(min-width: 1024px) 400px, (min-width: 640px) 90vw, 100vw"
                      : "(min-width: 1024px) 400px, (min-width: 640px) 45vw, 100vw"
                  }
                  className={cn(
                    "aspect-[4/5] min-h-[400px] min-[420px]:aspect-[4/3] min-[420px]:min-h-[360px] sm:aspect-[4/5] sm:min-h-[420px]",
                    i === 2 && "sm:aspect-[16/9] sm:min-h-[360px] lg:aspect-[4/5] lg:min-h-[420px]",
                  )}
                >
                  <span className="glass absolute left-4 top-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft">
                    <u.icon size={14} className="shrink-0 text-brand-600" />
                    <span className="truncate">{u.label}</span>
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                    <p className="font-display text-3xl font-bold leading-none">
                      {u.stat}
                      <span className="ml-2 text-sm font-medium text-white/80">{u.statLabel}</span>
                    </p>
                    <h3 className="mt-3 text-lg font-bold leading-snug text-white sm:text-xl">{u.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">{u.body}</p>
                  </div>
                </PhotoFrame>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------- How it works ------------------------------ */

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-brand-50/70 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Live on WhatsApp in <span className="text-gradient">three simple steps</span>
            </>
          }
          description="No developers, no waiting weeks for onboarding. Most teams send their first campaign the same day."
        />

        <div className="relative mt-16">
          <motion.div
            aria-hidden
            className="absolute left-[16.6%] right-[16.6%] top-8 hidden h-px origin-left bg-gradient-to-r from-brand-300 via-brand-magenta/60 to-brand-pink/60 md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease, delay: 0.3 }}
          />
          <Stagger inView stagger={0.15} className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <StaggerItem key={step.title} className="relative text-center">
                <div className="relative mx-auto grid h-16 w-16 place-items-center">
                  <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-brand-300/40" style={{ animationDelay: `${i * 0.6}s` }} />
                  <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <step.icon size={26} />
                  </span>
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-white font-display text-xs font-bold text-brand-700 shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <FadeIn inView delay={0.2} className="mt-14 flex justify-center">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "rounded-2xl")}>
            Connect your number
            <ArrowRight size={18} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ---------------------------------- Stats ---------------------------------- */

function StatsBand() {
  return (
    <section aria-label="WA Automation in numbers" className="py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <FadeIn inView>
          <div className="relative overflow-hidden rounded-[2rem] border bg-white p-2 shadow-lift">
            <div aria-hidden className="absolute inset-0 bg-aurora opacity-80" />
            <Stagger inView stagger={0.08} className="relative grid grid-cols-2 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <StaggerItem
                  key={s.label}
                  className={cn(
                    "px-4 py-8 text-center sm:px-6 sm:py-10",
                    i % 2 === 1 && "border-l",
                    i >= 2 && "border-t lg:border-t-0",
                    i === 2 && "lg:border-l",
                  )}
                >
                  <AnimatedNumber
                    value={s.value}
                    format={s.format}
                    className="block font-display text-3xl font-bold text-gradient sm:text-5xl"
                  />
                  <p className="mx-auto mt-2 max-w-[14rem] text-xs font-medium text-muted-foreground sm:text-sm">
                    {s.label}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ------------------------------- Testimonials ------------------------------ */

function Testimonials() {
  return (
    <section id="customers" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Loved by teams"
          title={
            <>
              Brands that <span className="text-gradient">switched and stayed</span>
            </>
          }
          description="Marketing, sales and support teams use WA Automation to have better conversations at scale."
        />

        <Stagger inView stagger={0.1} className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <StaggerItem key={t.name} className={cn(i === 2 && "md:col-span-2 lg:col-span-1")}>
              <motion.figure
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-soft transition-shadow hover:shadow-lift sm:p-7",
                  i === 1 && "lg:border-brand-200",
                )}
              >
                <Quote aria-hidden className="h-8 w-8 text-brand-200" />
                <div className="mt-4 flex gap-0.5" role="img" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={15} className="fill-brand-yellow text-brand-yellow" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/85">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t pt-5">
                  <span className="shrink-0 rounded-full bg-brand-gradient p-[2px] shadow-glow">
                    <Avatar photo={t.photo} size={48} className="ring-2 ring-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </motion.figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* --------------------------------- Pricing --------------------------------- */

function Pricing({ onBookDemo }: { onBookDemo: () => void }) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section id="pricing" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-brand-50/60 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple plans that <span className="text-gradient">grow with you</span>
            </>
          }
          description="Start free, upgrade when you go live. Meta conversation charges are billed at cost from your wallet."
        />

        <FadeIn inView delay={0.1} className="mt-10 flex justify-center">
          <SegmentedTabs<Billing>
            layoutId="home-billing"
            value={billing}
            onChange={setBilling}
            className="bg-white shadow-soft [&>button]:min-h-10 sm:[&>button]:min-h-0"
            tabs={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    Yearly
                    <span className="rounded-full bg-brand-gradient px-1.5 py-px text-[10px] font-bold text-white">-20%</span>
                  </span>
                ),
              },
            ]}
          />
        </FadeIn>

        <Stagger
          inView
          stagger={0.1}
          className="mx-auto mt-12 grid max-w-xl grid-cols-1 items-stretch gap-6 lg:max-w-none lg:grid-cols-3 lg:gap-5 xl:gap-6"
        >
          {PLANS.map((plan) => (
            <StaggerItem key={plan.name} className="h-full">
              <div
                className={cn(
                  "h-full rounded-[1.75rem]",
                  plan.featured ? "bg-brand-gradient p-[1.5px] shadow-glow" : "border bg-white shadow-soft",
                )}
              >
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-[calc(1.75rem-1.5px)] bg-white p-6 sm:p-8 lg:p-7 xl:p-8",
                    plan.featured && "bg-gradient-to-b from-brand-50/80 to-white",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2.5 py-1 text-[11px] font-bold text-white">
                        <Sparkles size={12} /> Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>

                  <div className="relative mt-6 flex h-14 items-end gap-1.5">
                    {plan.price ? (
                      <>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={`${plan.name}-${billing}`}
                            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
                            transition={{ duration: 0.3, ease }}
                            className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[2.6rem] xl:text-5xl"
                          >
                            {formatINR(plan.price[billing])}
                          </motion.span>
                        </AnimatePresence>
                        <span className="pb-1.5 text-sm text-muted-foreground">/ month</span>
                      </>
                    ) : (
                      <span className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[2.6rem] xl:text-5xl">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="mt-1 h-5 text-xs text-muted-foreground">
                    {plan.price
                      ? billing === "yearly"
                        ? `Billed yearly · ${formatINR(plan.price.yearly * 12)}`
                        : "Billed monthly · cancel anytime"
                      : "Volume pricing for large teams"}
                  </p>

                  {plan.cta.href ? (
                    <Link
                      href={plan.cta.href}
                      className={cn(
                        buttonVariants({ variant: plan.featured ? "primary" : "outline", size: "lg" }),
                        "mt-7 w-full rounded-2xl",
                      )}
                    >
                      {plan.cta.label}
                      <ArrowRight size={17} />
                    </Link>
                  ) : (
                    <Button variant="outline" size="lg" onClick={onBookDemo} className="mt-7 w-full rounded-2xl">
                      {plan.cta.label}
                      <ArrowRight size={17} />
                    </Button>
                  )}

                  <ul className="mt-8 space-y-3 border-t pt-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-foreground/85">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ----------------------------------- FAQ ----------------------------------- */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <FadeIn inView className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-balance text-3xl font-bold leading-[1.1] sm:text-4xl md:text-5xl">
            Questions, <span className="text-gradient">answered</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Our team replies within a few hours on business days.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonVariants({ variant: "outline" })}>
              <Mail size={16} className="text-brand-600" />
              Email support
            </a>
          </div>
        </FadeIn>

        <Stagger inView stagger={0.06} className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <StaggerItem key={item.q}>
                <div
                  className={cn(
                    "rounded-2xl border bg-white transition-all duration-300",
                    isOpen ? "border-brand-200 shadow-lift" : "shadow-soft hover:border-brand-200",
                  )}
                >
                  <h3 className="font-sans text-base">
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-5 text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-6"
                    >
                      <span style={{ letterSpacing: "normal" }}>{item.q}</span>
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors duration-300",
                          isOpen ? "bg-brand-gradient text-white" : "bg-brand-50 text-brand-600",
                        )}
                      >
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.3, ease }}
                          className="grid place-items-center"
                        >
                          {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                        </motion.span>
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* --------------------------------- CTA band -------------------------------- */

function CtaBand({ onBookDemo }: { onBookDemo: () => void }) {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <FadeIn inView className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-gradient bg-[length:200%_200%] px-5 py-12 text-white shadow-glow animate-gradient-x sm:px-10 sm:py-16 lg:px-14 lg:py-16">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            }}
          />
          <motion.div
            aria-hidden
            className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-yellow/30 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/20 blur-3xl"
            animate={{ scale: [1.1, 0.95, 1.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
            <div className="mx-auto max-w-2xl space-y-6 text-center lg:mx-0 lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ring-white/30 backdrop-blur">
                <MessageCircle size={13} /> Start today
              </span>
              <h2 className="text-balance text-3xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[2.75rem] xl:text-5xl">
                Your customers are already on WhatsApp. Meet them there.
              </h2>
              <p className="text-pretty text-base text-white/85 sm:text-lg">
                Create your workspace in under a minute and send your first campaign today.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 text-base font-semibold text-brand-700 shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600 sm:w-auto"
                >
                  Get started free
                  <ArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  onClick={onBookDemo}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-7 text-base font-semibold text-white ring-1 ring-white/50 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
                >
                  <CalendarCheck size={18} />
                  Book a demo
                </button>
              </div>
            </div>
  
            {/* Photo blended into the gradient band */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="group relative rotate-0 rounded-[1.75rem] bg-white/20 p-1.5 ring-1 ring-white/40 backdrop-blur lg:rotate-2">
                <PhotoFrame
                  photo={photos.friendsCafe}
                  width={1000}
                  overlay="none"
                  sizes="(min-width: 1024px) 500px, (min-width: 640px) 448px, 90vw"
                  className="aspect-[4/3] rounded-[1.4rem]"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-brand-700/45 via-brand-magenta/10 to-brand-pink/20 mix-blend-multiply"
                  />
                </PhotoFrame>
              </div>
              <motion.div
                aria-hidden
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: 0.4 }}
                className="absolute -bottom-5 left-3 right-3 sm:-left-5 sm:right-auto sm:max-w-[300px]"
              >
                <div className="glass flex animate-float items-center gap-3 rounded-2xl px-3 py-2.5 text-foreground shadow-lift">
                  <Avatar photo={photos.cafePhone} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">&ldquo;Table for 4 at 8pm — booked!&rdquo;</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CheckCheck size={12} className="text-brand-600" /> Read · just now
                    </span>
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* ---------------------------------- Footer --------------------------------- */

function Footer({ onBookDemo }: { onBookDemo: () => void }) {
  const linkClass =
    "inline-flex min-h-10 items-center text-left text-sm text-muted-foreground transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:text-brand-700 lg:min-h-8";
  return (
    <footer className="relative border-t bg-white">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 space-y-4 sm:col-span-3 lg:col-span-1">
            <Logo href="/" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              The WhatsApp Business platform for campaigns, conversations and commerce — built on Meta&apos;s official
              Cloud API.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-foreground hover:text-brand-700"
            >
              <Mail size={15} className="text-brand-600" />
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Product</p>
            <ul className="mt-3 space-y-0.5 lg:space-y-1.5">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <SectionLink id={l.id} className={linkClass}>
                    {l.label}
                  </SectionLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Account</p>
            <ul className="mt-3 space-y-0.5 lg:space-y-1.5">
              <li>
                <Link href="/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className={linkClass}>
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className={linkClass}>
                  Reset password
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className={linkClass}>
                  Go to dashboard
                </Link>
              </li>
              <li>
                <Link href="/platform" className={linkClass}>
                  Platform admin
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Company</p>
            <ul className="mt-3 space-y-0.5 lg:space-y-1.5">
              <li>
                <button type="button" onClick={onBookDemo} className={linkClass}>
                  Book a demo
                </button>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                  Contact support
                </a>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Sales%20enquiry`} className={linkClass}>
                  Talk to sales
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
          <p suppressHydrationWarning>© {new Date().getFullYear()} WA Automation. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-brand-600" /> Built on the official WhatsApp Cloud API
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={14} className="text-brand-600" /> Encrypted in transit
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------ Contact widget ----------------------------- */

function ContactWidget({ onBookDemo }: { onBookDemo: () => void }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id="home-contact-panel"
            role="dialog"
            aria-label="Contact WA Automation"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25, ease }}
            className="absolute bottom-16 right-0 w-[min(20rem,calc(100vw-2rem))] origin-bottom-right overflow-hidden rounded-3xl border bg-white shadow-lift"
          >
            <div className="relative bg-brand-gradient p-5 text-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close contact panel"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={16} />
              </button>
              <p className="font-display text-lg font-bold">Hi there 👋</p>
              <p className="mt-1 text-sm text-white/85">
                Questions about WhatsApp automation? We usually reply within a few hours.
              </p>
            </div>
            <div className="space-y-2 p-3">
              <ContactAction
                icon={CalendarCheck}
                title="Book a 15-min demo"
                subtitle="See the platform live with our team"
                onClick={() => {
                  setOpen(false);
                  onBookDemo();
                }}
              />
              <ContactAction
                icon={Mail}
                title="Email us"
                subtitle={SUPPORT_EMAIL}
                href={`mailto:${SUPPORT_EMAIL}`}
              />
              <ContactAction icon={Sparkles} title="Start for free" subtitle="Create your workspace" href="/signup" internal />
            </div>
            <p className="flex items-center justify-center gap-1.5 border-t py-2.5 text-[11px] text-muted-foreground">
              <Clock size={12} /> Mon–Sat, 9am – 7pm IST
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close contact options" : "Contact us"}
        aria-expanded={open}
        aria-controls="home-contact-panel"
        className="group relative grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-glow transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
      >
        {!open && <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/50" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "chat"}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

function ContactAction({
  icon: Icon,
  title,
  subtitle,
  href,
  internal,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  href?: string;
  internal?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-gradient group-hover:text-white">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ArrowRight size={15} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </>
  );
  const cls =
    "group flex w-full items-center gap-3 rounded-2xl p-2.5 transition hover:bg-brand-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  if (href && internal) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* -------------------------------- Demo modal ------------------------------- */

const EMPTY_DEMO = { name: "", email: "", phone: "", company: "", interest: "campaigns" };

/** There is no public lead-capture endpoint yet, so the request is delivered by a pre-filled email. */
function demoMailto(form: typeof EMPTY_DEMO) {
  const body = [
    `Name: ${form.name.trim()}`,
    `Email: ${form.email.trim()}`,
    `WhatsApp: ${form.phone.trim()}`,
    form.company.trim() ? `Company: ${form.company.trim()}` : null,
    `Interested in: ${form.interest}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Demo request")}&body=${encodeURIComponent(body)}`;
}

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_DEMO);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY_DEMO, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);

  // Lock page scroll, close on Escape and reset when the modal closes.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const focus = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focus);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    const reset = window.setTimeout(() => {
      setForm(EMPTY_DEMO);
      setErrors({});
      setSubmitted(false);
      setSubmitting(false);
    }, 300);
    return () => window.clearTimeout(reset);
  }, [open]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const update = (key: keyof typeof EMPTY_DEMO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 8) next.phone = "Enter a valid WhatsApp number with country code.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    timer.current = window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success("Details ready", {
        description: "Send the pre-filled email to reach our team.",
      });
    }, 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div aria-hidden className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white shadow-lift scrollbar-thin sm:max-w-lg sm:rounded-[1.75rem]"
          >
            <div className="relative overflow-hidden bg-aurora px-6 pb-5 pt-7 sm:px-8">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X size={18} />
              </button>
              <Eyebrow>Live demo</Eyebrow>
              <h2 id="demo-modal-title" className="mt-4 text-2xl font-bold sm:text-3xl">
                See WA Automation <span className="text-gradient">in action</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A 15-minute walkthrough tailored to your business — campaigns, inbox, chatbots and more.
              </p>
            </div>

            <div className="px-6 pb-7 pt-5 sm:px-8">
              <AnimatePresence mode="wait" initial={false}>
                {submitted ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="py-6 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                      className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60"
                    >
                      <Check size={30} strokeWidth={3} />
                    </motion.span>
                    <h3 className="mt-5 text-xl font-bold">Almost there, {form.name.trim().split(" ")[0]}!</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                      Send your request to our team and we&apos;ll get back to you at{" "}
                      <span className="font-semibold text-foreground">{form.phone}</span> to confirm a time.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                      <a href={demoMailto(form)} className={buttonVariants()}>
                        <Mail size={16} />
                        Send request by email
                      </a>
                      <Link href="/signup" className={buttonVariants({ variant: "outline" })} onClick={onClose}>
                        Create free account
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    noValidate
                    onSubmit={onSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Full name" required error={errors.name}>
                        {({ id }) => (
                          <Input
                            id={id}
                            ref={firstFieldRef}
                            autoComplete="name"
                            placeholder="Jane Cooper"
                            value={form.name}
                            onChange={update("name")}
                            aria-invalid={Boolean(errors.name)}
                          />
                        )}
                      </Field>
                      <Field label="Company">
                        {({ id }) => (
                          <Input
                            id={id}
                            autoComplete="organization"
                            placeholder="Acme Retail"
                            value={form.company}
                            onChange={update("company")}
                          />
                        )}
                      </Field>
                    </div>
                    <Field label="Work email" required error={errors.email}>
                      {({ id }) => (
                        <Input
                          id={id}
                          type="email"
                          autoComplete="email"
                          placeholder="jane@company.com"
                          value={form.email}
                          onChange={update("email")}
                          aria-invalid={Boolean(errors.email)}
                        />
                      )}
                    </Field>
                    <Field label="WhatsApp number" required error={errors.phone} hint="Include your country code.">
                      {({ id }) => (
                        <Input
                          id={id}
                          type="tel"
                          autoComplete="tel"
                          placeholder="+91 98XXX XXXXX"
                          value={form.phone}
                          onChange={update("phone")}
                          aria-invalid={Boolean(errors.phone)}
                        />
                      )}
                    </Field>
                    <Field label="What are you most interested in?">
                      {({ id }) => (
                        <Select id={id} value={form.interest} onChange={update("interest")}>
                          <option value="campaigns">Campaigns & broadcasts</option>
                          <option value="inbox">Shared team inbox</option>
                          <option value="chatbots">Chatbots & flows</option>
                          <option value="catalogue">Catalogue & orders</option>
                          <option value="everything">The whole platform</option>
                        </Select>
                      )}
                    </Field>
                    <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full rounded-2xl">
                      {submitting ? "Sending…" : "Request my demo"}
                      {!submitting && <ArrowRight size={17} />}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      No spam, ever. We&apos;ll only contact you about your demo.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
