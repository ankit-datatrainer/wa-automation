"use client";

import {
  BadgeCheck,
  ChevronDown,
  Download,
  Tag,
  TagsIcon,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { PopoverMenu, type GroupOption, type MenuItem, type OptInStatus, type TagOption } from "./ui";

export type BulkAction =
  | { action: "add_tags"; tagIds: string[] }
  | { action: "remove_tags"; tagIds: string[] }
  | { action: "add_groups"; groupIds: string[] }
  | { action: "set_opt_in"; optInStatus: OptInStatus };

const pill =
  "flex h-9 w-auto items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white/90 hover:bg-white/15 hover:text-white";

export function BulkBar({
  count,
  tags,
  groups,
  pending,
  onAction,
  onExport,
  onDelete,
  onClear,
}: {
  count: number;
  tags: TagOption[];
  groups: GroupOption[];
  pending: boolean;
  onAction: (action: BulkAction) => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const tagItems = (action: "add_tags" | "remove_tags"): MenuItem[] =>
    tags.length
      ? tags.map((tag) => ({
          label: tag.name,
          icon: Tag,
          onSelect: () => onAction({ action, tagIds: [tag.id] }),
        }))
      : [{ label: "No tags yet", onSelect: () => undefined, disabled: true }];

  const groupItems: MenuItem[] = groups.length
    ? groups.map((group) => ({
        label: group.name,
        icon: Users,
        onSelect: () => onAction({ action: "add_groups", groupIds: [group.id] }),
      }))
    : [{ label: "No groups yet", onSelect: () => undefined, disabled: true }];

  const optInItems: MenuItem[] = [
    { label: "Mark opted in", icon: UserPlus, onSelect: () => onAction({ action: "set_opt_in", optInStatus: "opted_in" }) },
    { label: "Mark opted out", icon: UserMinus, tone: "danger", onSelect: () => onAction({ action: "set_opt_in", optInStatus: "opted_out" }) },
    { label: "Mark unknown", icon: BadgeCheck, onSelect: () => onAction({ action: "set_opt_in", optInStatus: "unknown" }) },
  ];

  return (
    <AnimatePresence>
      {count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6">
          <motion.div
            role="toolbar"
            aria-label="Bulk actions"
            initial={{ y: 80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease }}
            className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-magenta p-1.5 pl-3 text-white shadow-[0_20px_50px_-12px_rgba(85,35,119,0.6)] ring-1 ring-white/10"
          >
            <span className="mr-1 flex items-center gap-2 text-sm font-semibold">
              <motion.span
                key={count}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="grid h-7 min-w-7 place-items-center rounded-lg bg-white px-1.5 text-xs font-bold text-brand-700"
              >
                {count}
              </motion.span>
              <span className="hidden sm:inline">selected</span>
              {pending && <Spinner className="h-4 w-4 text-white" />}
            </span>
            <span className="mx-1 hidden h-6 w-px bg-white/20 sm:block" />

            <PopoverMenu
              label="Add tag to selected"
              items={tagItems("add_tags")}
              align="start"
              triggerClassName={pill}
              trigger={
                <>
                  <Tag size={15} />
                  <span className="hidden md:inline">Add tag</span>
                  <ChevronDown size={13} className="opacity-70" />
                </>
              }
            />
            <PopoverMenu
              label="Remove tag from selected"
              items={tagItems("remove_tags")}
              align="start"
              triggerClassName={pill}
              trigger={
                <>
                  <TagsIcon size={15} />
                  <span className="hidden md:inline">Remove tag</span>
                  <ChevronDown size={13} className="opacity-70" />
                </>
              }
            />
            <PopoverMenu
              label="Add selected to group"
              items={groupItems}
              align="start"
              triggerClassName={pill}
              trigger={
                <>
                  <Users size={15} />
                  <span className="hidden md:inline">Group</span>
                  <ChevronDown size={13} className="opacity-70" />
                </>
              }
            />
            <PopoverMenu
              label="Change opt-in status of selected"
              items={optInItems}
              align="start"
              triggerClassName={pill}
              trigger={
                <>
                  <BadgeCheck size={15} />
                  <span className="hidden md:inline">Opt-in</span>
                  <ChevronDown size={13} className="opacity-70" />
                </>
              }
            />
            <button type="button" onClick={onExport} aria-label="Export selected" className={cn(pill, "transition")}>
              <Download size={15} />
              <span className="hidden md:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete selected"
              className={cn(pill, "transition hover:bg-rose-500/90")}
            >
              <Trash2 size={15} />
              <span className="hidden md:inline">Delete</span>
            </button>
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear selection"
              className="ml-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
