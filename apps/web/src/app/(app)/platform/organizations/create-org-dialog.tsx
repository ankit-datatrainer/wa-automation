"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Check, Copy, Eye, EyeOff, PartyPopper, RefreshCw, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence, ease } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Sheet } from "../_components/overlay";
import type { Plan } from "../plans/plan-editor";

/** Generates a password that's random but still readable enough to hand off. */
function generatePassword(): string {
  const words = ["Coral", "Amber", "Willow", "Cedar", "Onyx", "Ivory", "Slate", "Ember"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!wa`;
}

export function CreateOrgDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [planId, setPlanId] = useState("");
  const [cycleCount, setCycleCount] = useState("1");
  const [created, setCreated] = useState<{ email: string; password: string; org: string } | null>(null);

  const plans = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<{ data: Plan[] }>("/platform/plans"),
  });

  const selectedPlan = plans.data?.data.find((p) => p.id === planId);

  const create = useMutation({
    mutationFn: () =>
      api.post("/platform/organizations", {
        organizationName: organizationName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        ...(planId && { planId, cycleCount: Number(cycleCount) || 1 }),
      }),
    onSuccess: () => {
      setCreated({ email: email.trim(), password, org: organizationName.trim() });
      toast.success("Organization created");
      onCreated();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the organization"),
  });

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Could not copy"),
    );
  };

  return (
    <Sheet
      onClose={onClose}
      icon={Building2}
      title={created ? "Organization ready" : "New organization"}
      description={created ? created.org : "Create a tenant and its owner account in one step."}
      footer={
        created ? (
          <Button className="w-full" onClick={onClose}>
            <Check size={16} />
            Done
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="create-org-form" className="flex-1" loading={create.isPending}>
              {!create.isPending && <UserPlus size={16} />}
              Create organization
            </Button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {created ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease }}
            className="space-y-5"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-brand-50/60 p-6 text-center">
              <motion.span
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
              >
                <PartyPopper size={24} />
              </motion.span>
              <p className="text-sm text-muted-foreground">
                Share these credentials with the customer. The password is shown only once.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border bg-white p-4 shadow-soft">
              <CredentialRow label="Email" value={created.email} onCopy={copy} />
              <div className="h-px bg-border" />
              <CredentialRow label="Password" value={created.password} onCopy={copy} secret />
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            id="create-org-form"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="space-y-5"
          >
            <fieldset className="space-y-4">
              <legend className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Business
              </legend>
              <Field label="Business name" required>
                {({ id }) => (
                  <Input
                    id={id}
                    required
                    minLength={2}
                    maxLength={120}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Acme Retail"
                    autoFocus
                  />
                )}
              </Field>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Owner account
              </legend>
              <Field label="Owner name" required>
                {({ id }) => (
                  <Input id={id} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                )}
              </Field>

              <Field label="Owner email" required>
                {({ id }) => (
                  <Input
                    id={id}
                    required
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@company.com"
                  />
                )}
              </Field>

              <Field label="Password" required hint="Auto-generated — at least 8 characters. You can change it.">
                {({ id }) => (
                  <div className="flex gap-2">
                    <PasswordInput
                      id={id}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      aria-label="Generate a new password"
                      title="Generate a new password"
                      onClick={() => setPassword(generatePassword())}
                    >
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                )}
              </Field>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Subscription
              </legend>
              <Field label="Plan" hint="Optional — leave blank to start on a 30-day trial.">
                {({ id }) =>
                  plans.isLoading ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <Select id={id} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                      <option value="">No plan (trial)</option>
                      {plans.data?.data
                        .filter((p) => p.is_active)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {formatCurrency(Number(p.price), p.currency)}/
                            {p.billing_cycle === "yearly" ? "yr" : "mo"}
                          </option>
                        ))}
                    </Select>
                  )
                }
              </Field>

              <AnimatePresence initial={false}>
                {planId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease }}
                    className="overflow-hidden"
                  >
                    <Field
                      label={`Duration (${selectedPlan?.billing_cycle === "yearly" ? "years" : "months"})`}
                      hint={
                        selectedPlan
                          ? `${formatCurrency(Number(selectedPlan.price) * (Number(cycleCount) || 1), selectedPlan.currency)} total`
                          : undefined
                      }
                    >
                      {({ id }) => (
                        <Input
                          id={id}
                          type="number"
                          min={1}
                          max={60}
                          value={cycleCount}
                          onChange={(e) => setCycleCount(e.target.value)}
                        />
                      )}
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </fieldset>
          </motion.form>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
  secret,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void;
  secret?: boolean;
}) {
  const [visible, setVisible] = useState(!secret);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{visible ? value : "•".repeat(Math.min(value.length, 14))}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {secret && (
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </Button>
        )}
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => onCopy(value)}
        >
          <Copy size={15} />
        </Button>
      </div>
    </div>
  );
}
