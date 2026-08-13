"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface WabaAccount {
  display_phone: string;
}

/**
 * Renders a WhatsApp click-to-chat widget snippet. It needs no server component
 * beyond the connected number, so the settings are stored as an integration.
 */
export default function LiveChatSettingPage() {
  const [greeting, setGreeting] = useState("Hi! How can we help you today?");
  const [buttonText, setButtonText] = useState("Chat with us");
  const [position, setPosition] = useState("right");
  const [openHour, setOpenHour] = useState("09:00");
  const [closeHour, setCloseHour] = useState("18:00");

  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () => api.get<{ data: WabaAccount | null }>("/waba"),
  });

  const integration = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<{ data: { provider: string; config: Record<string, string> }[] }>("/settings/integrations"),
  });

  useEffect(() => {
    const config = integration.data?.data.find((i) => i.provider === "webhook")?.config;
    if (config?.greeting) setGreeting(config.greeting);
  }, [integration.data]);

  const save = useMutation({
    mutationFn: () =>
      api.post("/settings/integrations", {
        provider: "webhook",
        config: { greeting, buttonText, position, openHour, closeHour },
        isActive: true,
      }),
    onSuccess: () => toast.success("Live chat settings saved"),
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const phone = waba.data?.data?.display_phone?.replace(/\D/g, "") ?? "";

  const snippet = `<a
  href="https://wa.me/${phone || "YOUR_NUMBER"}?text=${encodeURIComponent(greeting)}"
  target="_blank" rel="noreferrer"
  style="position:fixed;bottom:24px;${position}:24px;z-index:9999;
         display:flex;align-items:center;gap:8px;padding:12px 20px;
         background:#16A34A;color:#fff;border-radius:9999px;
         font:600 15px system-ui;text-decoration:none;
         box-shadow:0 4px 16px rgba(0,0,0,.2)">
  ${buttonText}
</a>`;

  return (
    <>
      <PageHeader
        title="Live Chat Setting"
        description="A WhatsApp chat button for your website, plus the hours your team is available."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Widget</CardTitle>
            <CardDescription>How the button looks and what it prefills.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              <Field label="Button text">
                {({ id }) => (
                  <Input id={id} value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
                )}
              </Field>

              <Field label="Prefilled message" hint="What the visitor's chat opens with.">
                {({ id }) => (
                  <Textarea id={id} rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
                )}
              </Field>

              <Field label="Position">
                {({ id }) => (
                  <Select id={id} value={position} onChange={(e) => setPosition(e.target.value)}>
                    <option value="right">Bottom right</option>
                    <option value="left">Bottom left</option>
                  </Select>
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Opens at">
                  {({ id }) => (
                    <Input id={id} type="time" value={openHour} onChange={(e) => setOpenHour(e.target.value)} />
                  )}
                </Field>
                <Field label="Closes at">
                  {({ id }) => (
                    <Input id={id} type="time" value={closeHour} onChange={(e) => setCloseHour(e.target.value)} />
                  )}
                </Field>
              </div>

              <Button type="submit" loading={save.isPending}>
                Save settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embed code</CardTitle>
            <CardDescription>
              Paste this just before <code>&lt;/body&gt;</code> on your site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {waba.isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <>
                {!phone && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    Connect a WhatsApp number under Manage Credentials to generate a working link.
                  </p>
                )}
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">{snippet}</pre>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(snippet);
                    toast.success("Snippet copied");
                  }}
                >
                  <Copy size={16} />
                  Copy snippet
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
