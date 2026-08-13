"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

interface Account {
  email: string;
  mobile: string | null;
  country: string | null;
  name: string | null;
}

export default function UserProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");

  const account = useQuery({
    queryKey: ["dashboard", "account"],
    queryFn: () => api.get<Account>("/dashboard/account"),
  });

  useEffect(() => {
    if (!account.data) return;
    setName(account.data.name ?? "");
    setPhone(account.data.mobile ?? "");
    setCountry(account.data.country ?? "");
  }, [account.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch("/settings/profile", {
        name: name.trim(),
        phone: phone.trim(),
        ...(country.trim().length === 2 && { country: country.trim().toUpperCase() }),
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      void account.refetch();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed");
      setPassword("");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader title="User Profile" description="Your personal details and sign-in credentials." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>
              Your country determines the message pricing shown on the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {account.isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
                className="space-y-4"
              >
                <Field label="Email" hint="Contact support to change your sign-in email.">
                  {({ id }) => <Input id={id} value={account.data?.email ?? ""} disabled />}
                </Field>

                <Field label="Full name">
                  {({ id }) => (
                    <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />
                  )}
                </Field>

                <Field label="Mobile number">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919266806659"
                    />
                  )}
                </Field>

                <Field label="Country" hint="Two-letter code, e.g. IN.">
                  {({ id }) => (
                    <Input
                      id={id}
                      maxLength={2}
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      placeholder="IN"
                    />
                  )}
                </Field>

                <Button type="submit" loading={save.isPending}>
                  Save changes
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Choose something you haven&apos;t used before.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                changePassword.mutate();
              }}
              className="space-y-4"
            >
              <Field label="New password" required hint="At least 8 characters.">
                {({ id }) => (
                  <Input
                    id={id}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </Field>

              <Button type="submit" loading={changePassword.isPending}>
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
