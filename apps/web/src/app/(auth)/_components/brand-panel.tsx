"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { BadgeCheck, Bot, CheckCheck, Megaphone, Quote, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AnimatedNumber, ease } from "@/components/motion";
import { photos, portraits, unsplash, type Photo } from "@/lib/marketing-images";
import { cn } from "@/lib/utils";

/**
 * Marketing visuals for the auth screens: a real photograph of a small
 * business owner under a purple→magenta wash, with a looping WhatsApp-style
 * conversation, floating glass notification cards and a customer quote
 * layered on top. Purely decorative — no account data.
 */

type Scene = {
  key: string;
  photo: Photo;
  testimonial: { quote: string; name: string; role: string; portrait: Photo };
};

const SCENES: Record<"default" | "signup", Scene> = {
  default: {
    key: "default",
    photo: photos.shopOwnerPhone,
    testimonial: {
      quote: "Customers get answers in seconds, even after we close. WhatsApp is now our busiest sales channel.",
      name: "Priya Sharma",
      role: "Founder, Studio Bloom",
      portrait: portraits.womanRed,
    },
  },
  signup: {
    key: "signup",
    photo: photos.boutiqueOwner,
    testimonial: {
      quote: "We sent our first broadcast the same afternoon we signed up. Setup really is that quick.",
      name: "Arjun Mehta",
      role: "Owner, Threadline Boutique",
      portrait: portraits.manVneck,
    },
  },
};

/** Signup gets its own photo and quote; every other auth screen shares one. */
function useAuthScene(): Scene {
  const pathname = usePathname();
  return pathname?.startsWith("/signup") ? SCENES.signup : SCENES.default;
}

/** Full-bleed photo that cross-fades when the scene changes (login ⇄ signup). */
function ScenePhoto({
  scene,
  sizes,
  width,
  priority,
  className,
}: {
  scene: Scene;
  sizes: string;
  width: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={scene.photo.id}
        aria-hidden={priority ? undefined : true}
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease }}
      >
        <Image
          src={unsplash(scene.photo.id, width)}
          alt={priority ? scene.photo.alt : ""}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover object-center", className)}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function Avatar({ photo, className }: { photo: Photo; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-full", className)}>
      <Image src={unsplash(photo.id, 160)} alt={photo.alt} fill sizes="48px" className="object-cover" />
    </span>
  );
}

function Stars() {
  return (
    <span className="flex items-center gap-0.5 text-[#fcaf45]" aria-label="5 out of 5 stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={13} className="fill-current" aria-hidden />
      ))}
    </span>
  );
}

/** Short customer quote with a real portrait, for use on dark photo backgrounds. */
function Testimonial({ scene, className }: { scene: Scene; className?: string }) {
  const t = scene.testimonial;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.figure
        key={scene.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease }}
        className={cn("flex items-start gap-3.5", className)}
      >
        <Avatar photo={t.portrait} className="h-12 w-12 ring-2 ring-white/70" />
        <div className="min-w-0 space-y-1.5">
          <blockquote className="relative text-[15px] font-medium leading-snug text-white">
            <Quote size={14} className="mb-0.5 mr-1 inline -scale-x-100 text-white/60" aria-hidden />
            {t.quote}
          </blockquote>
          <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/75">
            <span className="font-semibold text-white">{t.name}</span>
            <span aria-hidden>·</span>
            <span>{t.role}</span>
            <Stars />
          </figcaption>
        </div>
      </motion.figure>
    </AnimatePresence>
  );
}

type ChatLine =
  | { kind: "in"; text: string }
  | { kind: "out"; text: string; template?: boolean }
  | { kind: "typing" };

const SCRIPT: ChatLine[] = [
  { kind: "in", text: "Hi! Is the summer collection back in stock?" },
  { kind: "typing" },
  { kind: "out", text: "Yes, it just dropped. Want a 10% early-access code?" },
  { kind: "in", text: "Yes please!" },
  { kind: "typing" },
  { kind: "out", text: "Here you go: SUMMER10. Tap below to shop the drop.", template: true },
];

// Soft drifting light leaks over the photo — kept faint so the image reads first.
const ORBS = [
  { className: "left-[-12%] top-[-14%] h-[26rem] w-[26rem] bg-[#833ab4]/45", x: [0, 60, -20, 0], y: [0, 40, 80, 0], d: 18 },
  { className: "right-[-15%] top-[25%] h-[22rem] w-[22rem] bg-[#e1306c]/30", x: [0, -50, 20, 0], y: [0, 60, -30, 0], d: 22 },
  { className: "bottom-[-20%] left-[25%] h-[24rem] w-[24rem] bg-[#f77737]/20", x: [0, 40, -40, 0], y: [0, -50, 10, 0], d: 26 },
];

