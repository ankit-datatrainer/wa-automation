"use client";

import { Bell, Phone, Plus, Search } from "lucide-react";
import { cn, initials } from "@/lib/utils";

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
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-4 border-b bg-background px-6">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-11 w-full max-w-sm items-center gap-3 rounded-xl border bg-muted/40 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search size={18} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 text-[11px] font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenCreate}
        className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus size={18} />
        Create
      </button>

      <div className="flex-1" />

      <span
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
          isLive
            ? "border-primary/30 bg-accent text-accent-foreground"
            : "border-destructive/30 bg-destructive/10 text-destructive",
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isLive ? "animate-pulse bg-primary" : "bg-destructive",
          )}
        />
        {isLive ? "Live" : "Offline"}
      </span>

      <button
        type="button"
        aria-label={`Notifications (${unreadNotifications} unread)`}
        className="relative grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <Bell size={20} />
        {unreadNotifications > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </button>

      {connectedPhone && (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-2 shadow-sm">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Phone size={18} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">WhatsApp Connected</p>
            <p className="text-xs text-muted-foreground">{connectedPhone}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="Account menu"
        className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
      >
        {initials(userName, "A")}
      </button>
    </header>
  );
}
