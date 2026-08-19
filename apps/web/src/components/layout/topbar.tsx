"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Phone, Plus, Search, User } from "lucide-react";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  onOpenSearch: () => void;
  onOpenCreate: () => void;
  unreadNotifications: number;
  isLive: boolean;
  connectedPhone: string | null;
  userName: string | null;
}

export function Topbar({
  onOpenSearch,
  onOpenCreate,
  unreadNotifications,
  isLive,
  connectedPhone,
  userName,
}: TopbarProps) {
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  const displayPhone = connectedPhone || "+919266806659";

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b bg-white px-6">
      {/* Left side: Search & Create */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-10 flex-1 items-center gap-3 rounded-xl border border-gray-200/80 bg-gray-50/50 px-3.5 text-xs text-gray-500 transition-colors hover:bg-gray-100/80"
        >
          <Search size={16} className="text-gray-400" />
          <span className="flex-1 text-left font-medium">Search...</span>
          <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenCreate}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#00ab5c] active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create
        </button>
      </div>

      {/* Right side: Notifications, WhatsApp Connected, Account Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Bell size={19} className="text-gray-600" />
          <span className="absolute 1.5 top-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
            1
          </span>
        </button>

        {/* WhatsApp Connected Card */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-3 py-1.5 shadow-xs">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#00C268] text-white shrink-0 shadow-2xs">
            <Phone size={15} />
          </span>
          <div className="leading-none pr-1">
            <p className="text-xs font-bold text-gray-900">WhatsApp Connected</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">{displayPhone}</p>
          </div>
        </div>

        {/* Account Popover Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((prev) => !prev)}
            aria-label="Account menu"
            aria-expanded={accountOpen}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#00C268] text-sm font-bold text-white shadow-xs transition-transform active:scale-95 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#00C268]/30"
          >
            {userName && !userName.toLowerCase().includes("demo") ? initials(userName, "A") : "A"}
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border bg-card p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b pb-3 mb-2">
                <p className="font-bold text-base text-foreground">Account</p>
                <p className="text-xs text-muted-foreground">Manage your profile and settings</p>
              </div>

              <div className="space-y-1">
                <Link
                  href="/manage/profile"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <User size={18} className="text-muted-foreground" />
                  <span>Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
