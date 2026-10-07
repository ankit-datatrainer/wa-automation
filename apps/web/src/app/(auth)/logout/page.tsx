"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ease } from "@/components/motion";

export default function LogoutPage() {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    // Offer a manual way out if signing out takes unusually long.
    const timer = setTimeout(() => setSlow(true), 4000);

    async function logout() {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Still send the user to the login screen; the middleware re-checks the session.
      } finally {
        router.replace("/login");
        router.refresh();
      }
    }
    void logout();
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="flex flex-col items-center gap-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative grid h-24 w-24 place-items-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-[3px] border-brand-100 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <LogOut size={26} aria-hidden />
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Signing you out</h1>
        <p className="text-[15px] text-muted-foreground">
          Securely ending your session. See you again soon.
        </p>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: slow ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        aria-hidden={!slow}
      >
        <Link
          href="/login"
          tabIndex={slow ? 0 : -1}
          className="rounded text-sm font-semibold text-primary hover:text-brand-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Taking a while? Go to sign in
        </Link>
      </motion.div>
    </motion.div>
  );
}
