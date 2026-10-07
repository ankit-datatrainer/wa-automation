"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const sidebarProps = {
    userName: session.userName,
    permissions: session.permissions,
    isSuperAdmin: session.isSuperAdmin,
    role: session.role,
  };

  return (
    <div className="bg-aurora flex h-screen overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} {...sidebarProps} />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-brand-900/30 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 flex lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <Sidebar
                variant="mobile"
                collapsed={false}
                onToggleCollapse={() => undefined}
                onNavigate={() => setMobileOpen(false)}
                {...sidebarProps}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCreate={() => router.push("/campaigns/new")}
          onOpenMenu={() => setMobileOpen(true)}
          unreadNotifications={session.unreadNotifications}
          isLive={session.isLive}
          connectedPhone={session.connectedPhone}
          userName={session.userName}
        />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
