"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@wa/types";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { AuthHeader, AuthItem, AuthStagger, FormAlert, WithIcon, safeNext } from "../_components/auth-ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (values: SignInInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);

      if (error) {
        setFormError(error.message);
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      // Keep the button busy while we navigate; refresh so the middleware and
      // server components pick up the fresh session cookies.
      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in. Please try again.";
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthStagger as="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <AuthHeader
        eyebrow="Welcome back"
        title={
          <>
            Sign in to your <span className="text-gradient">workspace</span>
          </>
        }
        description="Pick up your conversations, campaigns and chatbots right where you left them."
      />

      <AuthItem>
        <Field label="Email" required error={errors.email?.message}>
          {({ id }) => (
            <WithIcon icon={Mail}>
              <Input
                id={id}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                className="pl-10"
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
            </WithIcon>
          )}
        </Field>
      </AuthItem>

      <AuthItem className="space-y-2">
        <Field label="Password" required error={errors.password?.message}>
          {({ id }) => (
            <WithIcon icon={KeyRound}>
              <PasswordInput
                id={id}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="pl-10"
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
            </WithIcon>
          )}
        </Field>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="rounded text-sm font-semibold text-primary transition-colors hover:text-brand-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Forgot password?
          </Link>
        </div>
      </AuthItem>

      <FormAlert message={formError} />

      <AuthItem>
        <Button type="submit" size="lg" className="group w-full" loading={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
          {!submitting && (
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          )}
        </Button>
      </AuthItem>

      <AuthItem>
        <div className="relative py-1 text-center">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <span className="relative bg-white px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            New to WA Automation?
          </span>
        </div>
      </AuthItem>

      <AuthItem>
        <Link
          href="/signup"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(40,16,70,0.05)] transition-all hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
        >
          Create an account
        </Link>
      </AuthItem>
    </AuthStagger>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
