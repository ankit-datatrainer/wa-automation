"use client";

/**
 * Animated overlays for the platform console and tenant admin pages.
 *
 * Both `Sheet` and `Modal` are meant to be rendered conditionally inside an
 * `<AnimatePresence>` owned by the caller, e.g.
 *
 *   <AnimatePresence>{target && <Sheet key="x" onClose={...}>…</Sheet>}</AnimatePresence>
 *
 * so they animate out with the props they were last rendered with.
 */
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { X, type LucideIcon } from "lucide-react";
import { ease } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Open overlays, innermost last — only the top one reacts to Escape. */
const overlayStack: symbol[] = [];

function useOverlayBehaviour(onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = Symbol("overlay");
    overlayStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlayStack[overlayStack.length - 1] === id) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      const index = overlayStack.indexOf(id);
      if (index >= 0) overlayStack.splice(index, 1);
      if (overlayStack.length === 0) document.body.style.overflow = "";
    };
  }, []);
}

function OverlayHeader({
  title,
  description,
  icon: Icon,
  onClose,
  extra,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  onClose: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <header className="relative flex items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold tracking-tight">{title}</h2>
          {description && (
            <div className="truncate text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  );
}

/** Right-hand slide-over panel. */
export function Sheet({
  onClose,
  title,
  description,
  icon,
  headerExtra,
  children,
  footer,
  size = "md",
  bodyClassName,
}: {
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
  bodyClassName?: string;
}) {
  useOverlayBehaviour(onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.button
        type="button"
        aria-label="Close panel"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-brand-900/20 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        initial={{ x: "100%", opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.6 }}
        transition={{ duration: 0.42, ease }}
        className={cn(
          "relative flex h-full w-full flex-col border-l bg-white shadow-lift",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-xl",
          size === "xl" && "max-w-2xl",
        )}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
        <OverlayHeader
          title={title}
          description={description}
          icon={icon}
          onClose={onClose}
          extra={headerExtra}
        />
        <div className={cn("scrollbar-thin flex-1 overflow-y-auto p-5 sm:p-6", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <footer className="flex flex-wrap gap-3 border-t bg-brand-50/30 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </motion.aside>
    </div>
  );
}

/** Centred dialog. */
export function Modal({
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
}: {
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useOverlayBehaviour(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <motion.button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-brand-900/20 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.32, ease }}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border bg-white shadow-lift sm:rounded-3xl",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
        <OverlayHeader title={title} description={description} icon={icon} onClose={onClose} />
        {children && (
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        )}
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t bg-brand-50/30 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </motion.div>
    </div>
  );
}

/** Small yes/no confirmation dialog. */
export function ConfirmDialog({
  onClose,
  onConfirm,
  title,
  description,
  icon,
  confirmLabel = "Confirm",
  tone = "primary",
  loading,
  children,
}: {
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  confirmLabel?: string;
  tone?: "primary" | "destructive";
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>}
      {children}
    </Modal>
  );
}