function useChatLoop(enabled: boolean) {
  // Number of script lines currently visible. Typing indicators only show
  // while they are the newest line.
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setCount(SCRIPT.length);
      return;
    }
    const atEnd = count >= SCRIPT.length;
    const current = SCRIPT[count - 1];
    const delay = atEnd ? 3800 : current?.kind === "typing" ? 1100 : 1700;
    const timer = setTimeout(() => setCount((c) => (c >= SCRIPT.length ? 1 : c + 1)), delay);
    return () => clearTimeout(timer);
  }, [count, enabled]);

  return SCRIPT.slice(0, count)
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => line.kind !== "typing" || index === count - 1);
}

function ChatMock() {
  const reduce = useReducedMotion();
  const lines = useChatLoop(!reduce);

  return (
    <div className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.75rem] border border-white/25 bg-white/95 shadow-[0_30px_80px_-20px_rgba(30,6,60,0.55)]">
      <div className="flex items-center gap-3 border-b border-brand-100 bg-white px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
          SB
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
            Studio Bloom
            <BadgeCheck size={14} className="text-primary" aria-hidden />
          </p>
          <p className="text-[11px] text-muted-foreground">Business account · replies instantly</p>
        </div>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Bot on
        </span>
      </div>

      <div className="flex h-[17.5rem] flex-col justify-end gap-2 overflow-hidden bg-[linear-gradient(180deg,#faf7ff_0%,#f6f0ff_100%)] px-3.5 py-4">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map(({ line, index }) => (
            <motion.div
              key={`${index}-${line.kind}`}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease }}
              className={cn("flex", line.kind === "in" ? "justify-start" : "justify-end")}
            >
              {line.kind === "typing" ? (
                <span className="flex items-center gap-1 rounded-2xl rounded-br-md bg-brand-gradient px-3.5 py-2.5">
                  {[0, 0.15, 0.3].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-white"
                      animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                    />
                  ))}
                </span>
              ) : line.kind === "in" ? (
                <span className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] leading-snug text-foreground shadow-soft">
                  {line.text}
                </span>
              ) : (
                <span className="max-w-[82%] overflow-hidden rounded-2xl rounded-br-md bg-brand-gradient text-[13px] leading-snug text-white shadow-[0_8px_20px_-8px_rgba(131,58,180,0.6)]">
                  <span className="block px-3.5 pb-1 pt-2">{line.text}</span>
                  <span className="flex items-center justify-end gap-1 px-3 pb-1.5 text-[10px] text-white/80">
                    09:41 <CheckCheck size={13} aria-hidden />
                  </span>
                  {line.template && (
                    <span className="block border-t border-white/25 bg-white/10 py-2 text-center text-xs font-semibold">
                      Shop the drop
                    </span>
                  )}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FloatingCard({
  className,
  delay,
  icon: Icon,
  iconClassName,
  title,
  subtitle,
}: {
  className?: string;
  delay: number;
  icon: typeof Megaphone;
  iconClassName?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease, delay }}
      className={cn("absolute z-20", className)}
    >
      <div className="flex animate-float items-center gap-3 rounded-2xl border border-white/40 bg-white/85 px-3.5 py-2.5 shadow-[0_18px_40px_-14px_rgba(30,6,60,0.45)] backdrop-blur-xl">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white", iconClassName)}>
          <Icon size={17} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-foreground">{title}</span>
          <span className="block text-[11px] text-muted-foreground">{subtitle}</span>
        </span>
      </div>
    </motion.div>
  );
}

/** Purple → magenta wash that keeps white text readable over any photo. */
function PhotoWash({ strong = false }: { strong?: boolean }) {
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-brand-gradient opacity-70 mix-blend-multiply" />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-b",
          strong
            ? "from-brand-900/85 via-brand-900/40 to-brand-900/90"
            : "from-brand-900/75 via-brand-900/10 to-brand-900/85",
        )}
      />
    </>
  );
}

const STATS = [
  { value: 98, suffix: "%", label: "Typical open rate" },
  { value: 24, suffix: "/7", label: "Chatbot coverage" },
  { value: 5, suffix: " min", label: "To first campaign" },
];

