"use client";

import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";

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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    plan?.billing_cycle ?? "monthly",
  );
  const [messageLimit, setMessageLimit] = useState(plan?.message_limit?.toString() ?? "");
  const [contactLimit, setContactLimit] = useState(plan?.contact_limit?.toString() ?? "");
  const [agentLimit, setAgentLimit] = useState(plan?.agent_limit?.toString() ?? "");
  const [features, setFeatures] = useState(plan?.features.join("\n") ?? "");
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        billingCycle,
        messageLimit: messageLimit.trim() ? Number(messageLimit) : null,
        contactLimit: contactLimit.trim() ? Number(contactLimit) : null,
        agentLimit: agentLimit.trim() ? Number(agentLimit) : null,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        isActive,
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

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1 bg-black/40" />

      <aside className="flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-bold">{plan ? "Edit plan" : "New plan"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <Field label="Plan name" required>
              {({ id }) => (
                <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Growth" />
              )}
            </Field>

            <Field label="Description">
              {({ id }) => (
                <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (INR)" required>
                {({ id }) => (
                  <Input id={id} required type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                )}
              </Field>
              <Field label="Billing cycle" required>
                {({ id }) => (
                  <Select id={id} value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Message limit" hint="Blank = unlimited">
                {({ id }) => (
                  <Input id={id} type="number" min={1} value={messageLimit} onChange={(e) => setMessageLimit(e.target.value)} />
                )}
              </Field>
              <Field label="Contact limit">
                {({ id }) => (
                  <Input id={id} type="number" min={1} value={contactLimit} onChange={(e) => setContactLimit(e.target.value)} />
                )}
              </Field>
              <Field label="Agent seats">
                {({ id }) => (
                  <Input id={id} type="number" min={1} value={agentLimit} onChange={(e) => setAgentLimit(e.target.value)} />
                )}
              </Field>
            </div>

            <Field label="Features" hint="One per line">
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={5}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder={"5,000 contacts\nUnlimited chatbot flows\nPriority support"}
                />
              )}
            </Field>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (visible for assignment)
            </label>
          </div>

          <footer className="flex gap-3 border-t p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={save.isPending}>
              {plan ? "Save changes" : "Create plan"}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
