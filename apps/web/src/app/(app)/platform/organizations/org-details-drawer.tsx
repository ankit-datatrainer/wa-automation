"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Building2,
  CalendarClock,
  CreditCard,
  ExternalLink,
  FileText,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber, AnimatePresence, SegmentedTabs, motion, ease } from "@/components/motion";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { Sheet } from "../_components/overlay";
import { Avatar, relation } from "../_components/ui";

type PlanRelation = { id: string; name: string; price: number; currency: string; billing_cycle: string };
type UserRelation = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
};

export interface OrgDetailsOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  wallet_balance: number;
  currency: string;
  trial_ends_at: string | null;
  is_demo: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
}

interface OrgDetailsResponse {
  organization: OrgDetailsOrganization;
  members: {
    id: string;
    role: string;
    is_online: boolean;
    created_at: string;
    users: UserRelation | UserRelation[] | null;
  }[];
  waba: {
    id: string;
    waba_id: string;
    phone_number_id: string;
    display_phone: string;
    verified_name: string | null;
    quality_rating: string | null;
    messaging_tier: string | null;
    status: string;
    last_synced_at: string | null;
  } | null;
  counts: {
    contacts: number;
    campaigns: number;
    templates: number;
    flows: number;
    chatbots: number;
    messages: number;
  };
  subscriptions: {
    id: string;
    status: string;
    cycle_count: number;
    starts_at: string;
    ends_at: string;
    cancelled_at: string | null;
    notes: string | null;
    plans: PlanRelation | PlanRelation[] | null;
  }[];
  walletTransactions: {
    id: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    reference: string | null;
    created_at: string;
  }[];
}

interface OrgDetailsDrawerProps {
  organizationId: string;
  onClose: () => void;
  /** When omitted (e.g. opened from the WABA page) the action toolbar links to Organizations instead. */
  onOpenWallet?: (org: OrgDetailsOrganization) => void;
  onOpenPlan?: (org: OrgDetailsOrganization) => void;
  onToggleSuspend?: (org: OrgDetailsOrganization) => void;
}

type Tab = "overview" | "waba" | "members" | "billing";

const qualityTone = (q?: string | null) =>
  q === "high" ? "success" : q === "medium" ? "warning" : q === "low" ? "danger" : "neutral";

