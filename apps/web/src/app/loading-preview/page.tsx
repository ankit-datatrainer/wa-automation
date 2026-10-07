"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, RotateCw, Shield, User } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SegmentedTabs, ease } from "@/components/motion";

type Mode = "user" | "superadmin";

export default function LoadingPreviewPage() {
  const [mode, setMode] = useState<Mode>("user");
  const [key, setKey] = useState(0);

  const replay = (next: Mode) => {
    setMode(next);
    setKey((prev) => prev + 1);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-aurora">
      {/* Loading screen overlay — remounted on every replay */}
      <LoadingScreen key={key} isSuperAdmin={mode === "superadmin"} isLoading={false} minDurationMs={3200} />

      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <Logo href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <ArrowLeft size={15} aria-hidden />
            Home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease, delay: 3.6 }}
            className="surface w-full max-w-md space-y-6 p-6 text-center shadow-lift sm:p-8"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              {mode === "superadmin" ? <Shield size={24} aria-hidden /> : <User size={24} aria-hidden />}
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "superadmin" ? "Platform administration" : "Main dashboard"}{" "}
                <span className="text-gradient">loaded</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                The loading screen finished its sequence and faded into the page. Pick a variant and replay it.
              </p>
            </div>

            <div className="flex justify-center">
              <SegmentedTabs<Mode>
                layoutId="loading-preview-mode"
                value={mode}
                onChange={replay}
                tabs={[
                  { value: "user", label: "User" },
                  { value: "superadmin", label: "Super admin" },
                ]}
              />
            </div>

            <Button onClick={() => replay(mode)} className="w-full">
              <RotateCw size={16} aria-hidden />
              Replay {mode === "superadmin" ? "super admin" : "user"} loading
            </Button>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
