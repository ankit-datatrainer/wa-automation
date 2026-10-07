"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, ease } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Accessible dialog used across the automation pages. Renders in a portal so a
 * transformed ancestor (page transitions) can never trap the fixed overlay.
 *
 * `side="right"` turns it into a slide-over drawer for detail views.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  side = "center",
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "center" | "right";
  size?: "sm" | "md" | "lg";
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first field (or the panel) once the enter animation starts.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input:not([type=hidden]):not([disabled]), textarea, select",
      );
      (target ?? panelRef.current)?.focus();
    }, 60);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-[80] flex",
            side === "center" ? "items-end justify-center p-0 sm:items-center sm:p-6" : "justify-end",
          )}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[rgba(30,12,52,0.38)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "relative flex w-full flex-col bg-white shadow-lift outline-none",
              side === "center"
                ? cn("max-h-[92vh] rounded-t-3xl sm:rounded-3xl", widths[size])
                : cn("h-full sm:max-w-lg", size === "lg" && "sm:max-w-2xl"),
            )}
            initial={side === "center" ? { opacity: 0, y: 28, scale: 0.97 } : { x: "100%" }}
            animate={side === "center" ? { opacity: 1, y: 0, scale: 1 } : { x: 0 }}
            exit={side === "center" ? { opacity: 0, y: 20, scale: 0.98 } : { x: "100%" }}
            transition={{ duration: 0.38, ease }}
          >
            <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
              {icon && (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                {description && <div className="text-sm text-muted-foreground">{description}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X size={18} />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-brand-50/30 px-5 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading} data-autofocus>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
    </Modal>
  );
}
