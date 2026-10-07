"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, LogOut, Menu, Plus, Search, Settings2, User } from "lucide-react";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  onOpenSearch: () => void;
  onOpenCreate: () => void;
  onOpenMenu: () => void;
  unreadNotifications: number;
  isLive: boolean;
  connectedPhone: string | null;
  userName: string | null;
}

export function Topbar({
  onOpenSearch,
  onOpenCreate,
  onOpenMenu,
  unreadNotifications,
  isLive,
  connectedPhone,
  userName,
}: TopbarProps) {
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setAccountOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const handleSignOut = async () => {
    setAccountOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.replace("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-white/75 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
      <div className="flex min-w-0 max-w-lg flex-1 items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white text-muted-foreground transition hover:text-foreground lg:hidden"
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-white/70 px-3.5 text-sm text-muted-foreground shadow-[0_1px_2px_rgba(40,16,70,0.04)] transition hover:border-brand-200 hover:bg-white"
        >
          <Search size={16} className="shrink-0 transition group-hover:text-primary" />
          <span className="min-w-0 flex-1 truncate text-left">
            <span className="sm:hidden">Search…</span>
            <span className="hidden sm:inline">Search pages, contacts, campaigns…</span>
          </span>
          <kbd className="hidden rounded-md border bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground sm:inline">
            Ctrl K
          </kbd>
        </button>

        <motion.button
          type="button"
          onClick={onOpenCreate}
          whileTap={{ scale: 0.95 }}
          className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 sm:flex"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create
        </motion.button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Link
          href="/manage/credentials"
          className={cn(
            "hidden items-center gap-2.5 rounded-xl border px-3 py-1.5 transition md:flex",
            isLive ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50" : "border-amber-200 bg-amber-50/60 hover:bg-amber-50",
          )}
        >
          <span className="relative flex h-2.5 w-2.5">
            {isLive && <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />}
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", isLive ? "bg-emerald-500" : "bg-amber-500")} />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold text-foreground">
              {isLive ? "WhatsApp connected" : "WhatsApp not connected"}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {connectedPhone ?? "Connect a number"}
            </span>
          </span>
        </Link>

        <Link
          href="/inbox"
          aria-label={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : "Notifications"}
          className="relative grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-brand-50 hover:text-primary"
        >
          <Bell size={19} />
          {unreadNotifications > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-pink px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((prev) => !prev)}
            aria-label="Account menu"
            aria-expanded={accountOpen}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-soft ring-2 ring-white transition hover:shadow-glow focus:outline-none focus-visible:ring-primary/40 active:scale-95"
          >
            {initials(userName, "A")}
          </button>

          <AnimatePresence>
            {accountOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border bg-white p-2 shadow-lift"
              >
                <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                    {initials(userName, "A")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{userName ?? "Your account"}</p>
                    <p className="text-xs text-muted-foreground">Manage profile & settings</p>
                  </div>
                </div>
                <div className="my-1 h-px bg-border" />
                <Link
                  href="/manage/profile"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700"
                >
                  <User size={17} className="text-muted-foreground" />
                  Profile
                </Link>
                <Link
                  href="/manage/credentials"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700"
                >
                  <Settings2 size={17} className="text-muted-foreground" />
                  WhatsApp credentials
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut size={17} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
