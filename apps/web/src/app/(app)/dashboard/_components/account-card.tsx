"use client";

import Link from "next/link";
import { Building2, Calendar, Clock, Mail, MapPin, Pencil, Phone, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn, initials } from "@/lib/utils";
import type { AccountData } from "./types";

export function AccountCard({
  account,
  loading,
  error,
  onRetry,
}: {
  account: AccountData | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const fields: { icon: LucideIcon; label: string; value: string | null; hint?: string | null; editable?: boolean }[] = [
    { icon: User, label: "Full name", value: account?.name ?? null, editable: true },
    { icon: Mail, label: "Email", value: account?.email ?? null },
    { icon: Phone, label: "Mobile", value: account?.mobile ?? null, editable: true },
    { icon: MapPin, label: "Country", value: account?.country ?? null, editable: true },
    { icon: Clock, label: "Member since", value: account?.memberSince ?? null },
    {
      icon: Calendar,
      label: account?.isDemo ? "Demo expires" : "Trial ends",
      value: account?.demoExpires ?? null,
      hint:
        account?.daysRemaining !== null && account?.daysRemaining !== undefined
          ? `${account.daysRemaining} day${account.daysRemaining === 1 ? "" : "s"} remaining`
          : null,
    },
  ].filter(
    // Paid plans without a trial date have nothing to show here — and nothing to "set".
    (field) => field.icon !== Calendar || loading || field.value !== null || account?.plan === "trial",
  );

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {loading ? (
            <Skeleton className="h-12 w-12 rounded-2xl" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient font-display text-base font-bold text-white shadow-glow">
              {initials(account?.name ?? account?.email, "?")}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight">Account information</h3>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Building2 size={13} className="shrink-0" />
              <span className="truncate">{account?.organizationName ?? "Your organization"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account && (
            <Badge tone={account.isDemo ? "warning" : "brand"} className="capitalize">
              <ShieldCheck size={12} />
              {account.isDemo ? "Demo account" : `${account.plan} plan`}
            </Badge>
          )}
          <Link
            href="/manage/profile"
            aria-label="Edit profile"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-9 w-9")}
          >
            <Pencil size={15} />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-5">
          <ErrorState message="Could not load account details." onRetry={onRetry} />
        </div>
      ) : (
        <Stagger className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3" stagger={0.04}>
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <StaggerItem
                key={field.label}
                className="rounded-2xl border border-border/80 bg-white p-3.5 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon size={13} className="text-primary" />
                  {field.label}
                </p>
                {loading ? (
                  <Skeleton className="mt-2 h-5 w-3/4" />
                ) : field.value ? (
                  <>
                    <p className="mt-1.5 break-words text-sm font-semibold" title={field.value}>
                      {field.value}
                    </p>
                    {field.hint && <p className="mt-0.5 text-xs font-semibold text-primary">{field.hint}</p>}
                  </>
                ) : field.editable ? (
                  <Link href="/manage/profile" className="mt-1.5 inline-block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                    Not set — add it
                  </Link>
                ) : (
                  <p className="mt-1.5 text-sm font-medium text-muted-foreground">—</p>
                )}
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {account?.isDemo && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed text-amber-900">
            <p className="font-semibold">You&apos;re on a demo account</p>
            <p className="mt-0.5">
              Some features are limited
              {account.demoExpires ? ` and access ends on ${account.demoExpires}` : ""}. Contact support to
              upgrade to a full account.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
