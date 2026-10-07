"use client";

/**
 * Shared animation primitives built on `motion`. Pages should compose these
 * rather than hand-rolling variants, so timing and easing stay consistent.
 */
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease } },
};

type DivProps = HTMLMotionProps<"div">;

/** Fades + lifts its children into view. `inView` defers until scrolled to. */
export function FadeIn({
  delay = 0,
  y = 16,
  inView = false,
  className,
  children,
  ...props
}: DivProps & { delay?: number; y?: number; inView?: boolean }) {
  const variants: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease, delay } },
  };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      {...(inView
        ? { whileInView: "show", viewport: { once: true, margin: "-60px" } }
        : { animate: "show" })}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers `StaggerItem` children. */
export function Stagger({
  stagger = 0.06,
  delay = 0,
  inView = false,
  className,
  children,
  ...props
}: DivProps & { stagger?: number; delay?: number; inView?: boolean }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(inView
        ? { whileInView: "show", viewport: { once: true, margin: "-60px" } }
        : { animate: "show" })}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children, ...props }: DivProps) {
  return (
    <motion.div className={className} variants={fadeUp} {...props}>
      {children}
    </motion.div>
  );
}

/** Wraps a page's content so every route enters with the same motion. */
export function PageTransition({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Card that lifts on hover. */
export function HoverLift({ className, children, ...props }: DivProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Subtle 3D tilt that follows the cursor — for hero mockups and feature cards. */
export function Tilt({
  className,
  children,
  max = 8,
}: {
  className?: string;
  children: React.ReactNode;
  max?: number;
}) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width);
        y.set((e.clientY - rect.top) / rect.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Card with a radial purple spotlight that tracks the pointer. */
export function Spotlight({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [pos, setPos] = useState({ x: -400, y: -400 });
  return (
    <div
      className={cn("group relative overflow-hidden", className)}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerLeave={() => setPos({ x: -400, y: -400 })}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, rgba(131,58,180,0.10), transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}

/** Counts up to `value` when it scrolls into view. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 1.2,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (!inView || !Number.isFinite(value)) {
      if (!Number.isFinite(value)) setDisplay(format(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease,
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // `format` is usually an inline closure; re-running on identity change would restart the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
    </span>
  );
}

/** Pill-shaped tab switcher with a sliding active indicator. */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  layoutId = "segmented-tabs",
}: {
  tabs: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  layoutId?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1 rounded-xl border bg-muted/60 p-1", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-white shadow-soft"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { motion, AnimatePresence } from "motion/react";
