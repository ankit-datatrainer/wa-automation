"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  CreditCard,
  History,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatCurrency, initials } from "@/lib/utils";

interface OrgDetailsResponse {
  organization: {
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
  };
  members: {
    id: string;
    role: string;
    is_online: boolean;
    created_at: string;
    users: {
      id: string;
      name: string | null;
      email: string;
      phone: string | null;
      country: string | null;
    } | null;
  }[];
  waba: {
    id: string;
    waba_id: string;
    phone_number_id: string;
    display_phone: string;
    verified_name: string;
    quality_rating: string;
    messaging_tier: string;
    status: string;
    last_synced_at: string;
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
    plans: {
      id: string;
      name: string;
      price: number;
      currency: string;
      billing_cycle: string;
    } | null;
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
  onOpenWallet: (org: { id: string; name: string; wallet_balance: number; currency: string }) => void;
  onOpenPlan: (org: { id: string; name: string }) => void;
  onToggleSuspend: (org: { id: string; is_suspended: boolean }) => void;
}

export function OrgDetailsDrawer({
  organizationId,
  onClose,
  onOpenWallet,
  onOpenPlan,
  onToggleSuspend,
}: OrgDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "waba" | "billing">("overview");

  const details = useQuery({
    queryKey: ["platform", "organization", organizationId, "details"],
    queryFn: () => api.get<OrgDetailsResponse>(`/platform/organizations/${organizationId}/details`),
  });

  const data = details.data;
  const org = data?.organization;
  const waba = data?.waba;

  const qualityBadgeTone = (q?: string) => {
    if (q === "high") return "success";
    if (q === "medium") return "warning";
    if (q === "low") return "danger";
    return "neutral";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">
                {org?.name ?? "Loading organization..."}
              </h2>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {org?.slug ?? organizationId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        {org && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="capitalize font-semibold">{org.plan} Plan</Badge>
              {org.is_demo && <Badge tone="info">Demo Account</Badge>}
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

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenWallet(org)}
                className="gap-1.5"
              >
                <Wallet size={14} />
                Wallet
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenPlan(org)}
                className="gap-1.5"
              >
                <CreditCard size={14} />
                Plan
              </Button>
              <Button
                size="sm"
                variant={org.is_suspended ? "outline" : "destructive"}
                onClick={() => onToggleSuspend(org)}
              >
                {org.is_suspended ? "Restore" : "Suspend"}
              </Button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b px-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 py-3 text-sm font-semibold transition-colors mr-6 ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("waba")}
            className={`border-b-2 py-3 text-sm font-semibold transition-colors mr-6 ${
              activeTab === "waba"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            WhatsApp (WABA)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`border-b-2 py-3 text-sm font-semibold transition-colors mr-6 ${
              activeTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Team ({data?.members.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "billing"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Billing & History
          </button>
        </div>

        {/* Body Content */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {details.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          ) : !data || !org ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Could not load organization details.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <>
                  {/* Financial & Plan Stat Cards */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Wallet Balance
                      </p>
                      <p className="mt-1 text-2xl font-black text-[#00C268]">
                        {formatCurrency(Number(org.wallet_balance), org.currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Used for per-message Cloud API charges
                      </p>
                    </Card>

                    <Card className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Subscription / Trial Status
                      </p>
                      <p className="mt-1 text-xl font-bold capitalize">
                        {org.plan} Tier
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {org.trial_ends_at
                          ? `Expires: ${new Date(org.trial_ends_at).toLocaleDateString()}`
                          : "No expiration set"}
                      </p>
                    </Card>
                  </div>

                  {/* Resource Usage Counters */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Resource Usage
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border bg-card p-3.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users size={16} />
                          <span className="text-xs font-semibold">Contacts</span>
                        </div>
                        <p className="mt-2 text-xl font-bold">
                          {data.counts.contacts.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-card p-3.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Send size={16} />
                          <span className="text-xs font-semibold">Campaigns</span>
                        </div>
                        <p className="mt-2 text-xl font-bold">
                          {data.counts.campaigns.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-card p-3.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageSquare size={16} />
                          <span className="text-xs font-semibold">Templates</span>
                        </div>
                        <p className="mt-2 text-xl font-bold">
                          {data.counts.templates.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-card p-3.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Zap size={16} />
                          <span className="text-xs font-semibold">Flows</span>
                        </div>
                        <p className="mt-2 text-xl font-bold">
                          {data.counts.flows.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-card p-3.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Zap size={16} />
                          <span className="text-xs font-semibold">Chatbots</span>
                        </div>
                        <p className="mt-2 text-xl font-bold">
                          {data.counts.chatbots.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-card p-3.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <History size={16} />
                          <span className="text-xs font-semibold">Messages</span>
                        </div>
                        <p className="mt-2 text-xl font-bold">
                          {data.counts.messages.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* General Meta Information */}
                  <Card className="p-4 space-y-3">
                    <h3 className="text-sm font-bold">Organization Metadata</h3>
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Tenant ID: </span>
                        <span className="font-mono">{org.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created: </span>
                        <span>{new Date(org.created_at).toLocaleString()}</span>
                      </div>
                      {org.suspended_reason && (
                        <div className="sm:col-span-2 text-destructive">
                          <span className="font-semibold">Suspension Reason: </span>
                          <span>{org.suspended_reason}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {/* Tab 2: WhatsApp WABA */}
              {activeTab === "waba" && (
                <div className="space-y-4">
                  {waba ? (
                    <>
                      <Card className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                              <Phone size={20} />
                            </span>
                            <div>
                              <p className="text-lg font-bold">{waba.display_phone}</p>
                              <p className="text-xs text-muted-foreground">
                                {waba.verified_name || "Unverified Name"}
                              </p>
                            </div>
                          </div>
                          <Badge
                            tone={waba.status === "connected" ? "success" : "danger"}
                          >
                            {waba.status}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Quality Rating</p>
                            <div className="mt-1">
                              <Badge tone={qualityBadgeTone(waba.quality_rating)}>
                                {waba.quality_rating?.toUpperCase() || "UNKNOWN"}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Messaging Tier</p>
                            <p className="mt-1 text-sm font-bold">{waba.messaging_tier || "TIER_1K"}</p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">WABA ID</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">{waba.waba_id}</p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Phone Number ID</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">{waba.phone_number_id}</p>
                          </div>
                        </div>

                        {waba.last_synced_at && (
                          <p className="text-xs text-muted-foreground border-t pt-3">
                            Last synced with Meta: {new Date(waba.last_synced_at).toLocaleString()}
                          </p>
                        )}
                      </Card>
                    </>
                  ) : (
                    <Card className="p-8 text-center">
                      <Phone size={36} className="mx-auto text-muted-foreground opacity-40 mb-3" />
                      <h4 className="font-bold">No WhatsApp Account Connected</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This organization has not yet connected a Meta WhatsApp Cloud API number.
                      </p>
                    </Card>
                  )}
                </div>
              )}

              {/* Tab 3: Members */}
              {activeTab === "members" && (
                <div className="space-y-3">
                  {data.members.map((member) => (
                    <Card key={member.id} className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(member.users?.name ?? member.users?.email)}
                          {member.is_online && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">
                            {member.users?.name ?? "Unnamed User"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.users?.email}
                          </p>
                        </div>
                      </div>

                      <Badge className="capitalize font-semibold text-xs">
                        {member.role}
                      </Badge>
                    </Card>
                  ))}
                </div>
              )}

              {/* Tab 4: Billing & Subscriptions */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  {/* Active Subscriptions */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold">Subscription Ledger</h3>
                    {data.subscriptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No subscription history recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.subscriptions.map((sub) => (
                          <Card key={sub.id} className="p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-sm">
                                {sub.plans?.name ?? "Custom"} Plan
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  ({sub.plans?.billing_cycle || "monthly"})
                                </span>
                              </p>
                              <Badge
                                tone={sub.status === "active" ? "success" : "neutral"}
                              >
                                {sub.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <span>Starts: </span>
                                <span>{new Date(sub.starts_at).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span>Ends: </span>
                                <span>{new Date(sub.ends_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {sub.notes && (
                              <p className="text-xs italic text-muted-foreground border-t pt-1.5">
                                Note: {sub.notes}
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Wallet Adjustments */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold">Recent Wallet Transactions</h3>
                    {data.walletTransactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No wallet transactions found.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.walletTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between rounded-lg border p-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold">{tx.description || "Wallet adjustment"}</p>
                              <p className="text-muted-foreground">
                                {new Date(tx.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold ${
                                  tx.type === "credit" ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {tx.type === "credit" ? "+" : "-"}
                                {formatCurrency(Number(tx.amount))}
                              </p>
                              <p className="text-muted-foreground">
                                Bal: {formatCurrency(Number(tx.balance_after))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
