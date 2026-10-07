"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, CircleAlert, type LucideIcon } from "lucide-react";
import { ease, fadeUp } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Only allow same-origin relative paths for post-login redirects, so a crafted
 * `?next=https://evil.example` link cannot bounce users off-site.
 */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // URL parsers strip tabs/newlines, so "/\t/evil.example" would become "//evil.example".
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F\\]/.test(raw)) return fallback;
  // Resolve against a placeholder origin: anything that escapes it is off-site.
  let path: string;
  try {
    const url = new URL(raw, "http://same-origin.invalid");
    if (url.origin !== "http://same-origin.invalid") return fallback;
    path = `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
  // Never bounce a fresh sign-in straight back into an auth screen or logout.
  if (/^\/(login|signup|logout|forgot-password|reset-password)(\/|\?|#|$)/i.test(path)) return fallback;
  return path;
}

/** Stagger container for auth forms — children should be `AuthItem`s. */
export function AuthStagger({
  className,
  children,
  onSubmit,
  as = "div",
  noValidate,
}: {
  className?: string;
  children: React.ReactNode;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  as?: "div" | "form";
  noValidate?: boolean;
}) {
  const props = {
    className: cn("space-y-5", className),
    initial: "hidden" as const,
    animate: "show" as const,
    variants: { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } },
  };
  return as === "form" ? (
    <motion.form {...props} onSubmit={onSubmit} noValidate={noValidate}>
      {children}
    </motion.form>
  ) : (
    <motion.div {...props}>{children}</motion.div>
  );
}

export function AuthItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Eyebrow pill + display title + supporting copy. */
export function AuthHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <AuthItem className="space-y-3">
      {Icon && (
        <motion.span
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="relative mb-1 inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
        >
          <Icon size={22} aria-hidden />
        </motion.span>
      )}
      {eyebrow && (
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {eyebrow}
        </span>
      )}
      <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.25rem]">
        {title}
      </h1>
      {description && <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
    </AuthItem>
  );
}

/** Puts a leading icon inside an Input / PasswordInput (pass `pl-10` to the input). */
export function WithIcon({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="group/icon relative">
      <Icon
        size={17}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/icon:text-primary"
      />
      {children}
    </div>
  );
}

/** Inline, animated error banner shown above the submit button. */
export function FormAlert({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="alert"
          role="alert"
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -6 }}
          transition={{ duration: 0.3, ease }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden />
            <span className="font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "Upper & lowercase", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
  { label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS = [
  { label: "Too weak", bar: "bg-destructive", text: "text-destructive" },
  { label: "Weak", bar: "bg-destructive", text: "text-destructive" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Good", bar: "bg-brand-500", text: "text-primary" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
];

/** Four-segment strength meter with a live checklist. */
export function PasswordStrength({ password }: { password: string }) {
  const passed = RULES.map((r) => r.test(password));
  const score = password ? passed.filter(Boolean).length : 0;
  const level = LEVELS[score]!;

  return (
    <AnimatePresence initial={false}>
      {password.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease }}
          className="overflow-hidden"
          aria-live="polite"
        >
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex flex-1 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.span
                      className={cn("block h-full rounded-full", level.bar)}
                      initial={false}
                      animate={{ width: i < score ? "100%" : "0%" }}
                      transition={{ duration: 0.35, ease }}
                    />
                  </span>
                ))}
              </div>
              <span className={cn("w-16 text-right text-xs font-semibold", level.text)}>{level.label}</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {RULES.map((rule, i) => (
                <li
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    passed[i] ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-3.5 w-3.5 place-items-center rounded-full transition-colors",
                      passed[i] ? "bg-success text-white" : "bg-muted",
                    )}
                  >
                    {passed[i] && <Check size={9} strokeWidth={3.5} aria-hidden />}
                  </span>
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
