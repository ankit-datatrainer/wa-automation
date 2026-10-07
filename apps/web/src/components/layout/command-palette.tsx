"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CornerDownLeft, Search } from "lucide-react";
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
      label="Search WA Automation"
      overlayClassName="fixed inset-0 z-50 bg-brand-900/25 backdrop-blur-sm animate-in fade-in"
      contentClassName="fixed left-1/2 top-[16%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-white shadow-lift animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-3 border-b px-5">
        <Search size={18} className="text-primary" />
        <Command.Input
          placeholder="Search pages, contacts, templates, campaigns..."
          className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">ESC</kbd>
      </div>
      <Command.List className="scrollbar-thin max-h-[22rem] overflow-y-auto p-2">
        <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
          No results found.
        </Command.Empty>

        {navigation.map((section, index) => (
          <Command.Group
            key={section.label ?? `top-${index}`}
            heading={section.label ?? "General"}
            className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.1em] [&_[cmdk-group-heading]]:text-muted-foreground"
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
                  className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-700"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground transition group-data-[selected=true]:bg-brand-gradient group-data-[selected=true]:text-white">
                    <Icon size={15} />
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  <CornerDownLeft size={14} className="opacity-0 group-data-[selected=true]:opacity-60" />
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
