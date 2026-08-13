"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import {
  navigation,
  platformNavigation,
  findActiveItem,
  type NavSection,
} from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  userName: string | null;
  permissions: string[];
  role: string;
  isSuperAdmin: boolean;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  userName,
  permissions,
  role,
  isSuperAdmin,
}: SidebarProps) {
  const pathname = usePathname();
  const activeItem = findActiveItem(pathname);

  // Only the section containing the current route starts open, matching the
  // reference behaviour where opening one group collapses the others.
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Platform administration is appended only for super admins.
  const sections = isSuperAdmin ? [...navigation, platformNavigation] : navigation;

  useEffect(() => {
    const section = sections.find(
      (s) => s.collapsible && activeItem && s.items.includes(activeItem),
    );
    if (section?.label) setOpenSection(section.label);
    // `sections` is derived from a boolean prop, so activeItem is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem, isSuperAdmin]);

  const canSee = (permission?: string) =>
    !permission || role === "owner" || role === "admin" || permissions.includes(permission);

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[280px]",
      )}
    >
      <div className="flex h-[72px] items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
            WA
          </span>
          {!collapsed && (
            <span className="truncate text-lg font-bold tracking-tight">
              WA <span className="text-primary">Automations</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, index) => (
          <SidebarSection
            key={section.label ?? `top-${index}`}
            section={section}
            collapsed={collapsed}
            pathname={pathname}
            isOpen={section.label ? openSection === section.label : true}
            onToggle={() =>
              setOpenSection((current) =>
                current === section.label ? null : (section.label ?? null),
              )
            }
            canSee={canSee}
          />
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t px-4 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(userName)}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName ?? "Account"}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{role}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarSection({
  section,
  collapsed,
  pathname,
  isOpen,
  onToggle,
  canSee,
}: {
  section: NavSection;
  collapsed: boolean;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  canSee: (permission?: string) => boolean;
}) {
  const items = section.items.filter((item) => canSee(item.permission));
  if (items.length === 0) return null;

  const expanded = !section.collapsible || isOpen;

  return (
    <div className="mb-1">
      {section.label && !collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted"
        >
          {section.label}
          <ChevronDown
            size={14}
            className={cn("transition-transform", !expanded && "-rotate-90")}
          />
        </button>
      )}

      {expanded && (
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-active text-sidebar-active-foreground"
                      : "text-sidebar-foreground hover:bg-muted",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        active
                          ? "bg-white/20 text-current"
                          : "bg-accent text-accent-foreground",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
