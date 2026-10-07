"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, CreditCard, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, SegmentedTabs, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Sheet } from "../_components/overlay";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_cycle: "monthly" | "yearly";
  message_limit: number | null;
  contact_limit: number | null;
  agent_limit: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export function PlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(plan ? String(plan.price) : "");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(plan?.billing_cycle ?? "monthly");
  const [messageLimit, setMessageLimit] = useState(plan?.message_limit?.toString() ?? "");
  const [contactLimit, setContactLimit] = useState(plan?.contact_limit?.toString() ?? "");
  const [agentLimit, setAgentLimit] = useState(plan?.agent_limit?.toString() ?? "");
  const [features, setFeatures] = useState<string[]>(plan?.features ?? []);
  const [featureDraft, setFeatureDraft] = useState("");
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(String(plan?.sort_order ?? 0));

  const addFeature = () => {
    const value = featureDraft.trim();
    if (!value) return;
    setFeatures((current) => (current.includes(value) ? current : [...current, value]));
    setFeatureDraft("");
  };

  const save = useMutation({
    mutationFn: () => {
      const pending = featureDraft.trim();
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        billingCycle,
        messageLimit: messageLimit.trim() ? Number(messageLimit) : null,
        contactLimit: contactLimit.trim() ? Number(contactLimit) : null,
        agentLimit: agentLimit.trim() ? Number(agentLimit) : null,
        features: pending && !features.includes(pending) ? [...features, pending] : features,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      };
      return plan ? api.patch(`/platform/plans/${plan.id}`, body) : api.post("/platform/plans", body);
    },
    onSuccess: () => {
      toast.success(plan ? "Plan updated" : "Plan created");
      onSaved();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the plan"),
  });

  const numericPrice = Number(price);

  return (
    <Sheet
      onClose={onClose}
      icon={CreditCard}
      size="lg"
      title={plan ? "Edit plan" : "New plan"}
      description={plan ? `${plan.name} · ${plan.billing_cycle}` : "Define pricing and limits for a tier."}
      footer={
        <>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="plan-editor-form" className="flex-1" loading={save.isPending}>
            {!save.isPending && <Check size={16} />}
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </>
      }
    >
      <form
        id="plan-editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-5"
      >
        {/* Live preview */}
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-glow">
          <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <p className="relative text-xs font-semibold uppercase tracking-wider text-white/75">Preview</p>
          <p className="relative mt-1 font-display text-xl font-bold">{name.trim() || "Plan name"}</p>
          <p className="relative mt-1 font-display text-3xl font-bold">
            {Number.isFinite(numericPrice) && price !== "" ? formatCurrency(numericPrice) : "₹—"}
            <span className="text-sm font-medium text-white/75">/{billingCycle === "yearly" ? "year" : "month"}</span>
          </p>
        </div>

        <Field label="Plan name" required>
          {({ id }) => (
            <Input id={id} required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Growth" />
          )}
        </Field>

        <Field label="Description">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Best for growing teams running weekly broadcasts."
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Price (INR)" required>
            {({ id }) => (
              <Input
                id={id}
                required
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            )}
          </Field>
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-foreground/90">
              Billing cycle<span className="ml-0.5 text-brand-pink">*</span>
            </span>
            <SegmentedTabs
              layoutId="plan-billing-cycle"
              className="flex w-full [&>button]:flex-1 [&>button]:py-2"
              value={billingCycle}
              onChange={setBillingCycle}
              tabs={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Message limit" hint="Blank = unlimited">
            {({ id }) => (
              <Input id={id} type="number" min={1} step={1} value={messageLimit} onChange={(e) => setMessageLimit(e.target.value)} placeholder="∞" />
            )}
          </Field>
          <Field label="Contact limit" hint="Blank = unlimited">
            {({ id }) => (
              <Input id={id} type="number" min={1} step={1} value={contactLimit} onChange={(e) => setContactLimit(e.target.value)} placeholder="∞" />
            )}
          </Field>
          <Field label="Agent seats" hint="Blank = unlimited">
            {({ id }) => (
              <Input id={id} type="number" min={1} step={1} value={agentLimit} onChange={(e) => setAgentLimit(e.target.value)} placeholder="∞" />
            )}
          </Field>
        </div>

        <div className="space-y-2">
          <label htmlFor="plan-feature-input" className="text-sm font-semibold text-foreground/90">
            Features
          </label>
          <div className="flex gap-2">
            <Input
              id="plan-feature-input"
              value={featureDraft}
              onChange={(e) => setFeatureDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
              placeholder="e.g. Priority support"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Add feature"
              onClick={addFeature}
            >
              <Plus size={16} />
            </Button>
          </div>
          {features.length === 0 ? (
            <p className="text-xs text-muted-foreground">Press Enter to add each feature.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 pt-1">
              <AnimatePresence initial={false}>
                {features.map((feature) => (
                  <motion.li
                    key={feature}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200"
                  >
                    {feature}
                    <button
                      type="button"
                      aria-label={`Remove ${feature}`}
                      onClick={() => setFeatures((current) => current.filter((f) => f !== feature))}
                      className="grid h-5 w-5 place-items-center rounded-full text-brand-600 transition hover:bg-brand-200"
                    >
                      <X size={12} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sort order" hint="Lower numbers show first.">
            {({ id }) => (
              <Input id={id} type="number" step={1} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            )}
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 sm:self-end">
            <div>
              <p id="plan-active-label" className="text-sm font-semibold">
                Active
              </p>
              <p className="text-xs text-muted-foreground">Visible for assignment</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Plan active" />
          </div>
        </div>
      </form>
    </Sheet>
  );
}
