"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock,
  Info,
  LayoutTemplate,
  ListChecks,
  Megaphone,
  Rocket,
  TriangleAlert,
  Users,
  Variable,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Stagger, StaggerItem, ease } from "@/components/motion";
import { cn } from "@/lib/utils";
import { DeliveryPicker, deliveryError, deliveryLabel, type DeliveryState } from "./delivery-picker";
import { ConfirmLaunchDialog, LaunchResult, useLaunchCampaign, type LaunchOutcome } from "./launch";
import { MessagePreview } from "./message-preview";
import { RollingNumber, StepCard, StepProgress, SummaryRow } from "./send-ui";
import { TemplatePicker } from "./template-picker";
import {
  defaultBinding,
  extractVariables,
  isBindingComplete,
  isUuid,
  templateBody,
  toVariableMapping,
  type AudienceKind,
  type SampleContact,
  type TemplateOption,
  type VariableBinding,
} from "./types";
import { VariableMapper } from "./variable-mapper";

export interface AudienceState {
  /** True once the user has picked at least one recipient / tag. */
  ready: boolean;
  /** Reason the current selection cannot be sent, if any. */
  blocker?: string | null;
  recipientCount: number;
  /** True when the count is an upper bound / estimate. */
  approximate?: boolean;
  /** e.g. "12 contacts" or "3 tags". */
  summary: string;
  config: Record<string, unknown>;
}

