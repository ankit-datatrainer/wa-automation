"use client";

import { AnimatePresence, motion } from "motion/react";
import { Phone, Type, UserRound, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ease } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
  defaultBinding,
  isBindingComplete,
  resolveBinding,
  type SampleContact,
  type VariableBinding,
  type VariableSource,
} from "./types";

const SOURCES: {
  value: VariableSource;
  label: string;
  short: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { value: "contact.name", label: "Contact name", short: "Name", icon: UserRound },
  { value: "contact.phone", label: "Phone number", short: "Phone", icon: Phone },
  { value: "custom", label: "Custom text", short: "Custom", icon: Type },
];

export function VariableMapper({
  variables,
  bindings,
  onChange,
  sample,
  hasTemplate,
}: {
  variables: string[];
  bindings: Record<string, VariableBinding>;
  onChange: (variable: string, binding: VariableBinding) => void;
  sample: SampleContact | null;
  hasTemplate: boolean;
}) {
  if (!hasTemplate) {
    return (
      <p className="rounded-xl bg-muted/60 px-4 py-5 text-center text-sm text-muted-foreground">
        Pick a template first — its placeholders will show up here.
      </p>
    );
  }

  if (variables.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3.5 text-sm text-brand-800">
        <Wand2 size={18} className="shrink-0" />
        This template has no variables — every recipient gets the same message.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variables.map((variable, index) => {
        const binding = bindings[variable] ?? defaultBinding(variable);
        const complete = isBindingComplete(binding);
        const resolved = resolveBinding(binding, sample);
        const inputId = `var-${variable}-value`;

        return (
          <motion.div
            key={variable}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease, delay: index * 0.05 }}
            className={cn(
              "rounded-2xl border p-4 transition-colors duration-200",
              complete ? "border-border/80 bg-white" : "border-amber-200 bg-amber-50/40",
            )}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3 lg:w-40 lg:shrink-0">
                <span className="rounded-lg bg-brand-gradient px-2.5 py-1 font-mono text-xs font-bold text-white shadow-glow">
                  {`{{${variable}}}`}
                </span>
                {!complete && (
                  <span className="text-xs font-semibold text-amber-700">Needs a value</span>
                )}
              </div>

              <div
                role="radiogroup"
                aria-label={`Source for variable ${variable}`}
                className="grid flex-1 grid-cols-3 gap-1 rounded-xl border bg-muted/50 p-1"
              >
                {SOURCES.map((s) => {
                  const active = binding.source === s.value;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChange(variable, { ...binding, source: s.value })}
                      className={cn(
                        "relative flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-[13px]",
                        active ? "text-brand-800" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={`var-source-${variable}`}
                          className="absolute inset-0 rounded-lg bg-white shadow-soft ring-1 ring-brand-200"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon size={14} />
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden">{s.short}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
              {binding.source === "custom" ? (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <label htmlFor={inputId} className="sr-only">
                      Text for variable {variable}
                    </label>
                    <Input
                      id={inputId}
                      value={binding.value}
                      maxLength={200}
                      onChange={(e) => onChange(variable, { ...binding, value: e.target.value })}
                      placeholder="Same text for every recipient, e.g. DIWALI20"
                      aria-invalid={!complete || undefined}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pt-3 text-xs text-muted-foreground"
                >
                  Filled per recipient.{" "}
                  {resolved.placeholder ? (
                    "Select a recipient to see an example."
                  ) : (
                    <>
                      e.g. <span className="font-semibold text-foreground">{resolved.text}</span>
                    </>
                  )}
                  {binding.source === "contact.name" && " Contacts without a name get “there”."}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
