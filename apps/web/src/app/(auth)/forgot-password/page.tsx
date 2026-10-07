"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, KeyRound, Mail, MailCheck, RotateCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ease } from "@/components/motion";
import { AuthHeader, AuthItem, AuthStagger, FormAlert, WithIcon } from "../_components/auth-ui";

const backLinkClass =
  "inline-flex items-center gap-1.5 rounded text-sm font-semibold text-primary transition-colors hover:text-brand-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sendLink = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setFormError(error.message);
        toast.error(error.message);
        return false;
      }
      // Confirmed either way, so the form does not reveal which emails exist.
      setSent(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send the reset link.";
      setFormError(message);
      toast.error(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendLink();
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease }}
          className="space-y-6 text-center"
        >
          <div className="relative mx-auto h-20 w-20">
            <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-400/40" />
            <motion.span
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.1 }}
              className="relative grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow"
            >
              <MailCheck size={34} aria-hidden />
            </motion.span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Check your inbox</h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              If an account exists for{" "}
              <strong className="break-all font-semibold text-foreground">{email}</strong>, we&apos;ve sent
              a link to reset your password. It may take a minute to arrive.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-left text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Didn&apos;t get it?</p>
            <p className="mt-1">Check your spam folder, or resend the link below.</p>
          </div>

          <FormAlert message={formError} />

          <div className="flex flex-col gap-3">
            <Button type="button" variant="outline" className="w-full" loading={submitting} onClick={() => void sendLink().then((ok) => ok && toast.success("Reset link sent again."))}>
              {!submitting && <RotateCw size={16} aria-hidden />}
              Resend link
            </Button>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setFormError(null);
              }}
              className="rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Use a different email
            </button>
          </div>

          <Link href="/login" className={backLinkClass}>
            <ArrowLeft size={15} aria-hidden />
            Back to sign in
          </Link>
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          <AuthStagger as="form" onSubmit={onSubmit}>
            <AuthHeader
              icon={KeyRound}
              title={
                <>
                  Forgot your <span className="text-gradient">password?</span>
                </>
              }
              description="No worries. Enter the email you signed up with and we'll send you a secure reset link."
            />

            <AuthItem>
              <Field label="Email" required>
                {({ id }) => (
                  <WithIcon icon={Mail}>
                    <Input
                      id={id}
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </WithIcon>
                )}
              </Field>
            </AuthItem>

            <FormAlert message={formError} />

            <AuthItem>
              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                {submitting ? "Sending link…" : "Send reset link"}
              </Button>
            </AuthItem>

            <AuthItem className="text-center">
              <Link href="/login" className={backLinkClass}>
                <ArrowLeft size={15} aria-hidden />
                Back to sign in
              </Link>
            </AuthItem>
          </AuthStagger>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
