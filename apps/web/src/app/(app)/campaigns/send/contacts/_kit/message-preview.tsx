"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCheck,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Phone,
  Reply,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ease } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import {
  headerFormat,
  resolveBinding,
  templateBody,
  type SampleContact,
  type TemplateOption,
  type VariableBinding,
} from "./types";

interface MeLite {
  organization?: { name?: string | null } | null;
  waba?: { verifiedName?: string | null; displayPhone?: string | null } | null;
}

function useBusinessName() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeLite>("/me"),
    staleTime: 5 * 60_000,
  });
  return me.data?.waba?.verifiedName || me.data?.organization?.name || "Your business";
}

const BUTTON_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  URL: ExternalLink,
  PHONE_NUMBER: Phone,
  COPY_CODE: Copy,
  QUICK_REPLY: Reply,
};

function renderBody(
  text: string,
  bindings: Record<string, VariableBinding>,
  sample: SampleContact | null,
) {
  return text.split(/(\{\{\d+\}\})/g).map((part, i) => {
    const m = part.match(/^\{\{(\d+)\}\}$/);
    if (!m) return <span key={i}>{part}</span>;
    const resolved = resolveBinding(bindings[m[1]!], sample);
    return (
      <motion.span
        key={`${i}-${resolved.text}`}
        initial={{ backgroundColor: "rgba(193,53,132,0.22)" }}
        animate={{ backgroundColor: resolved.placeholder ? "rgba(131,58,180,0.10)" : "rgba(131,58,180,0.06)" }}
        transition={{ duration: 0.6 }}
        className={cn(
          "mx-0.5 rounded-md px-1 py-px font-semibold",
          resolved.placeholder ? "border border-dashed border-brand-300 text-brand-600" : "text-brand-800",
        )}
      >
        {resolved.text || `{{${m[1]}}}`}
      </motion.span>
    );
  });
}

export function MessagePreview({
  template,
  bindings,
  sample,
}: {
  template: TemplateOption | null;
  bindings: Record<string, VariableBinding>;
  sample: SampleContact | null;
}) {
  const business = useBusinessName();
  const format = headerFormat(template);
  const header = template?.components?.header;
  const footer = template?.components?.footer?.text;
  const buttons = template?.components?.buttons ?? [];
  // Computed after mount so server and client markup match.
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [template?.id]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Eye size={15} />
          </span>
          Live preview
        </span>
        {sample && (
          <span className="truncate text-xs text-muted-foreground">
            as <span className="font-semibold text-foreground">{sample.name || `+${sample.waId}`}</span>
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {/* Phone frame */}
        <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[28px] border-[6px] border-brand-900/90 bg-white shadow-lift">
          <div className="flex items-center gap-2.5 bg-brand-gradient px-3.5 py-2.5 text-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold ring-1 ring-white/40">
              {initials(business, "B")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight">{business}</p>
              <p className="text-[10px] text-white/75">Business account</p>
            </div>
          </div>

          <div className="bg-grid relative min-h-[300px] bg-brand-50/60 px-3 py-4">
            <AnimatePresence mode="wait" initial={false}>
              {!template ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center"
                >
                  <span className="grid h-14 w-14 animate-float place-items-center rounded-2xl bg-white text-brand-500 shadow-soft">
                    <Eye size={24} />
                  </span>
                  <p className="max-w-[200px] text-xs text-muted-foreground">
                    Choose a template to see exactly what your customers will receive.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.4, ease }}
                  className="max-w-[92%] space-y-1"
                >
                  <div className="overflow-hidden rounded-2xl rounded-tl-md bg-white text-[13px] shadow-[0_1px_2px_rgba(40,16,70,0.08)]">
                    {format && format !== "TEXT" && (
                      <div className="m-1.5 grid h-32 place-items-center rounded-xl bg-gradient-to-br from-brand-100 via-brand-50 to-white text-brand-400">
                        {format === "VIDEO" ? (
                          <Video size={28} />
                        ) : format === "DOCUMENT" ? (
                          <FileText size={28} />
                        ) : (
                          <ImageIcon size={28} />
                        )}
                      </div>
                    )}
                    <div className="space-y-1.5 px-3 pb-2 pt-2.5">
                      {format === "TEXT" && header?.text && (
                        <p className="font-semibold text-foreground">{header.text}</p>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {renderBody(templateBody(template), bindings, sample)}
                      </p>
                      {footer && <p className="text-[11px] text-muted-foreground">{footer}</p>}
                      <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        {time}
                        <CheckCheck size={13} className="text-brand-500" />
                      </p>
                    </div>
                    {buttons.length > 0 && (
                      <div className="divide-y divide-border/70 border-t border-border/70">
                        {buttons.map((b, i) => {
                          const Icon = BUTTON_ICON[b.type] ?? Reply;
                          return (
                            <div
                              key={`${b.text}-${i}`}
                              className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-brand-600"
                            >
                              <Icon size={13} />
                              {b.text}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Card>
  );
}