export function CampaignComposer({
  audienceType,
  title,
  description,
  audienceTitle,
  audienceDescription,
  audienceActions,
  audienceContent,
  audience,
  sample,
  onReset,
}: {
  audienceType: AudienceKind;
  title: string;
  description: string;
  audienceTitle: string;
  audienceDescription: string;
  audienceActions?: React.ReactNode;
  audienceContent: React.ReactNode;
  audience: AudienceState;
  sample: SampleContact | null;
  onReset: () => void;
}) {
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [template, setTemplate] = useState<TemplateOption | null>(null);
  const [bindings, setBindings] = useState<Record<string, VariableBinding>>({});
  const [delivery, setDelivery] = useState<DeliveryState>({ mode: "now", at: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcome, setOutcome] = useState<LaunchOutcome | null>(null);

  const launch = useLaunchCampaign((result) => {
    setConfirmOpen(false);
    setOutcome(result);
  });

  const variables = useMemo(() => extractVariables(templateBody(template)), [template]);
  const mappedCount = variables.filter((v) => isBindingComplete(bindings[v] ?? defaultBinding(v))).length;

  const trimmedName = name.trim();
  const nameError =
    trimmedName.length < 2
      ? "Give your campaign a name (at least 2 characters)."
      : trimmedName.length > 120
        ? "Keep the name under 120 characters."
        : null;
  const sampleTemplate = !!template && !isUuid(template.id);
  const schedError = deliveryError(delivery);

  const detailsDone = !nameError && !!template && !sampleTemplate;
  const audienceDone = audience.ready && !audience.blocker && audience.recipientCount > 0;
  const personalizeDone = !!template && mappedCount === variables.length;
  const deliveryDone = !schedError;

  const blockers = [
    nameError,
    !template ? "Choose an approved template." : null,
    sampleTemplate
      ? "This is a sample template. Create and get your own template approved to send campaigns."
      : null,
    audience.blocker ?? null,
    !audience.ready
      ? audienceType === "tags"
        ? "Select at least one tag."
        : "Select at least one recipient."
      : audience.recipientCount === 0 && !audience.blocker
        ? "The selected audience has no reachable contacts."
        : null,
    template && !personalizeDone ? "Fill in every template variable." : null,
    schedError,
  ].filter((b): b is string => !!b);

  const canLaunch = blockers.length === 0;

  const selectTemplate = (t: TemplateOption) => {
    setTemplate(t);
    const next: Record<string, VariableBinding> = {};
    for (const v of extractVariables(templateBody(t))) next[v] = bindings[v] ?? defaultBinding(v);
    setBindings(next);
  };

  const confirm = () => {
    if (!template || !canLaunch) return;
    launch.mutate({
      name: trimmedName,
      templateId: template.id,
      audienceType,
      audienceConfig: audience.config,
      variableMapping: toVariableMapping(variables, bindings),
      scheduledAt: delivery.mode === "schedule" ? new Date(delivery.at).toISOString() : null,
    });
  };

  const reset = () => {
    setOutcome(null);
    setName("");
    setNameTouched(false);
    setTemplate(null);
    setBindings({});
    setDelivery({ mode: "now", at: "" });
    launch.reset();
    onReset();
  };

  const recipientText = `${audience.approximate ? "≈ " : ""}${audience.recipientCount.toLocaleString()}`;

  return (
    <div className="pb-10">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link href="/campaigns/history" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ListChecks size={15} />
            Campaign history
          </Link>
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {outcome ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease }}
          >
            <LaunchResult outcome={outcome} onReset={reset} />
          </motion.div>
        ) : (
          <motion.div
            key="composer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease }}
          >
            <StepProgress
              steps={[
                { label: "Details", complete: detailsDone },
                { label: "Audience", complete: audienceDone },
                { label: "Personalize", complete: personalizeDone },
                { label: "Delivery", complete: deliveryDone },
              ]}
            />

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <Stagger className="min-w-0 space-y-6" stagger={0.08}>
                <StaggerItem>
                  <StepCard
                    step={1}
                    title="Campaign details"
                    description="Name it for your reports, then choose an approved template."
                    complete={detailsDone}
                  >
                    <div className="space-y-5">
                      <Field
                        label="Campaign name"
                        required
                        error={nameTouched && nameError ? nameError : undefined}
                        hint="Only you see this — it's used in history and analytics."
                      >
                        {({ id }) => (
                          <Input
                            id={id}
                            value={name}
                            maxLength={120}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setNameTouched(true)}
                            placeholder="e.g. Diwali offer — VIP customers"
                            aria-invalid={(nameTouched && !!nameError) || undefined}
                          />
                        )}
                      </Field>

                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                          <LayoutTemplate size={15} className="text-brand-500" />
                          Template <span className="text-brand-pink">*</span>
                        </p>
                        <TemplatePicker
                          value={template?.id ?? ""}
                          onChange={selectTemplate}
                          layoutId={`${audienceType}-template-category`}
                        />
                        <AnimatePresence>
                          {sampleTemplate && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex items-start gap-2 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800"
                            >
                              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                              <span>
                                This is a built-in sample template and can't be sent.{" "}
                                <Link href="/campaigns/templates" className="font-semibold underline underline-offset-2">
                                  Create your own template
                                </Link>{" "}
                                and get it approved by Meta first.
                              </span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </StepCard>
                </StaggerItem>

                <StaggerItem>
                  <StepCard
                    step={2}
                    title={audienceTitle}
                    description={audienceDescription}
                    complete={audienceDone}
                    actions={audienceActions}
                  >
                    {audienceContent}
                  </StepCard>
                </StaggerItem>

                <StaggerItem>
                  <StepCard
                    step={3}
                    title="Personalize"
                    description="Decide what fills each {{placeholder}} in the template."
                    complete={personalizeDone}
                  >
                    <VariableMapper
                      variables={variables}
                      bindings={bindings}
                      hasTemplate={!!template}
                      sample={sample}
                      onChange={(v, b) => setBindings((cur) => ({ ...cur, [v]: b }))}
                    />
                  </StepCard>
                </StaggerItem>

                <StaggerItem>
                  <StepCard
                    step={4}
                    title="Delivery"
                    description="Send right away or pick the perfect moment."
                    complete={deliveryDone}
                  >
                    <DeliveryPicker
                      value={delivery}
                      onChange={setDelivery}
                      layoutId={`${audienceType}-delivery-mode`}
                    />
                  </StepCard>
                </StaggerItem>
              </Stagger>

              <motion.aside
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.15 }}
                className="scrollbar-thin grid grid-cols-1 min-w-0 gap-6 md:grid-cols-2 xl:sticky xl:top-6 xl:-mx-1 xl:block xl:max-h-[calc(100vh-72px-3rem)] xl:space-y-6 xl:overflow-y-auto xl:px-1 xl:pb-2"
                aria-label="Preview and summary"
              >
                <MessagePreview template={template} bindings={bindings} sample={sample} />

                <Card className="overflow-hidden">
                  <div className="relative overflow-hidden bg-brand-gradient px-5 py-5 text-white">
                    <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                      {audience.approximate ? "Estimated recipients" : "Recipients"}
                    </p>
                    <p className="mt-1 flex items-baseline gap-2 font-display text-4xl font-bold">
                      {audience.approximate && <span className="text-2xl text-white/80">≈</span>}
                      <RollingNumber value={audience.recipientCount} />
                    </p>
                    <p className="mt-1 text-xs text-white/80">Opted-out contacts are always excluded.</p>
                  </div>

                  <div className="divide-y divide-border/70 px-5">
                    <SummaryRow icon={<Megaphone size={14} />} label="Campaign">
                      {trimmedName || <span className="font-normal text-muted-foreground">Untitled</span>}
                    </SummaryRow>
                    <SummaryRow icon={<LayoutTemplate size={14} />} label="Template">
                      {template ? (
                        <span className="font-mono text-[13px]">{template.name}</span>
                      ) : (
                        <span className="font-normal text-muted-foreground">Not selected</span>
                      )}
                    </SummaryRow>
                    <SummaryRow icon={<Users size={14} />} label="Audience">
                      {audience.ready ? audience.summary : <span className="font-normal text-muted-foreground">None yet</span>}
                    </SummaryRow>
                    <SummaryRow icon={<Variable size={14} />} label="Variables">
                      {template ? (
                        variables.length === 0 ? (
                          "None needed"
                        ) : (
                          <span className={cn(mappedCount < variables.length && "text-amber-700")}>
                            {mappedCount}/{variables.length} mapped
                          </span>
                        )
                      ) : (
                        <span className="font-normal text-muted-foreground">—</span>
                      )}
                    </SummaryRow>
                    <SummaryRow icon={<CalendarClock size={14} />} label="Delivery">
                      {deliveryLabel(delivery)}
                    </SummaryRow>
                  </div>

                  <div className="space-y-3 p-5 pt-3">
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={!canLaunch}
                      onClick={() => setConfirmOpen(true)}
                    >
                      <Rocket size={18} />
                      {delivery.mode === "now" ? "Review & send" : "Review & schedule"}
                    </Button>
                    <AnimatePresence mode="wait" initial={false}>
                      {blockers[0] && (
                        <motion.p
                          key={blockers[0]}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <Info size={14} className="mt-px shrink-0 text-brand-500" />
                          {blockers[0]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmLaunchDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirm}
        loading={launch.isPending}
        mode={delivery.mode}
        recipientLabel={
          <>
            {recipientText}{" "}
            <span className="text-base font-semibold text-white/80">
              contact{audience.recipientCount === 1 ? "" : "s"}
            </span>
          </>
        }
        rows={[
          { label: "Campaign", value: trimmedName },
          { label: "Template", value: <span className="font-mono">{template?.name ?? "—"}</span> },
          { label: "Audience", value: audience.summary },
          { label: "Variables", value: variables.length ? `${variables.length} mapped` : "None" },
          { label: "Delivery", value: deliveryLabel(delivery) },
        ]}
        notes={[
          "Contacts who opted out are skipped automatically.",
          "The audience is locked in when you confirm — later changes to contacts don't affect this campaign.",
          ...(audience.approximate
            ? ["The final count removes duplicates and opted-out contacts, so it may be lower than the estimate."]
            : []),
        ]}
      />
    </div>
  );
}
