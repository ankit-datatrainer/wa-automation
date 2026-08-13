"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
}

const VERTICALS = [
  "UNDEFINED",
  "OTHER",
  "AUTO",
  "BEAUTY",
  "APPAREL",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GROCERY",
  "GOVT",
  "HOTEL",
  "HEALTH",
  "NONPROFIT",
  "PROF_SERVICES",
  "RETAIL",
  "TRAVEL",
  "RESTAURANT",
];

export default function BusinessProfilePage() {
  const [form, setForm] = useState<BusinessProfile>({});

  const profile = useQuery({
    queryKey: ["business-profile"],
    queryFn: () => api.get<BusinessProfile>("/waba/business-profile"),
    retry: false,
  });

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch("/waba/business-profile", {
        about: form.about,
        address: form.address,
        description: form.description,
        email: form.email ?? "",
        websites: (form.websites ?? []).filter(Boolean),
        vertical: form.vertical,
      }),
    onSuccess: () => {
      toast.success("Business profile updated on WhatsApp");
      void profile.refetch();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const set = (key: keyof BusinessProfile, value: string | string[]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageHeader
        title="Business Profile"
        description="How your business appears to customers inside WhatsApp."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>WhatsApp profile</CardTitle>
          <CardDescription>
            These details are stored by Meta and shown on your business profile card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.isError ? (
            <ErrorState message="Connect your WhatsApp number first under Manage Credentials." />
          ) : profile.isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              <Field label="About" hint="Up to 139 characters, shown under your name.">
                {({ id }) => (
                  <Input
                    id={id}
                    maxLength={139}
                    value={form.about ?? ""}
                    onChange={(e) => set("about", e.target.value)}
                    placeholder="Automating WhatsApp for growing businesses"
                  />
                )}
              </Field>

              <Field label="Description">
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    maxLength={512}
                    value={form.description ?? ""}
                    onChange={(e) => set("description", e.target.value)}
                  />
                )}
              </Field>

              <Field label="Address">
                {({ id }) => (
                  <Input
                    id={id}
                    maxLength={256}
                    value={form.address ?? ""}
                    onChange={(e) => set("address", e.target.value)}
                  />
                )}
              </Field>

              <Field label="Contact email">
                {({ id }) => (
                  <Input
                    id={id}
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value)}
                  />
                )}
              </Field>

              <Field label="Website" hint="WhatsApp allows up to two.">
                {({ id }) => (
                  <Input
                    id={id}
                    type="url"
                    value={form.websites?.[0] ?? ""}
                    onChange={(e) => set("websites", [e.target.value])}
                    placeholder="https://example.com"
                  />
                )}
              </Field>

              <Field label="Industry">
                {({ id }) => (
                  <Select
                    id={id}
                    value={form.vertical ?? "UNDEFINED"}
                    onChange={(e) => set("vertical", e.target.value)}
                  >
                    {VERTICALS.map((vertical) => (
                      <option key={vertical} value={vertical}>
                        {vertical.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Button type="submit" loading={save.isPending}>
                Save to WhatsApp
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
