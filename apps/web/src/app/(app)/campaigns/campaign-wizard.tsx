"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { extractVariables } from "./templates/template-preview";

type AudienceType = "contacts" | "tags" | "groups" | "csv" | "broadcast";

interface TemplateOption {
  id: string;
  name: string;
  language: string;
  category: string;
  components: { body: { text: string } };
}

interface Option {
  id: string;
  name: string;
  contactCount: number;
}

const STEPS = ["Details", "Audience", "Variables", "Schedule"] as const;

export function CampaignWizard({
  audienceType,
  lockAudience,
}: {
  audienceType: AudienceType;
  /** Set on the dedicated Send By Tags / Groups / CSV pages. */
  lockAudience?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [audience, setAudience] = useState<AudienceType>(audienceType);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendNow, setSendNow] = useState(true);

  const templates = useQuery({
    queryKey: ["templates", "approved"],
    queryFn: () =>
      api.get<{ data: TemplateOption[] }>("/templates", { status: "approved", pageSize: 100 }),
  });

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: Option[] }>("/tags"),
    enabled: audience === "tags",
  });

  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: Option[] }>("/groups"),
    enabled: audience === "groups",
  });

  const template = templates.data?.data.find((t) => t.id === templateId);
  const variables = template ? extractVariables(template.components?.body?.text ?? "") : [];

  const create = useMutation({
    mutationFn: async () => {
      const config: Record<string, unknown> =
        audience === "tags"
          ? { tagIds: selectedIds }
          : audience === "groups"
            ? { groupIds: selectedIds }
            : audience === "contacts" || audience === "csv"
              ? { contactIds: selectedIds }
              : {};

      const campaign = await api.post<{ id: string; recipientCount: number }>("/campaigns", {
        name: name.trim(),
        templateId,
        audienceType: audience,
        audienceConfig: config,
        variableMapping: mapping,
        scheduledAt: sendNow ? null : new Date(scheduledAt).toISOString(),
      });

      if (sendNow) await api.post(`/campaigns/${campaign.id}/send`);
      return campaign;
    },
    onSuccess: (campaign) => {
      toast.success(
        sendNow
          ? `Campaign started for ${campaign.recipientCount} contacts`
          : "Campaign scheduled",
      );
      router.push(sendNow ? "/campaigns/history" : "/campaigns/scheduled");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not create the campaign",
      ),
  });

  const options = audience === "tags" ? tags.data?.data : groups.data?.data;
  const needsSelection = audience === "tags" || audience === "groups";

  const canAdvance =
    step === 0
      ? name.trim().length >= 2 && !!templateId
      : step === 1
        ? !needsSelection || selectedIds.length > 0
        : step === 2
          ? variables.every((v) => (mapping[v] ?? "").length > 0)
          : sendNow || !!scheduledAt;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-accent text-accent-foreground"
                    : "border text-muted-foreground",
              )}
            >
              {index < step ? <Check size={14} /> : <span>{index + 1}</span>}
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="min-h-64 rounded-xl border bg-card p-6">
        {step === 0 && (
          <div className="max-w-lg space-y-5">
            <Field label="Campaign name" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Diwali offer — October"
                />
              )}
            </Field>

            <Field
              label="Template"
              required
              hint="Only Meta-approved templates can be used in campaigns."
            >
              {({ id }) =>
                templates.isLoading ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <Select id={id} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">Select a template...</option>
                    {templates.data?.data.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.language}) — {t.category}
                      </option>
                    ))}
                  </Select>
                )
              }
            </Field>

            {template && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-semibold">Template body</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {template.components?.body?.text}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg space-y-5">
            {!lockAudience && (
              <Field label="Audience type">
                {({ id }) => (
                  <Select
                    id={id}
                    value={audience}
                    onChange={(e) => {
                      setAudience(e.target.value as AudienceType);
                      setSelectedIds([]);
                    }}
                  >
                    <option value="broadcast">Broadcast — everyone opted in</option>
                    <option value="tags">By tags</option>
                    <option value="groups">By groups</option>
                  </Select>
                )}
              </Field>
            )}

            {needsSelection ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Select {audience === "tags" ? "tags" : "groups"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options?.length ? (
                    options.map((option) => {
                      const active = selectedIds.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setSelectedIds((current) =>
                              active
                                ? current.filter((id) => id !== option.id)
                                : [...current, option.id],
                            )
                          }
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          {option.name}
                          <span className="ml-2 opacity-70">{option.contactCount}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nothing to select yet — create {audience} under Manage first.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This campaign will go to every contact who has not opted out. Contacts marked
                opted-out are excluded automatically.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg space-y-5">
            {variables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This template has no variables. Continue to scheduling.
              </p>
            ) : (
              variables.map((variable) => (
                <Field key={variable} label={`Value for {{${variable}}}`} required>
                  {({ id }) => (
                    <Select
                      id={id}
                      value={mapping[variable] ?? ""}
                      onChange={(e) =>
                        setMapping((current) => ({ ...current, [variable]: e.target.value }))
                      }
                    >
                      <option value="">Select a source...</option>
                      <option value="contact.name">Contact name</option>
                      <option value="contact.phone">Contact phone</option>
                    </Select>
                  )}
                </Field>
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg space-y-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSendNow(true)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left transition-colors",
                  sendNow && "border-primary bg-accent",
                )}
              >
                <p className="font-semibold">Send now</p>
                <p className="text-sm text-muted-foreground">Start delivering immediately.</p>
              </button>
              <button
                type="button"
                onClick={() => setSendNow(false)}
                className={cn(
                  "flex-1 rounded-lg border p-4 text-left transition-colors",
                  !sendNow && "border-primary bg-accent",
                )}
              >
                <p className="font-semibold">Schedule</p>
                <p className="text-sm text-muted-foreground">Pick a future date and time.</p>
              </button>
            </div>

            {!sendNow && (
              <Field label="Send at" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                )}
              </Field>
            )}

            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-semibold">Review</p>
              <Summary label="Name" value={name || "—"} />
              <Summary label="Template" value={template?.name ?? "—"} />
              <Summary label="Audience" value={audience} />
              {needsSelection && (
                <Summary label="Selected" value={`${selectedIds.length}`} />
              )}
              <Summary label="Delivery" value={sendNow ? "Immediately" : scheduledAt || "—"} />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : (
          <Button disabled={!canAdvance} loading={create.isPending} onClick={() => create.mutate()}>
            {sendNow ? "Create and send" : "Schedule campaign"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
