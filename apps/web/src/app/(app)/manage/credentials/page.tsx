"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { EmbeddedSignup } from "./embedded-signup";

interface WabaAccount {
  waba_id: string;
  phone_number_id: string;
  display_phone: string;
  verified_name: string | null;
  quality_rating: string;
  messaging_tier: string;
  status: string;
  verify_token: string;
  last_synced_at: string | null;
}

export default function CredentialsPage() {
  const queryClient = useQueryClient();
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    appSecret: "",
    verifyToken: "",
  });

  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () => api.get<{ data: WabaAccount | null }>("/waba"),
  });

  const save = useMutation({
    mutationFn: () =>
      api.post("/waba", {
        wabaId: form.wabaId.trim(),
        phoneNumberId: form.phoneNumberId.trim(),
        accessToken: form.accessToken.trim(),
        ...(form.appSecret.trim() && { appSecret: form.appSecret.trim() }),
        verifyToken: form.verifyToken.trim(),
      }),
    onSuccess: () => {
      toast.success("WhatsApp connected");
      setForm({ wabaId: "", phoneNumberId: "", accessToken: "", appSecret: "", verifyToken: "" });
      void queryClient.invalidateQueries({ queryKey: ["waba"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not connect"),
  });

  const sync = useMutation({
    mutationFn: () => api.post("/waba/sync"),
    onSuccess: () => {
      toast.success("Synced with WhatsApp");
      void queryClient.invalidateQueries({ queryKey: ["waba"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Sync failed"),
  });

  const account = waba.data?.data;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <>
      <PageHeader
        title="Manage Credentials"
        description="Connect your WhatsApp Business Account so campaigns, chatbots and the inbox can send messages."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection status</CardTitle>
            <CardDescription>Your currently connected WhatsApp number.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {waba.isLoading ? (
              <Skeleton className="h-32" />
            ) : account ? (
              <>
                <div className="flex items-center gap-2">
                  {account.status === "connected" ? (
                    <CheckCircle2 size={18} className="text-primary" />
                  ) : (
                    <XCircle size={18} className="text-destructive" />
                  )}
                  <Badge tone={statusTone(account.status)}>{account.status}</Badge>
                </div>

                <dl className="space-y-2 text-sm">
                  <Row label="Display number" value={account.display_phone} />
                  <Row label="Verified name" value={account.verified_name ?? "—"} />
                  <Row label="WABA ID" value={account.waba_id} mono />
                  <Row label="Phone number ID" value={account.phone_number_id} mono />
                  <Row label="Quality rating" value={account.quality_rating} />
                  <Row label="Messaging tier" value={account.messaging_tier} />
                  <Row
                    label="Last synced"
                    value={
                      account.last_synced_at
                        ? new Date(account.last_synced_at).toLocaleString()
                        : "Never"
                    }
                  />
                </dl>

                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">Webhook callback URL</p>
                  <code className="mt-1 block break-all text-xs">
                    {process.env.NEXT_PUBLIC_API_URL}/webhooks/whatsapp
                  </code>
                  <p className="mt-2 font-semibold">Verify token</p>
                  <code className="mt-1 block break-all text-xs">{account.verify_token}</code>
                </div>

                <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
                  {!sync.isPending && <RefreshCw size={16} />}
                  Sync with Meta
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No WhatsApp number is connected yet. Add your credentials to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!account && <EmbeddedSignup />}

          <div>
            {!account && (
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="mb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {showManual ? "Hide manual setup" : "Or connect manually instead →"}
              </button>
            )}

            {(account || showManual) && (
        <Card>
          <CardHeader>
            <CardTitle>{account ? "Update credentials" : "Connect manually"}</CardTitle>
            <CardDescription>
              Find these in Meta for Developers under your app&apos;s WhatsApp settings. Tokens
              are encrypted before they are stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              <Field label="WhatsApp Business Account ID" required>
                {({ id }) => (
                  <Input id={id} required value={form.wabaId} onChange={set("wabaId")} placeholder="102290129340398" />
                )}
              </Field>

              <Field label="Phone number ID" required>
                {({ id }) => (
                  <Input id={id} required value={form.phoneNumberId} onChange={set("phoneNumberId")} placeholder="106540352242922" />
                )}
              </Field>

              <Field
                label="Permanent access token"
                required
                hint="Use a System User token so it does not expire."
              >
                {({ id }) => (
                  <Input id={id} required type="password" value={form.accessToken} onChange={set("accessToken")} placeholder="EAAG..." />
                )}
              </Field>

              <Field label="App secret" hint="Optional, but required to verify webhook signatures.">
                {({ id }) => (
                  <Input id={id} type="password" value={form.appSecret} onChange={set("appSecret")} />
                )}
              </Field>

              <Field
                label="Webhook verify token"
                required
                hint="Any string of 8+ characters. Enter the same value in Meta."
              >
                {({ id }) => (
                  <Input id={id} required minLength={8} value={form.verifyToken} onChange={set("verifyToken")} />
                )}
              </Field>

              <Button type="submit" className="w-full" loading={save.isPending}>
                {account ? "Update and verify" : "Connect and verify"}
              </Button>
            </form>
          </CardContent>
        </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`truncate text-right font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
