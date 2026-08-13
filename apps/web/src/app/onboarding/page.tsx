"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";

/**
 * Creates the organization for a user who has a session but no membership yet.
 * Runs automatically when signup supplied a business name; otherwise it asks.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const attempted = useRef(false);

  const bootstrap = async (name: string, phone?: string, country?: string) => {
    setSubmitting(true);
    try {
      await api.post("/auth/bootstrap", {
        organizationName: name,
        ...(phone && { phone }),
        ...(country && { country }),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your workspace");
      setSubmitting(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const meta = user.user_metadata ?? {};
      const nameFromSignup = meta.organization_name as string | undefined;

      if (nameFromSignup) {
        await bootstrap(
          nameFromSignup,
          meta.phone as string | undefined,
          meta.country as string | undefined,
        );
        return;
      }
      setChecking(false);
    })();
    // Runs once on mount; the ref guards against StrictMode double-invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void bootstrap(orgName);
        }}
        className="w-full max-w-md space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Name your workspace</h1>
          <p className="text-sm text-muted-foreground">
            This is the business your WhatsApp number will be connected to.
          </p>
        </div>

        <Field label="Business name" required>
          {({ id }) => (
            <Input
              id={id}
              required
              minLength={2}
              placeholder="Acme Retail"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" className="w-full" loading={submitting}>
          Continue
        </Button>
      </form>
    </div>
  );
}
