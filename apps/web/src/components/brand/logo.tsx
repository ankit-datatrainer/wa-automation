"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Squircle brand mark: Instagram-gradient tile with a chat bubble and spark. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0", className)}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <defs>
          <linearGradient id={`bm-g-${id}`} x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6D28D9" />
            <stop offset="0.45" stopColor="#833AB4" />
            <stop offset="0.8" stopColor="#C13584" />
            <stop offset="1" stopColor="#E1306C" />
          </linearGradient>
          <radialGradient id={`bm-h-${id}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 10) rotate(50) scale(40)">
            <stop stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#bm-g-${id})`} />
        <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#bm-h-${id})`} />
        <path
          d="M32 15c-9.94 0-18 7.16-18 16 0 4.3 1.9 8.2 5 11.08L17.5 49l7.6-3.3A19.7 19.7 0 0 0 32 47c9.94 0 18-7.16 18-16s-8.06-16-18-16Z"
          fill="#fff"
        />
        <path d="m24.5 31.5 5 5 10-10" stroke={`url(#bm-g-${id})`} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="49.5" cy="14.5" r="3.5" fill="#FCAF45" />
      </svg>
    </span>
  );
}

/** Mark + wordmark. Pass `href` to make it a link. */
export function Logo({
  className,
  markClassName,
  href,
  showWordmark = true,
  inverted = false,
}: {
  className?: string;
  markClassName?: string;
  href?: string;
  showWordmark?: boolean;
  inverted?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      {showWordmark && (
        <span
          className={cn(
            "font-display text-xl font-bold tracking-tight",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          WA<span className={inverted ? "text-white/80" : "text-gradient"}> Automation</span>
        </span>
      )}
    </span>
  );
  return href ? (
    <Link href={href} aria-label="WA Automation home" className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}
