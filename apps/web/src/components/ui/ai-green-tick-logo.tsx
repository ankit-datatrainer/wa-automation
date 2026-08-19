"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface WALogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  withGlow?: boolean;
}

export function WALogo({
  className,
  size = "lg",
  showTagline = false,
  withGlow = true,
}: WALogoProps) {
  const sizeConfig = {
    sm: {
      badgeSize: "w-8 h-8",
      textClass: "text-lg sm:text-xl",
      taglineClass: "text-xs",
      gap: "gap-2.5",
    },
    md: {
      badgeSize: "w-11 h-11",
      textClass: "text-2xl sm:text-3xl",
      taglineClass: "text-xs sm:text-sm",
      gap: "gap-3",
    },
    lg: {
      badgeSize: "w-14 h-14 sm:w-16 sm:h-16",
      textClass: "text-3xl sm:text-4xl lg:text-[40px]",
      taglineClass: "text-xs sm:text-sm",
      gap: "gap-3.5 sm:gap-4",
    },
    xl: {
      badgeSize: "w-18 h-18 sm:w-20 sm:h-20",
      textClass: "text-4xl sm:text-5xl lg:text-6xl",
      taglineClass: "text-sm sm:text-base",
      gap: "gap-4 sm:gap-5",
    },
  }[size];

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none", className)}>
      {/* Diffused green ambient glow behind the logo */}
      {withGlow && (
        <div
          className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-70 blur-3xl transition-opacity"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(34, 197, 94, 0.35) 0%, rgba(16, 185, 129, 0.18) 45%, rgba(34, 197, 94, 0) 75%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Main Logo: Rosette Badge + WA Automation Text */}
      <div className={cn("flex items-center justify-center", sizeConfig.gap)}>
        <RosetteBadge className={sizeConfig.badgeSize} />
        <div className="flex items-baseline tracking-tight font-extrabold gap-1.5">
          <span className={cn("font-black text-[#00C268]", sizeConfig.textClass)}>WA</span>
          <span
            className={cn(
              "font-black text-[#111827] dark:text-white tracking-tight",
              sizeConfig.textClass
            )}
          >
            Automation
          </span>
        </div>
      </div>

      {showTagline && (
        <p
          className={cn(
            "mt-3 text-center font-medium text-gray-500 dark:text-gray-400 tracking-wide",
            sizeConfig.taglineClass
          )}
        >
          Powering Your Customer Relationships
        </p>
      )}
    </div>
  );
}

// Alias for backward compatibility
export const AiGreenTickLogo = WALogo;

/**
 * High-fidelity 16-lobe rosette / verified badge SVG icon
 */
export function RosetteBadge({ className }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 flex items-center justify-center", className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-[0_2px_8px_rgba(0,194,104,0.35)]"
      >
        <defs>
          <linearGradient id="rosette-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D26A" />
            <stop offset="50%" stopColor="#00C268" />
            <stop offset="100%" stopColor="#00A859" />
          </linearGradient>
        </defs>

        {/* 16-Pointed Scalloped Rosette Outer Shape */}
        <path
          d="M 91.00 50.00 Q 104.72 60.88, 87.88 65.69 Q 96.39 80.99, 78.99 78.99 Q 80.99 96.39, 65.69 87.88 Q 60.88 104.72, 50.00 91.00 Q 39.12 104.72, 34.31 87.88 Q 19.01 96.39, 21.01 78.99 Q 3.61 80.99, 12.12 65.69 Q -4.72 60.88, 9.00 50.00 Q -4.72 39.12, 12.12 34.31 Q 3.61 19.01, 21.01 21.01 Q 19.01 3.61, 34.31 12.12 Q 39.12 -4.72, 50.00 9.00 Q 60.88 -4.72, 65.69 12.12 Q 80.99 3.61, 78.99 21.01 Q 96.39 19.01, 87.88 34.31 Q 104.72 39.12, 91.00 50.00 Z"
          fill="url(#rosette-fill)"
          stroke="#008B46"
          strokeWidth="1.2"
        />

        {/* Outer concentric white stitched / embossed ring */}
        <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="2.5" strokeOpacity="0.9" fill="none" />

        {/* Inner white circular plate */}
        <circle cx="50" cy="50" r="31" fill="#FFFFFF" />

        {/* Inner green circular accent line */}
        <circle cx="50" cy="50" r="26.5" stroke="#00C268" strokeWidth="2.2" fill="none" />

        {/* Green Checkmark */}
        <path
          d="M 37.5 50.5 L 45.8 58.8 L 62.5 41"
          stroke="#00C268"
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
