"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@wa/types";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (values: SignUpInput) => {
    setSubmitting(true);
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
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      toast.success("Check your email to confirm your account.");
      router.push("/login");
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start automating WhatsApp in a few minutes.
        </p>
      </div>

      <Field label="Full name" required error={errors.name?.message}>
        {({ id }) => <Input id={id} autoComplete="name" placeholder="Ayush Goel" {...register("name")} />}
      </Field>

      <Field label="Business name" required error={errors.organizationName?.message}>
        {({ id }) => (
          <Input id={id} autoComplete="organization" placeholder="Acme Retail" {...register("organizationName")} />
        )}
      </Field>

      <Field label="Work email" required error={errors.email?.message}>
        {({ id }) => (
          <Input id={id} type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
        )}
      </Field>

      <Field
        label="Password"
        required
        hint="At least 8 characters."
        error={errors.password?.message}
      >
        {({ id }) => (
          <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
        )}
      </Field>

      <Button type="submit" className="w-full" loading={submitting}>
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