export function OrgDetailsDrawer({
  organizationId,
  onClose,
  onOpenWallet,
  onOpenPlan,
  onToggleSuspend,
}: OrgDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const details = useQuery({
    queryKey: ["platform", "organization", organizationId, "details"],
    queryFn: () => api.get<OrgDetailsResponse>(`/platform/organizations/${organizationId}/details`),
  });

  const data = details.data;
  const org = data?.organization;
  const waba = data?.waba;
  const hasActions = !!(onOpenWallet || onOpenPlan || onToggleSuspend);

  return (
    <Sheet
      onClose={onClose}
      icon={Building2}
      size="xl"
      title={org?.name ?? "Loading organization…"}
      description={<span className="font-mono text-xs">{org?.slug ?? organizationId}</span>}
      bodyClassName="p-0 sm:p-0"
    >
      {/* Status + actions */}
      {org && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-brand-50/30 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" className="capitalize">
              {org.plan} plan
            </Badge>
            {org.is_demo && <Badge tone="info">Demo</Badge>}
            {org.is_suspended ? (
              <Badge tone="danger">
                <ShieldAlert size={12} />
                Suspended
              </Badge>
            ) : (
              <Badge tone="success">
                <ShieldCheck size={12} />
                Active
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasActions ? (
              <>
                {onOpenWallet && (
                  <Button size="sm" variant="outline" onClick={() => onOpenWallet(org)}>
                    <Wallet size={14} />
                    Wallet
                  </Button>
                )}
                {onOpenPlan && (
                  <Button size="sm" variant="outline" onClick={() => onOpenPlan(org)}>
                    <CreditCard size={14} />
                    Plan
                  </Button>
                )}
                {onToggleSuspend && (
                  <Button
                    size="sm"
                    variant={org.is_suspended ? "outline" : "destructive"}
                    onClick={() => onToggleSuspend(org)}
                  >
                    {org.is_suspended ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {org.is_suspended ? "Restore" : "Suspend"}
                  </Button>
                )}
              </>
            ) : (
              <Link href="/platform/organizations" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <ExternalLink size={14} />
                Manage in Organizations
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="scrollbar-none overflow-x-auto border-b px-5 py-3 sm:px-6">
        <SegmentedTabs<Tab>
          layoutId="org-details-tabs"
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "waba", label: "WhatsApp" },
            { value: "members", label: `Team${data ? ` (${data.members.length})` : ""}` },
            { value: "billing", label: "Billing" },
          ]}
        />
      </div>

      <div className="p-5 sm:p-6">
        {details.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-44" />
            <Skeleton className="h-32" />
          </div>
        ) : details.isError || !data || !org ? (
          <ErrorState message="Could not load organization details." onRetry={() => void details.refetch()} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease }}
              className="space-y-6"
            >
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-glow">
                      <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
                      <p className="relative text-xs font-semibold uppercase tracking-wider text-white/75">
                        Wallet balance
                      </p>
                      <p className="relative mt-1 font-display text-2xl font-bold">
                        <AnimatedNumber
                          value={Number(org.wallet_balance)}
                          format={(n) => formatCurrency(n, org.currency)}
                        />
                      </p>
                      <p className="relative mt-1 text-xs text-white/80">Used for per-message Cloud API charges</p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-soft">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Plan / trial
                      </p>
                      <p className="mt-1 font-display text-xl font-bold capitalize">{org.plan}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock size={13} />
                        {org.trial_ends_at
                          ? `Ends ${new Date(org.trial_ends_at).toLocaleDateString()}`
                          : "No expiry set"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-display text-base font-semibold">Resource usage</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <UsageTile icon={Users} label="Contacts" value={data.counts.contacts} />
                      <UsageTile icon={Send} label="Campaigns" value={data.counts.campaigns} />
                      <UsageTile icon={FileText} label="Templates" value={data.counts.templates} />
                      <UsageTile icon={Workflow} label="Flows" value={data.counts.flows} />
                      <UsageTile icon={Bot} label="Chatbots" value={data.counts.chatbots} />
                      <UsageTile icon={MessageSquare} label="Messages" value={data.counts.messages} />
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold">Metadata</h3>
                    <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">Tenant ID</dt>
                        <dd className="truncate font-mono">{org.id}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{new Date(org.created_at).toLocaleString()}</dd>
                      </div>
                      {org.suspended_reason && (
                        <div className="rounded-xl bg-rose-50 p-3 text-rose-700 sm:col-span-2">
                          <dt className="font-semibold">Suspension reason</dt>
                          <dd>{org.suspended_reason}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </>
              )}

              {activeTab === "waba" &&
                (waba ? (
                  <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                          <Phone size={20} />
                        </span>
                        <div>
                          <p className="font-display text-lg font-bold">{waba.display_phone || "—"}</p>
                          <p className="text-xs text-muted-foreground">{waba.verified_name || "Unverified name"}</p>
                        </div>
                      </div>
                      <Badge tone={statusTone(waba.status)} className="capitalize">
                        {waba.status}
                      </Badge>
                    </div>

                    <dl className="grid grid-cols-1 gap-4 border-t pt-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">Quality rating</dt>
                        <dd className="mt-1">
                          <Badge tone={qualityTone(waba.quality_rating)}>
                            {waba.quality_rating?.toUpperCase() || "UNKNOWN"}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">Messaging tier</dt>
                        <dd className="mt-1 font-semibold">{waba.messaging_tier || "—"}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-muted-foreground">WABA ID</dt>
                        <dd className="mt-1 truncate font-mono text-xs">{waba.waba_id}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-muted-foreground">Phone number ID</dt>
                        <dd className="mt-1 truncate font-mono text-xs">{waba.phone_number_id}</dd>
                      </div>
                    </dl>

                    {waba.last_synced_at && (
                      <p className="border-t pt-3 text-xs text-muted-foreground">
                        Last synced with Meta {new Date(waba.last_synced_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <EmptyPanel
                    icon={Phone}
                    title="No WhatsApp number connected"
                    description="This organization has not connected a Meta WhatsApp Cloud API number yet."
                  />
                ))}

              {activeTab === "members" &&
                (data.members.length === 0 ? (
                  <EmptyPanel icon={Users} title="No members" description="Nobody belongs to this organization." />
                ) : (
                  <ul className="space-y-2">
                    {data.members.map((member, i) => {
                      const user = relation<UserRelation>(member.users);
                      return (
                        <motion.li
                          key={member.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease, delay: Math.min(i, 15) * 0.03 }}
                          className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 transition hover:border-brand-200 hover:shadow-soft"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={user?.name ?? user?.email} online={member.is_online} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{user?.name ?? "Unnamed user"}</p>
                              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                          </div>
                          <Badge tone={member.role === "owner" ? "brand" : "neutral"} className="capitalize">
                            {member.role}
                          </Badge>
                        </motion.li>
                      );
                    })}
                  </ul>
                ))}

              {activeTab === "billing" && (
                <>
                  <div>
                    <h3 className="mb-3 font-display text-base font-semibold">Subscriptions</h3>
                    {data.subscriptions.length === 0 ? (
                      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No subscription history recorded.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {data.subscriptions.map((sub) => {
                          const plan = relation<PlanRelation>(sub.plans);
                          return (
                            <li key={sub.id} className="rounded-2xl border bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">
                                  {plan?.name ?? "Custom"}
                                  <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">
                                    {plan?.billing_cycle ?? "monthly"}
                                  </span>
                                </p>
                                <Badge tone={sub.status === "active" ? "success" : "neutral"} className="capitalize">
                                  {sub.status}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(sub.starts_at).toLocaleDateString()} –{" "}
                                {new Date(sub.ends_at).toLocaleDateString()}
                              </p>
                              {sub.notes && (
                                <p className="mt-2 border-t pt-2 text-xs italic text-muted-foreground">{sub.notes}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-3 font-display text-base font-semibold">Recent wallet transactions</h3>
                    {data.walletTransactions.length === 0 ? (
                      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No wallet transactions yet.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-2xl border bg-white">
                        {data.walletTransactions.map((tx) => {
                          const credit = tx.type === "credit";
                          return (
                            <li key={tx.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                              <div className="flex min-w-0 items-center gap-3">
                                <span
                                  className={cn(
                                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                                    credit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
                                  )}
                                >
                                  {credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{tx.description || "Wallet adjustment"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(tx.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className={cn("font-bold", credit ? "text-emerald-600" : "text-rose-600")}>
                                  {credit ? "+" : "−"}
                                  {formatCurrency(Number(tx.amount), org.currency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Bal {formatCurrency(Number(tx.balance_after), org.currency)}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Sheet>
  );
}

function UsageTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="rounded-2xl border bg-white p-4 transition-shadow hover:shadow-soft"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-primary">
          <Icon size={14} />
        </span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold">
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  );
}

function EmptyPanel({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-brand-50/30 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary shadow-soft">
        <Icon size={22} />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
