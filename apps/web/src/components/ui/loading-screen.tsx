"use client";

import React, { useEffect, useState } from "react";
import { WALogo } from "./ai-green-tick-logo";
import { cn } from "@/lib/utils";

export interface LoadingScreenProps {
  /** Optional custom initial status title */
  statusText?: string;
  /** Whether the underlying page data is still loading */
  isLoading?: boolean;
  /** Callback fired once loading screen finishes and fades out */
  onFinish?: () => void;
  /** Minimum time to display the loading screen in milliseconds (default: 1800ms) */
  minDurationMs?: number;
  /** Whether this is for the Super Admin / Platform dashboard */
  isSuperAdmin?: boolean;
  /** Custom steps for loading progression */
  customSteps?: string[];
  /** Subtitle tagline */
  tagline?: string;
  /** Class name overrides for wrapper */
  className?: string;
  /** Fullscreen fixed overlay vs inline container */
  fullScreen?: boolean;
}

const DEFAULT_USER_STEPS = [
  "Initializing your workspace",
  "Loading messaging templates & reports...",
  "Connecting WhatsApp business services...",
  "Finalizing dashboard...",
];

const DEFAULT_SUPER_ADMIN_STEPS = [
  "Initializing platform dashboard",
  "Loading platform organizations & telemetry...",
  "Verifying global administrator access...",
  "Finalizing platform overview...",
];

export function LoadingScreen({
  statusText,
  isLoading = true,
  onFinish,
  minDurationMs = 1800,
  isSuperAdmin = false,
  customSteps,
  tagline = "Powering Your Customer Relationships",
  className,
  fullScreen = true,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(12);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const steps = customSteps ?? (isSuperAdmin ? DEFAULT_SUPER_ADMIN_STEPS : DEFAULT_USER_STEPS);

  // Compute active step based on progress
  const getStepText = (currentProgress: number) => {
    if (statusText) return statusText;
    if (currentProgress < 35) return steps[0];
    if (currentProgress < 68) return steps[1] ?? steps[0];
    if (currentProgress < 95) return steps[2] ?? steps[1] ?? steps[0];
    return steps[3] ?? steps[2] ?? "Workspace ready";
  };

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startTime;
        const timeRatio = Math.min(elapsed / minDurationMs, 1);

        // If underlying data is still fetching and we are near 90%, pause slightly
        if (isLoading && prev >= 88 && timeRatio < 1) {
          return Math.min(prev + 0.5, 92);
        }

        // If min duration elapsed and not loading, quickly jump to 100%
        if (!isLoading && elapsed >= minDurationMs) {
          return 100;
        }

        // Natural smooth ease-out progress calculation
        const targetProgress = Math.min(Math.round(timeRatio * 100), isLoading ? 92 : 100);
        const next = prev + Math.max(1, (targetProgress - prev) * 0.2);
        return Math.min(Math.round(next), 100);
      });
    }, 45);

    return () => {
      clearInterval(interval);
    };
  }, [isLoading, minDurationMs]);

  // Handle completion and smooth fade-out transition
  useEffect(() => {
    if (progress >= 100 && !isLoading) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const doneTimer = setTimeout(() => {
          setIsDone(true);
          onFinish?.();
        }, 500);
        return () => clearTimeout(doneTimer);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [progress, isLoading, onFinish]);

  if (isDone) return null;

  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-950 flex flex-col justify-between items-center select-none",
        fullScreen
          ? "fixed inset-0 z-50 transition-all duration-500 ease-out"
          : "relative min-h-[500px] w-full py-16",
        isFadingOut ? "opacity-0 pointer-events-none scale-[0.99]" : "opacity-100 scale-100",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(0, 194, 104, 0.08) 0%, rgba(34, 197, 94, 0.02) 60%, transparent 100%)",
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Top spacing */}
      <div className="w-full h-8" />

      {/* Center Branding & Progress Section */}
      <div className="flex flex-col items-center justify-center w-full max-w-md px-6 text-center -mt-6">
        {/* WA Automation Logo with Rosette badge and soft diffused emerald aura */}
        <WALogo size="lg" withGlow={true} />

        {/* Tagline */}
        <p className="mt-4 text-[13px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide">
          {tagline}
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-[340px] sm:max-w-[380px] mt-10">
          <div className="h-[6px] w-full bg-gray-200/80 dark:bg-zinc-800 rounded-full overflow-hidden p-[0.5px]">
            <div
              className="h-full bg-gradient-to-r from-[#00D26A] via-[#00C268] to-[#00A859] rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(0,194,104,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message & Three Animated Pulsing Dots */}
        <div className="mt-7 flex items-center justify-center gap-2 text-[13px] sm:text-sm font-medium text-gray-600 dark:text-gray-300 min-h-[24px]">
          {/* Animated 3 Green Pulsing Dots */}
          <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#00C268] animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-[#00C268] animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-[#00C268] animate-bounce" />
          </span>
          <span className="truncate">{getStepText(progress)}</span>
        </div>

        {/* Dynamic Percentage */}
        <div className="mt-2 text-sm sm:text-base font-bold text-[#00C268] tracking-tight">
          {progress}%
        </div>
      </div>

      {/* Bottom Home Indicator Bar matching the reference UI */}
      <div className="w-full flex justify-center pb-6">
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full opacity-80" />
      </div>
    </div>
  );
}
