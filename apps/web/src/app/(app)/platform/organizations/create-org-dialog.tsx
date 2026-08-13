"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
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
  const [password, setPassword] = useState(generatePassword());
  const [planId, setPlanId] = useState("");
  const [cycleCount, setCycleCount] = useState("1");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

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
        ...(planId && { planId, cycleCount: Number(cycleCount) }),
      }),
    onSuccess: () => {
      setCreated({ email: email.trim(), password });
      toast.success("Organization created");
      onCreated();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not create the organization"),
  });

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1 bg-black/40" />

      <aside className="flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-bold">New organization</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        {created ? (
          <div className="flex-1 space-y-4 p-5">
            <p className="text-sm text-muted-foreground">
              Share these with the customer. The password is shown only once.
            </p>
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <CredentialRow label="Email" value={created.email} onCopy={copy} />
              <CredentialRow label="Password" value={created.password} onCopy={copy} />
            </div>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <Field label="Business name" required>
                {({ id }) => (
                  <Input id={id} required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Acme Retail" />
                )}
              </Field>

              <Field label="Owner name" required>
                {({ id }) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />}
              </Field>

              <Field label="Owner email" required>
                {({ id }) => (
                  <Input id={id} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@company.com" />
                )}
              </Field>

              <Field label="Password" required hint="Auto-generated; you can change it.">
                {({ id }) => (
                  <div className="flex gap-2">
                    <Input id={id} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                      New
                    </Button>
                  </div>
                )}
              </Field>

              <Field label="Plan" hint="Optional — leave blank to start on a trial.">
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
                            {p.name} — ₹{p.price}/{p.billing_cycle === "yearly" ? "yr" : "mo"}
                          </option>
                        ))}
                    </Select>
                  )
                }
              </Field>

              {planId && (
                <Field label={`Duration (${selectedPlan?.billing_cycle === "yearly" ? "years" : "months"})`}>
                  {({ id }) => (
                    <Input id={id} type="number" min={1} max={60} value={cycleCount} onChange={(e) => setCycleCount(e.target.value)} />
                  )}
                </Field>
              )}
            </div>

            <footer className="flex gap-3 border-t p-5">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={create.isPending}>
                <UserPlus size={16} />
                Create
              </Button>
            </footer>
          </form>
        )}
      </aside>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => onCopy(value)}>
        <Copy size={14} />
      </Button>
    </div>
  );
}
