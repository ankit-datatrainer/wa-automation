"use client";

import { Fragment } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  Camera,
  CheckCheck,
  ChevronLeft,
  Copy,
  ExternalLink,
  FileText,
  ImageIcon,
  Mic,
  MoreVertical,
  Phone,
  Play,
  Plus,
  Reply,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TemplateDraft {
  header?: { format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"; text?: string };
  body: string;
  footer?: string;
  buttons: { type: string; text: string }[];
}

const WALLPAPER: React.CSSProperties = {
  backgroundColor: "#f7f3fb",
  backgroundImage:
    "radial-gradient(rgba(131,58,180,0.07) 1px, transparent 1px), radial-gradient(rgba(193,53,132,0.05) 1px, transparent 1px)",
  backgroundSize: "18px 18px, 18px 18px",
  backgroundPosition: "0 0, 9px 9px",
};

/**
 * Renders the template inside a phone mockup, the way WhatsApp will show it.
 * `samples` maps variable numbers to example values; unfilled ones show as chips.
 */
export function TemplatePreview({
  draft,
  samples,
  businessName = "Your business",
  className,
}: {
  draft: TemplateDraft;
  samples?: Record<string, string>;
  businessName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[320px] rounded-[2.75rem] border border-brand-100 bg-white p-2.5 shadow-lift",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[3.5rem] bg-brand-gradient opacity-[0.12] blur-3xl"
      />
      <div className="overflow-hidden rounded-[2.25rem] border border-border/70 bg-white">
        {/* Status bar */}
        <div className="relative flex items-center justify-between px-6 pb-1 pt-2.5 text-[11px] font-semibold text-foreground">
          <span>9:41</span>
          <span aria-hidden className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground/90" />
          <span className="flex items-center gap-1" aria-hidden>
            <span className="h-2 w-3.5 rounded-[3px] border border-foreground/70" />
          </span>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-2.5 border-b border-border/70 bg-white px-3 py-2.5">
          <ChevronLeft size={18} className="text-brand-600" aria-hidden />
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
            {businessName.trim().charAt(0).toUpperCase() || "B"}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-foreground">
              <span className="truncate">{businessName}</span>
              <BadgeCheck size={13} className="shrink-0 text-brand-600" aria-label="Verified business" />
            </p>
            <p className="text-[10.5px] text-muted-foreground">Business account</p>
          </div>
          <MoreVertical size={16} className="text-muted-foreground" aria-hidden />
        </div>

        {/* Conversation */}
        <div className="scrollbar-thin max-h-[440px] min-h-[380px] overflow-y-auto px-3 py-4" style={WALLPAPER}>
          <div className="mb-3 flex justify-center">
            <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
              Today
            </span>
          </div>
          <MessageBubble draft={draft} samples={samples} />
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-border/70 bg-white px-3 py-2.5" aria-hidden>
          <Plus size={18} className="text-brand-600" />
          <div className="flex h-8 flex-1 items-center justify-between rounded-full border border-border bg-muted/40 px-3 text-[11px] text-muted-foreground">
            Message
            <Smile size={14} />
          </div>
          <Camera size={17} className="text-muted-foreground" />
          <Mic size={17} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

/** The message bubble alone — used inside the phone and on gallery cards. */
export function MessageBubble({
  draft,
  samples,
  compact = false,
  className,
}: {
  draft: TemplateDraft;
  samples?: Record<string, string>;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-[280px] space-y-1", className)}>
      <motion.div
        layout={!compact}
        transition={{ duration: 0.25 }}
        className="relative rounded-xl rounded-tl-sm bg-white p-1.5 shadow-[0_1px_1.5px_rgba(40,16,70,0.12)]"
      >
        <span
          aria-hidden
          className="absolute -left-1.5 top-0 h-3 w-3 bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]"
        />
        {draft.header && <BubbleHeader header={draft.header} samples={samples} compact={compact} />}

        <div className="px-1.5 pb-0.5 pt-1">
          <p
            className={cn(
              "whitespace-pre-wrap break-words leading-relaxed text-foreground",
              compact ? "line-clamp-4 text-[12px]" : "text-[13px]",
            )}
          >
            {draft.body.trim() ? (
              <RichText text={draft.body} samples={samples} />
            ) : (
              <span className="text-muted-foreground">Your message body appears here…</span>
            )}
          </p>

          {draft.footer && (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{draft.footer}</p>
          )}

          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            10:24
            <CheckCheck size={13} className="text-sky-500" aria-hidden />
          </p>
        </div>

        {draft.buttons.length > 0 && (
          <div className="mt-1 divide-y divide-border/70 border-t border-border/70">
            <AnimatePresence initial={false}>
              {draft.buttons.slice(0, compact ? 2 : 10).map((button, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center gap-1.5 font-semibold text-brand-600",
                      compact ? "py-1.5 text-[11.5px]" : "py-2 text-[13px]",
                    )}
                  >
                    <ButtonIcon type={button.type} />
                    <span className="truncate">{button.text || "Button"}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {compact && draft.buttons.length > 2 && (
              <p className="py-1 text-center text-[10.5px] font-medium text-muted-foreground">
                +{draft.buttons.length - 2} more
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function BubbleHeader({
  header,
  samples,
  compact,
}: {
  header: NonNullable<TemplateDraft["header"]>;
  samples?: Record<string, string>;
  compact: boolean;
}) {
  if (header.format === "TEXT") {
    return (
      <p className="px-1.5 pt-1 text-[13.5px] font-bold leading-snug text-foreground">
        {header.text?.trim() ? (
          <RichText text={header.text} samples={samples} />
        ) : (
          <span className="text-muted-foreground">Header text</span>
        )}
      </p>
    );
  }

  if (header.format === "DOCUMENT") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-brand-50/80 p-2.5">
        <span className="grid h-9 w-8 place-items-center rounded-md bg-white text-brand-600 shadow-sm">
          <FileText size={16} />
        </span>
        <div className="min-w-0 text-[11px]">
          <p className="truncate font-semibold text-foreground">document.pdf</p>
          <p className="text-muted-foreground">PDF · attached at send time</p>
        </div>
      </div>
    );
  }

  const isVideo = header.format === "VIDEO";
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 via-brand-50 to-pink-50",
        compact ? "h-20" : "h-36",
      )}
    >
      <span aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-gradient opacity-25 blur-xl" />
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white/90 text-brand-600 shadow-soft">
        {isVideo ? <Play size={16} className="ml-0.5 fill-current" /> : <ImageIcon size={17} />}
      </span>
      <span className="absolute bottom-1.5 left-2 text-[9.5px] font-bold uppercase tracking-wider text-brand-700/70">
        {isVideo ? "Video" : "Image"}
      </span>
    </div>
  );
}

function ButtonIcon({ type }: { type: string }) {
  if (type === "URL") return <ExternalLink size={13} />;
  if (type === "PHONE_NUMBER") return <Phone size={13} />;
  if (type === "COPY_CODE") return <Copy size={13} />;
  return <Reply size={13} />;
}

/**
 * Renders WhatsApp formatting (*bold*, _italic_, ~strike~) and swaps {{n}}
 * for the sample value, or a highlighted chip when no sample is set.
 */
export function RichText({ text, samples }: { text: string; samples?: Record<string, string> }) {
  const parts = text.split(/(\{\{\d+\}\})/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^\{\{(\d+)\}\}$/.exec(part);
        if (match) {
          const sample = samples?.[match[1]!]?.trim();
          return sample ? (
            <span key={index} className="font-semibold text-brand-700">
              {sample}
            </span>
          ) : (
            <VariableChip key={index} n={match[1]!} />
          );
        }
        return <Fragment key={index}>{formatInline(part)}</Fragment>;
      })}
    </>
  );
}

export function VariableChip({ n }: { n: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center rounded-md bg-brand-50 px-1.5 py-px font-mono text-[0.85em] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
      {`{{${n}}}`}
    </span>
  );
}

function formatInline(text: string): React.ReactNode {
  const tokens = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return tokens.map((token, i) => {
    if (token.length > 2 && token.startsWith("*") && token.endsWith("*")) {
      return <strong key={i}>{token.slice(1, -1)}</strong>;
    }
    if (token.length > 2 && token.startsWith("_") && token.endsWith("_")) {
      return <em key={i}>{token.slice(1, -1)}</em>;
    }
    if (token.length > 2 && token.startsWith("~") && token.endsWith("~")) {
      return <s key={i}>{token.slice(1, -1)}</s>;
    }
    return <Fragment key={i}>{token}</Fragment>;
  });
}

export function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\d+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]!))].sort((a, b) => Number(a) - Number(b));
}
