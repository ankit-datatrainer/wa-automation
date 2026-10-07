"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Check, KeyRound, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/input";
import { ease } from "@/components/motion";
import {
  AuthHeader,
  AuthItem,
  AuthStagger,
  FormAlert,
  PasswordStrength,
  WithIcon,
} from "../_components/auth-ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [session, setSession] = useState<"checking" | "ready" | "missing">("checking");

  // The recovery link establishes a session once the browser client has
  // exchanged the code in the URL. Surface an expired/invalid link up front
  // rather than letting the user type a password that cannot be saved.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session ? "ready" : "missing");
      })
      .catch(() => {
        if (active) setSession("missing");
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active && s) setSession("ready");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const matches = confirm.length > 0 && password === confirm;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || password.length < 8) return;

    setSubmitting(true);
    setFormError(null);
    try {
      // The recovery link already established a session for this user.
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      setDone(true);
      toast.success("Password updated.");
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update your password.";
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthStagger as="form" onSubmit={onSubmit}>
      <AuthHeader
        icon={LockKeyhole}
        title={
          <>
            Set a new <span className="text-gradient">password</span>
          </>
        }
        description="Choose a strong password you haven't used before. You'll be signed in right after."
      />

      <AnimatePresence initial={false}>
        {session === "missing" && (
          <motion.div
            key="missing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold">This reset link is invalid or has expired.</p>
                <p>
                  Open the latest link from your email in this browser, or{" "}
                  <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
                    request a new one
                  </Link>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthItem className="space-y-2">
        <Field
          label="New password"
          required
          hint="At least 8 characters."
          error={tooShort ? "At least 8 characters" : undefined}
        >
          {({ id }) => (
            <WithIcon icon={KeyRound}>
              <PasswordInput
                id={id}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Create a new password"
                className="pl-10"
                aria-invalid={tooShort || undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </WithIcon>
          )}
        </Field>
        <PasswordStrength password={password} />
      </AuthItem>

      <AuthItem className="space-y-1.5">
        <Field label="Confirm password" required error={mismatch ? "Passwords do not match" : undefined}>
          {({ id }) => (
            <WithIcon icon={ShieldCheck}>
              <PasswordInput
                id={id}
                required
                autoComplete="new-password"
                placeholder="Re-enter the new password"
                className="pl-10"
                aria-invalid={mismatch || undefined}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </WithIcon>
          )}
        </Field>
        <AnimatePresence initial={false}>
          {matches && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-xs font-medium text-success"
            >
              <Check size={13} strokeWidth={3} aria-hidden />
              Passwords match
            </motion.p>
          )}
        </AnimatePresence>
      </AuthItem>

      <FormAlert message={formError} />

      <AuthItem>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={submitting || done}
          disabled={mismatch || session === "checking"}
        >
          {done ? "Redirecting…" : submitting ? "Updating password…" : "Update password"}
        </Button>
      </AuthItem>

      <AuthItem className="text-center">
        <Link
          href="/login"
          className="rounded text-sm font-semibold text-primary transition-colors hover:text-brand-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Back to sign in
        </Link>
      </AuthItem>
    </AuthStagger>
  );
}
