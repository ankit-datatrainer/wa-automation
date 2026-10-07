"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CHATBOT_TRIGGERS } from "@wa/types";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { type Chatbot, useFlows } from "./_components/data";
import { Modal } from "./_components/modal";
import { TRIGGERS } from "./_components/triggers";

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Give your chatbot a name (2+ characters)").max(120),
    description: z.string().max(500, "Keep the description under 500 characters"),
    triggerType: z.enum(CHATBOT_TRIGGERS),
    keywords: z.array(z.string()),
    flowId: z.string(),
    isActive: z.boolean(),
  })
  .refine((v) => v.triggerType !== "keyword" || !v.isActive || v.keywords.length > 0, {
    path: ["keywords"],
    message: "Add at least one keyword before activating a keyword chatbot.",
  })
  .refine((v) => !v.isActive || v.flowId !== "", {
    path: ["flowId"],
    message: "Pick a flow — an active chatbot needs something to run.",
  });

type FormValues = z.infer<typeof formSchema>;

function defaultsFor(chatbot: Chatbot | null | undefined): FormValues {
  const trigger = CHATBOT_TRIGGERS.find((t) => t === chatbot?.trigger_type) ?? "keyword";
  return {
    name: chatbot?.name ?? "",
    description: chatbot?.description ?? "",
    triggerType: trigger,
    keywords: chatbot?.trigger_config?.keywords ?? [],
    flowId: chatbot?.flow_id ?? "",
    isActive: chatbot?.is_active ?? false,
  };
}

/** Create / edit dialog for a chatbot's name, trigger, keywords and flow. */
export function ChatbotEditor({
  open,
  onClose,
  chatbot,
}: {
  open: boolean;
  onClose: () => void;
  /** Edits this chatbot; omitted to create a new one. */
  chatbot?: Chatbot | null;
}) {
  const queryClient = useQueryClient();
  const flows = useFlows();
  const editing = Boolean(chatbot);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaultsFor(chatbot) });

  useEffect(() => {
    if (open) reset(defaultsFor(chatbot));
  }, [open, chatbot, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name.trim(),
        triggerType: values.triggerType,
        triggerConfig: { keywords: values.keywords },
        flowId: values.flowId || null,
        isActive: values.isActive,
      };
      return chatbot
        ? api.patch(`/chatbots/${chatbot.id}`, { ...payload, description: values.description.trim() })
        : api.post("/chatbots", {
            ...payload,
            ...(values.description.trim() && { description: values.description.trim() }),
          });
    },
    onSuccess: () => {
      toast.success(editing ? "Chatbot updated" : "Chatbot created");
      void queryClient.invalidateQueries({ queryKey: ["chatbots"] });
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the chatbot"),
  });

  const triggerType = watch("triggerType");
  const flowRows = flows.data?.data ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Chatbot settings" : "New chatbot"}
      description={
        editing
          ? "Choose when this chatbot answers and which flow it runs."
          : "Pick a trigger and a flow — you can fine-tune the flow any time."
      }
      icon={<Bot size={20} />}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="chatbot-editor-form" loading={save.isPending}>
            {!save.isPending && <Check size={16} />}
            {editing ? "Save changes" : "Create chatbot"}
          </Button>
        </>
      }
    >
      <form
        id="chatbot-editor-form"
        onSubmit={handleSubmit((values) => save.mutate(values))}
        className="space-y-6"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name?.message}>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Order tracking assistant"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            )}
          </Field>
          <Field label="Flow to run" error={errors.flowId?.message} hint="Draft flows run too — publish when ready.">
            {({ id }) => (
              <Select id={id} aria-invalid={Boolean(errors.flowId)} {...register("flowId")}>
                <option value="">{flows.isLoading ? "Loading flows…" : "No flow yet"}</option>
                {flowRows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                    {flow.status !== "published" ? ` (${flow.status})` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Description" error={errors.description?.message}>
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              className="min-h-0"
              placeholder="What does this chatbot help customers with?"
              {...register("description")}
            />
          )}
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-foreground/90">Trigger</legend>
          <Controller
            control={control}
            name="triggerType"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Trigger" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {TRIGGERS.map((trigger) => {
                  const active = field.value === trigger.value;
                  const Icon = trigger.icon;
                  return (
                    <button
                      key={trigger.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => field.onChange(trigger.value)}
                      className={cn(
                        "relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        active
                          ? "border-primary/60 bg-brand-50/70 shadow-[0_0_0_3px_rgba(131,58,180,0.10)]"
                          : "border-border hover:border-brand-200 hover:bg-brand-50/30",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
                          active ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{trigger.label}</span>
                        <span className="block text-xs text-muted-foreground">{trigger.description}</span>
                      </span>
                      {active && (
                        <motion.span
                          layoutId="trigger-check"
                          className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-white"
                        >
                          <Check size={12} strokeWidth={3} />
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </fieldset>

        <AnimatePresence initial={false}>
          {triggerType === "keyword" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <Controller
                control={control}
                name="keywords"
                render={({ field }) => (
                  <KeywordInput
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.keywords?.message}
                  />
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-brand-50/30 p-4">
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-muted-foreground">
                  Active chatbots start answering customers immediately.
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Chatbot active"
              />
            </div>
          )}
        />

        {flowRows.length === 0 && !flows.isLoading && (
          <p className="text-xs text-muted-foreground">
            No flows yet.{" "}
            <Link href="/flows" className="font-semibold text-primary hover:underline">
              Build a flow
            </Link>{" "}
            or{" "}
            <Link href="/chatbots/library" className="font-semibold text-primary hover:underline">
              start from a template
            </Link>
            .
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Chip input: Enter or comma adds a keyword, Backspace on empty removes the last. */
function KeywordInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const additions = raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .filter((k) => !value.some((existing) => existing.toLowerCase() === k.toLowerCase()));
    if (additions.length) onChange([...value, ...additions]);
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="chatbot-keywords" className="text-sm font-semibold text-foreground/90">
        Keywords
      </label>
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
          error ? "border-destructive" : "border-input hover:border-brand-200",
        )}
      >
        <AnimatePresence initial={false}>
          {value.map((keyword) => (
            <motion.span
              key={keyword}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200"
            >
              {keyword}
              <button
                type="button"
                aria-label={`Remove keyword ${keyword}`}
                onClick={() => onChange(value.filter((k) => k !== keyword))}
                className="grid h-4 w-4 place-items-center rounded text-brand-700/70 hover:bg-brand-100 hover:text-brand-800"
              >
                <X size={11} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id="chatbot-keywords"
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            if (next.includes(",")) commit(next);
            else setDraft(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={value.length ? "Add another…" : "order, track, refund…"}
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add. Matching is case-insensitive and finds the word anywhere in the
          message.
        </p>
      )}
    </div>
  );
}
