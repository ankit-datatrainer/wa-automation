"use client";

import { useId } from "react";
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  Inbox,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const GROUP_META: Record<string, { label: string; icon: LucideIcon }> = {
  inbox: { label: "Inbox", icon: Inbox },
  contacts: { label: "Contacts", icon: Users },
  templates: { label: "Templates", icon: FileText },
  campaigns: { label: "Campaigns", icon: Megaphone },
  chatbots: { label: "Chatbots", icon: Bot },
  analytics: { label: "Analytics", icon: BarChart3 },
  billing: { label: "Billing", icon: CreditCard },
  admin: { label: "Administration", icon: ShieldCheck },
  settings: { label: "Settings", icon: Settings },
};

const ACTION_LABEL: Record<string, string> = {
  "inbox.view": "View conversations",
  "inbox.send": "Reply to customers",
  "inbox.assign": "Assign conversations",
  "contacts.view": "View contacts",
  "contacts.edit": "Create & edit contacts",
  "contacts.delete": "Delete contacts",
  "templates.view": "View templates",
  "templates.edit": "Create & edit templates",
  "campaigns.view": "View campaigns",
  "campaigns.send": "Launch campaigns",
  "chatbots.view": "View chatbots",
  "chatbots.edit": "Build & edit chatbots",
  "analytics.view": "View analytics",
  "billing.view": "View billing & wallet",
  "billing.manage": "Manage billing & top-ups",
  "admin.users": "Manage users & permissions",
  "admin.agents": "Manage agents",
  "settings.manage": "Manage workspace settings",
};

export function permissionLabel(permission: string) {
  return ACTION_LABEL[permission] ?? permission;
}

/** Groups a flat permission list by its prefix ("inbox.view" → "inbox"). */
export function groupPermissions(permissions: readonly string[]) {
  const groups = new Map<string, string[]>();
  for (const p of permissions) {
    const key = p.split(".")[0] ?? p;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

/** Grid of permission groups, each permission toggled with a Switch. */
export function PermissionMatrix({
  catalog,
  value,
  onChange,
  disabled,
}: {
  catalog: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const uid = useId();
  const set = new Set(value);
  const toggle = (permission: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(permission);
    else next.delete(permission);
    onChange(catalog.filter((p) => next.has(p)));
  };
  const setGroup = (items: string[], on: boolean) => {
    const next = new Set(set);
    for (const p of items) {
      if (on) next.add(p);
      else next.delete(p);
    }
    onChange(catalog.filter((p) => next.has(p)));
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {groupPermissions(catalog).map(([group, items]) => {
        const meta = GROUP_META[group] ?? { label: group, icon: ShieldCheck };
        const enabled = items.filter((p) => set.has(p)).length;
        const all = enabled === items.length;
        return (
          <div
            key={group}
            className={cn(
              "rounded-2xl border bg-white p-4 transition-colors",
              enabled > 0 && "border-brand-200 bg-brand-50/30",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-xl transition-colors",
                    enabled > 0 ? "bg-brand-gradient text-white shadow-glow" : "bg-muted text-muted-foreground",
                  )}
                >
                  <meta.icon size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{meta.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {enabled}/{items.length} enabled
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setGroup(items, !all)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-brand-50 disabled:opacity-50"
              >
                {all ? "Clear" : "All"}
              </button>
            </div>
            <ul className="space-y-2.5">
              {items.map((permission) => {
                const id = `${uid}-${permission.replace(/\W/g, "-")}`;
                return (
                  <li key={permission} className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="min-w-0 cursor-pointer text-sm text-foreground/90">
                      {permissionLabel(permission)}
                      <span className="block font-mono text-[10px] text-muted-foreground">{permission}</span>
                    </label>
                    <Switch
                      id={id}
                      checked={set.has(permission)}
                      disabled={disabled}
                      onCheckedChange={(on) => toggle(permission, on)}
                      aria-label={permissionLabel(permission)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
