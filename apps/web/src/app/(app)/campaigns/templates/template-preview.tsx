"use client";

import { ExternalLink, Phone, Reply } from "lucide-react";

export interface TemplateDraft {
  header?: { format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"; text?: string };
  body: string;
  footer?: string;
  buttons: { type: string; text: string }[];
}

/** Renders the template the way WhatsApp will, with {{n}} shown as sample text. */
export function TemplatePreview({ draft }: { draft: TemplateDraft }) {
  return (
    <div className="rounded-xl bg-[#e5ddd5] p-5 dark:bg-[#0b141a]">
      <div className="mx-auto max-w-xs space-y-1">
        <div className="rounded-lg rounded-tl-sm bg-white p-2.5 shadow-sm dark:bg-[#202c33]">
          {draft.header && (
            <div className="mb-2">
              {draft.header.format === "TEXT" ? (
                <p className="text-sm font-bold">{substitute(draft.header.text ?? "")}</p>
              ) : (
                <div className="grid h-28 place-items-center rounded-md bg-muted text-xs font-medium uppercase text-muted-foreground">
                  {draft.header.format}
                </div>
              )}
            </div>
          )}

          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {substitute(draft.body) || (
              <span className="text-muted-foreground">Your message body appears here...</span>
            )}
          </p>

          {draft.footer && (
            <p className="mt-2 text-[11px] text-muted-foreground">{draft.footer}</p>
          )}

          <p className="mt-1 text-right text-[10px] text-muted-foreground">12:00</p>
        </div>

        {draft.buttons.map((button, index) => (
          <div
            key={`${button.text}-${index}`}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white p-2.5 text-sm font-medium text-sky-600 shadow-sm dark:bg-[#202c33] dark:text-sky-400"
          >
            {button.type === "URL" && <ExternalLink size={14} />}
            {button.type === "PHONE_NUMBER" && <Phone size={14} />}
            {button.type === "QUICK_REPLY" && <Reply size={14} />}
            {button.text || "Button"}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Replaces {{1}}, {{2}}... with visible placeholders so spacing reads true. */
function substitute(text: string) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => `[value ${n}]`);
}

export function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\d+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]!))].sort((a, b) => Number(a) - Number(b));
}
