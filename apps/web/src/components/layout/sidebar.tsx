"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import {
  navigation,
  platformNavigation,
  findActiveItem,
  type NavItem,
  type NavSection,
} from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";
import { BrandMark } from "@/components/brand/logo";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  userName: string | null;
  permissions: string[];
  role: string;
  isSuperAdmin: boolean;
  /** Rendered inside the mobile drawer: always expanded, no collapse button. */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed: collapsedProp,
  onToggleCollapse,
  userName,
  permissions,
  role,
  isSuperAdmin,
  variant = "desktop",
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const activeItem = findActiveItem(pathname);
  const collapsed = variant === "desktop" && collapsedProp;

  // Only the section containing the current route starts open.
  const [openSection, setOpenSection] = useState<string | null>(null);

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

  const displayName = userName?.trim() || "Account";

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-border/70 bg-white/80 backdrop-blur-xl transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        variant === "mobile" ? "w-[288px]" : collapsed ? "w-[80px]" : "w-[272px]",
      )}
    >
      <div className={cn("flex h-[72px] items-center px-5", collapsed ? "justify-center px-0" : "justify-between")}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 overflow-hidden">
          <BrandMark className="h-9 w-9" />
          {!collapsed && (
            <span className="truncate font-display text-lg font-bold tracking-tight">
              WA<span className="text-gradient"> Automation</span>
            </span>
          )}
        </Link>
        {variant === "desktop" && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      {variant === "desktop" && collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <PanelLeftOpen size={17} />
        </button>
      )}

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, index) => (
          <SidebarSection
            key={section.label ?? `top-${index}`}
            section={section}
            collapsed={collapsed}
            activeItem={activeItem}
            isOpen={section.label ? openSection === section.label : true}
            onToggle={() =>
              setOpenSection((current) =>
                current === section.label ? null : (section.label ?? null),
              )
            }
            canSee={canSee}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white shadow-glow">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} />
            Grow on WhatsApp
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/80">
            Launch a campaign to your tagged contacts in minutes.
          </p>
          <Link
            href="/campaigns/new"
            onClick={onNavigate}
            className="mt-3 inline-flex h-8 items-center rounded-lg bg-white/95 px-3 text-xs font-bold text-brand-700 transition hover:bg-white"
          >
            New campaign
          </Link>
        </div>
      )}

      <Link
        href="/manage/profile"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 border-t border-border/70 px-4 py-4 transition hover:bg-muted/50",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white ring-2 ring-white shadow-soft">
          {initials(userName, "A")}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{role || "member"}</p>
          </div>
        )}
      </Link>
    </aside>
  );
}

function SidebarSection({
  section,
  collapsed,
  activeItem,
  isOpen,
  onToggle,
  canSee,
  onNavigate,
}: {
  section: NavSection;
  collapsed: boolean;
  activeItem: NavItem | undefined;
  isOpen: boolean;
  onToggle: () => void;
  canSee: (permission?: string) => boolean;
  onNavigate?: () => void;
}) {
  const items = section.items.filter((item) => canSee(item.permission));
  if (items.length === 0) return null;

  // A collapsed rail shows every icon; there is no room for section headers.
  const expanded = collapsed || !section.collapsible || isOpen;
  const containsActive = !!activeItem && items.includes(activeItem);

  return (
    <div className={cn("mb-1", section.label && !collapsed && "mt-2")}>
      {section.label && !collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition hover:bg-muted",
            containsActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          {section.label}
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-300", !expanded && "-rotate-90")}
          />
        </button>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-0.5 overflow-hidden"
          >
            {items.map((item) => {
              const active = activeItem?.href === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "text-white" : "text-sidebar-foreground hover:bg-brand-50 hover:text-brand-700",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon
                      size={18}
                      className={cn(
                        "relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        !active && "text-muted-foreground group-hover:text-primary",
                      )}
                    />
                    {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "relative z-10 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