/** Desktop (lg+) immersive panel built around a real photograph. */
export function BrandPanel() {
  const scene = useAuthScene();
  const reduce = useReducedMotion();

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden rounded-[2rem] bg-brand-900 p-8 text-white xl:p-12">
      {/* Photo + brand wash + faint drifting light */}
      <div className="absolute inset-0 -z-30 overflow-hidden">
        <ScenePhoto scene={scene} width={1600} priority sizes="(min-width: 1024px) 55vw, 10vw" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-20">
        <PhotoWash strong />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden mix-blend-screen">
        {ORBS.map((orb, i) => (
          <motion.span
            key={i}
            className={cn("absolute rounded-full blur-3xl", orb.className)}
            animate={reduce ? undefined : { x: orb.x, y: orb.y }}
            transition={{ duration: orb.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center justify-between gap-4"
      >
        <Logo inverted markClassName="h-10 w-10" />
        <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md xl:inline-flex">
          <ShieldCheck size={14} aria-hidden />
          Official WhatsApp Business API
        </span>
      </motion.div>

      <div className="mt-8 max-w-lg space-y-3 xl:mt-10 xl:space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
          className="text-4xl font-bold leading-[1.08] [text-shadow:0_2px_24px_rgba(30,6,60,0.35)] xl:text-5xl"
        >
          Every WhatsApp conversation,{" "}
          <span className="relative whitespace-nowrap">
            <span className="bg-gradient-to-r from-white via-[#ffe1f0] to-[#ffd29a] bg-clip-text text-transparent">
              automated.
            </span>
            <motion.span
              aria-hidden
              className="absolute -bottom-1 left-0 h-[3px] rounded-full bg-gradient-to-r from-white/90 to-[#fcaf45]"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, ease, delay: 0.6 }}
            />
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.2 }}
          className="text-[15px] leading-relaxed text-white/85"
        >
          Broadcast campaigns, build chatbots, run a shared team inbox and track every
          message — all on Meta&apos;s official Cloud API.
        </motion.p>
      </div>

      {/* Product illustration over the photo (hidden on short viewports so the photo breathes) */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-6 2xl:justify-end 2xl:pr-[6%] [@media(max-height:760px)]:invisible">
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.25 }}
          className="relative z-10 flex w-full justify-center 2xl:w-auto"
        >
          <div className="flex w-full origin-center justify-center [@media(max-height:900px)]:scale-[0.85]">
            <ChatMock />
          </div>
        </motion.div>

        <FloatingCard
          className="left-0 top-[10%] xl:left-[2%]"
          delay={0.7}
          icon={Megaphone}
          iconClassName="bg-brand-gradient"
          title="Campaign delivered"
          subtitle="Summer drop · just now"
        />
        <FloatingCard
          className="bottom-[12%] right-0 xl:right-[2%] 2xl:bottom-[8%] 2xl:right-auto 2xl:left-[4%] [&>div]:[animation-delay:-3s]"
          delay={0.9}
          icon={TrendingUp}
          iconClassName="bg-success"
          title="Reply rate up"
          subtitle="vs. last campaign"
        />
        <FloatingCard
          className="left-[4%] top-[42%] hidden 2xl:block [&>div]:[animation-delay:-1.5s]"
          delay={1.1}
          icon={Bot}
          iconClassName="bg-ig-gradient"
          title="Chatbot handled it"
          subtitle="No agent needed"
        />
      </div>

      {/* Customer quote + proof points */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
        className="rounded-2xl border border-white/20 bg-brand-900/35 p-4 backdrop-blur-md xl:p-5"
      >
        <Testimonial scene={scene} />
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-4 [@media(max-height:860px)]:hidden">
          {STATS.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <p className="font-display text-2xl font-bold tracking-tight xl:text-3xl">
                <AnimatedNumber value={stat.value} />
                <span className="text-white/80">{stat.suffix}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Phones (< md): slim header with the photo subtly visible behind the brand
 * gradient. The form column overlaps its bottom edge with a rounded sheet.
 */
export function MobileBrandHeader() {
  const scene = useAuthScene();
  return (
    <div className="relative isolate overflow-hidden px-4 pb-9 pt-5 text-white sm:px-6 md:hidden">
      <div aria-hidden className="absolute inset-0 -z-20">
        <ScenePhoto scene={scene} width={900} sizes="100vw" className="object-[center_30%]" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-brand-gradient opacity-[0.86]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-900/45 to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <Logo href="/" inverted markClassName="h-9 w-9" />
        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
          <ShieldCheck size={12} aria-hidden />
          Official API
        </span>
      </div>
      <p className="mt-3 max-w-xs text-sm leading-snug text-white/90">
        Every WhatsApp conversation, automated — on the official Business API.
      </p>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="flex -space-x-2">
          {[portraits.womanRed, portraits.manVneck, portraits.womanGlasses].map((p) => (
            <Avatar key={p.id} photo={p} className="h-7 w-7 ring-2 ring-white/80" />
          ))}
        </span>
        <span className="text-xs leading-tight text-white/85">
          <Stars />
          <span className="mt-0.5 block">Loved by shops, cafés &amp; D2C brands</span>
        </span>
      </div>
    </div>
  );
}

/** Tablets (md → lg): softly blurred photo filling the screen behind the centred card. */
export function TabletBackdrop() {
  const scene = useAuthScene();
  return (
    <div aria-hidden className="fixed inset-0 -z-10 hidden overflow-hidden bg-brand-900 md:block lg:hidden">
      <div className="absolute -inset-8 blur-xl">
        <ScenePhoto scene={scene} width={1000} sizes="60vw" />
      </div>
      <PhotoWash />
    </div>
  );
}

/** Tablets (md → lg): customer quote shown under the centred card. */
export function TabletTestimonial() {
  const scene = useAuthScene();
  return (
    <div className="mt-6 hidden w-full max-w-[34rem] rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md md:block lg:hidden">
      <Testimonial scene={scene} />
    </div>
  );
}
