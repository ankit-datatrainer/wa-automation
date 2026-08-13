"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { navigation } from "@/lib/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search WA Automations"
      className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-background shadow-2xl"
    >
      <Command.Input
        placeholder="Search pages, contacts, templates, campaigns..."
        className="w-full border-b bg-transparent px-5 py-4 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Command.List className="scrollbar-thin max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
          No results found.
        </Command.Empty>

        {navigation.map((section, index) => (
          <Command.Group
            key={section.label ?? `top-${index}`}
            heading={section.label ?? "General"}
            className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.href}
                  value={`${section.label ?? ""} ${item.label}`}
                  onSelect={() => {
                    router.push(item.href);
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <Icon size={16} />
                  {item.label}
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
