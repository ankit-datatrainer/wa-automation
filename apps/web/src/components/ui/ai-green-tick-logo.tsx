"use client";

import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/logo";

export interface WALogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  withGlow?: boolean;
}

/** Large stacked logo used by the loading screen. Prefer `Logo` from components/brand elsewhere. */
export function WALogo({ className, size = "lg", showTagline = false, withGlow = true }: WALogoProps) {
  const cfg = {
    sm: { mark: "h-8 w-8", text: "text-lg", gap: "gap-2.5" },
    md: { mark: "h-11 w-11", text: "text-2xl", gap: "gap-3" },
    lg: { mark: "h-14 w-14", text: "text-3xl sm:text-4xl", gap: "gap-3.5" },
    xl: { mark: "h-20 w-20", text: "text-4xl sm:text-5xl", gap: "gap-4" },
  }[size];

  return (
    <div className={cn("relative flex select-none flex-col items-center justify-center", className)}>
      {withGlow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(131,58,180,0.28) 0%, rgba(225,48,108,0.12) 45%, transparent 75%)",
          }}
        />
      )}
      <div className={cn("flex items-center", cfg.gap)}>
        <BrandMark className={cfg.mark} />
        <span className={cn("font-display font-bold tracking-tight text-foreground", cfg.text)}>
          WA<span className="text-gradient"> Automation</span>
        </span>
      </div>
      {showTagline && (
        <p className="mt-3 text-sm font-medium text-muted-foreground">Powering Your Customer Relationships</p>
      )}
    </div>
  );
}

export const AiGreenTickLogo = WALogo;

/** Kept for existing imports; renders the new brand mark. */
export function RosetteBadge({ className }: { className?: string }) {
  return <BrandMark className={className} />;
}
