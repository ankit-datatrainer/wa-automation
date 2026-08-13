"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";

export interface ShellSession {
  userName: string | null;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
  connectedPhone: string | null;
  isLive: boolean;
  unreadNotifications: number;
}

export function AppShell({
  session,
  children,
}: {
  session: ShellSession;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        userName={session.userName}
        permissions={session.permissions}
        isSuperAdmin={session.isSuperAdmin}
        role={session.role}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCreate={() => router.push("/campaigns/new")}
          unreadNotifications={session.unreadNotifications}
          isLive={session.isLive}
          connectedPhone={session.connectedPhone}
          userName={session.userName}
        />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
