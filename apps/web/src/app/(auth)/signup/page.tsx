"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUpSchema } from "@wa/types";
import { toast } from "sonner";
import { ArrowRight, Building2, KeyRound, Mail, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import {
  AuthHeader,
  AuthItem,
  AuthStagger,
  FormAlert,
  PasswordStrength,
  WithIcon,
} from "../_components/auth-ui";

// The shared schema plus a confirmation field that never leaves the browser.
const signUpFormSchema = signUpSchema
  .extend({ confirmPassword: z.string().min(1, "Please confirm your password") })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({ resolver: zodResolver(signUpFormSchema) });

  const password = watch("password") ?? "";

  const onSubmit = async (values: SignUpFormValues) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const supabase = createClient();

      // The org itself is created server-side by the bootstrap route once the
      // session exists, so the metadata just carries the intent through signup.
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            organization_name: values.organizationName,
            phone: values.phone ?? null,
            country: values.country ?? null,
          },
        },
      });

      if (error) {
        setFormError(error.message);
        toast.error(error.message);
        setSubmitting(false);
        return;
      }

      if (!data.session) {
        setSubmitting(false);
        toast.success("Check your email to confirm your account.");
        router.push("/login");
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create your account. Please try again.";
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthStagger as="form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <AuthHeader
        eyebrow="30-day free trial"
        title={
          <>
            Create your <span className="text-gradient">account</span>
          </>
        }
        description="Launch your first WhatsApp campaign in minutes. No credit card required."
      />

      <AuthItem className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name?.message}>
          {({ id }) => (
            <WithIcon icon={User}>
              <Input
                id={id}
                autoComplete="name"
                placeholder="Your name"
                className="pl-10"
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </WithIcon>
          )}
        </Field>

        <Field label="Business name" required error={errors.organizationName?.message}>
          {({ id }) => (
            <WithIcon icon={Building2}>
              <Input
                id={id}
                autoComplete="organization"
                placeholder="Acme Retail"
                className="pl-10"
                aria-invalid={errors.organizationName ? true : undefined}
                {...register("organizationName")}
              />
            </WithIcon>
          )}
        </Field>
      </AuthItem>

      <AuthItem>
        <Field label="Work email" required error={errors.email?.message}>
          {({ id }) => (
            <WithIcon icon={Mail}>
              <Input
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
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
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pl-10"
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
            </WithIcon>
          )}
        </Field>
        <PasswordStrength password={password} />
      </AuthItem>

      <AuthItem>
        <Field label="Confirm password" required error={errors.confirmPassword?.message}>
          {({ id }) => (
            <WithIcon icon={ShieldCheck}>
              <PasswordInput
                id={id}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="pl-10"
                aria-invalid={errors.confirmPassword ? true : undefined}
                {...register("confirmPassword")}
              />
            </WithIcon>
          )}
        </Field>
      </AuthItem>

      <FormAlert message={formError} />

      <AuthItem className="pt-1">
        <Button type="submit" size="lg" className="group w-full" loading={submitting}>
          {submitting ? "Creating your account…" : "Create account"}
          {!submitting && (
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          )}
        </Button>
      </AuthItem>

      <AuthItem>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-primary transition-colors hover:text-brand-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Sign in
          </Link>
        </p>
      </AuthItem>
    </AuthStagger>
  );
}
