"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { cn } from "@/lib/utils";

function useEscape(open: boolean, onClose: () => void) {
  // Callers pass inline closures; read the latest through a ref so the scroll
  // lock isn't torn down and re-applied on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);
}

/**
 * Renders into document.body so fixed positioning isn't trapped by the app
 * shell's animated (transformed) page wrapper.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-50 bg-brand-900/25 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    />
  );
}

/** Centered dialog with a spring entrance. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEscape(open, onClose);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <Fragment key="modal">
            <Backdrop onClose={onClose} />
            {/* my-auto centres the dialog but lets a tall one scroll instead of clipping its top. */}
            <div className="pointer-events-none fixed inset-0 z-50 flex justify-center overflow-y-auto p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.35, ease }}
                className={cn(
                  "pointer-events-auto relative my-auto h-fit w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-lift",
                  className,
                )}
              >
                <div aria-hidden className="h-1 w-full bg-brand-gradient" />
                <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{title}</h2>
                    {description && (
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    )}
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
                <div className="px-6 pb-6 pt-3">{children}</div>
              </motion.div>
            </div>
          </Fragment>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Right-hand slide-over panel. */
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  useEscape(open, onClose);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <Fragment key="drawer">
            <Backdrop onClose={onClose} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={label}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-white shadow-lift"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X size={18} />
              </button>
              {children}
            </motion.aside>
          </Fragment>
        )}
      </AnimatePresence>
    </Portal>
  );
}
