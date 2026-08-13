"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;

    setSubmitting(true);
    // The recovery link already established a session for this user.
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    router.replace("/dashboard");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose something you haven&apos;t used before.</p>
      </div>

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

      <Field
        label="Confirm password"
        required
        error={mismatch ? "Passwords do not match" : undefined}
      >
        {({ id }) => (
          <Input
            id={id}
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" className="w-full" loading={submitting} disabled={mismatch}>
        Update password
      </Button>
    </form>
  );
}
