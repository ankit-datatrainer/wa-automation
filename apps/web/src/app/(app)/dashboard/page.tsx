"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, FileText, IndianRupee, Megaphone, Send, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/states";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { StatCard } from "./stat-card";
import { MessageVolumeChart } from "./charts/message-volume-chart";
import { DeliveryRateChart } from "./charts/delivery-rate-chart";
import { CategorySpendChart } from "./charts/category-spend-chart";
import { fillSeries, halfTrend, useOverview, type PeriodValue } from "./charts/use-overview";
import { GreetingHero } from "./_components/greeting-hero";
import { ConnectionCard } from "./_components/connection-card";
import { OnboardingChecklist, type ChecklistStep } from "./_components/onboarding-checklist";
import { RecentCampaigns } from "./_components/recent-campaigns";
import { RecentConversations } from "./_components/recent-conversations";
import { AccountCard } from "./_components/account-card";
import { PricingCard } from "./_components/pricing-card";
import type { AccountData, ChargesData, MeResponse, StatsData } from "./_components/types";

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  // Only greet a cold load with the branded splash; returning to the page is instant.
  const [showSplash] = useState(() => !queryClient.getQueryData(["dashboard", "stats"]));
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodValue>("30");
  const days = Number(period);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/me"),
  });
  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<StatsData>("/dashboard/stats"),
  });
  const account = useQuery({
    queryKey: ["dashboard", "account"],
    queryFn: () => api.get<AccountData>("/dashboard/account"),
  });
  const charges = useQuery({
    queryKey: ["dashboard", "charges"],
    queryFn: () => api.get<ChargesData>("/dashboard/message-charges"),
  });
  const contacts = useQuery({
    queryKey: ["contacts", "count"],
    queryFn: () => api.get<{ total: number }>("/contacts", { page: 1, pageSize: 1 }),
  });
  const overview = useOverview(days);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["contacts", "count"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const st = stats.data;
  const org = me.data?.organization;
  const currency = st?.currency ?? org?.currency ?? "INR";
  const balance = st?.balance ?? org?.walletBalance ?? null;

  const series = useMemo(() => fillSeries(overview.data?.series, days), [overview.data?.series, days]);
  const outbound = series.map((b) => b.outbound);
  const delivered = series.map((b) => b.delivered);
  const totals = overview.data?.totals;

  const steps: ChecklistStep[] = [
    {
      title: "Connect your WhatsApp number",
      description: "Add your WABA ID, phone number ID and access token.",
      href: "/manage/credentials",
      done: me.data?.waba?.status === "connected",
    },
    {
      title: "Import your contacts",
      description: "Upload a CSV or add contacts one by one.",
      href: "/contacts",
      done: (contacts.data?.total ?? 0) > 0,
    },
    {
      title: "Create a message template",
      description: "Needed to message customers outside the 24-hour window.",
      href: "/campaigns/templates",
      done: (st?.totalTemplates ?? 0) > 0,
    },
    {
      title: "Launch your first campaign",
      description: "Broadcast an approved template to your audience.",
      href: "/campaigns/new",
      done: (st?.totalReports ?? 0) > 0,
    },
    {
      title: "Add funds to your wallet",
      description: "Conversations are billed from your wallet balance.",
      href: "/analytics/wallet",
      done: (balance ?? 0) > 0,
    },
  ];
  const setupLoading = me.isLoading || stats.isLoading || contacts.isLoading;
  const showChecklist = setupLoading || steps.some((s) => !s.done);

  return (
    <div className="pb-10">
      {showSplash && <LoadingScreen isLoading={stats.isLoading || me.isLoading} minDurationMs={600} />}

      <PageHeader
        title="Dashboard"
        description="Your WhatsApp workspace at a glance — messaging, campaigns and conversations."
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing}
      />

      {(stats.isError || me.isError) && (
        <div className="mb-6">
          <ErrorState
            message="Some dashboard data could not be loaded. Check your connection and try again."
            onRetry={() => void handleRefresh()}
          />
        </div>
      )}

      <div className="space-y-6">
        <GreetingHero
          name={me.data?.user.name ?? account.data?.name ?? null}
          organizationName={org?.name ?? account.data?.organizationName ?? null}
          plan={org?.plan ?? st?.plan ?? null}
          trialDaysLeft={org?.plan === "trial" || org?.isDemo ? daysUntil(org?.trialEndsAt) : null}
          messagesUsedToday={st ? st.messagesUsedToday : null}
          perDayLimit={st ? st.perDayMessageLimit : undefined}
          loading={me.isLoading}
          usageLoading={stats.isLoading}
        />

        {/* KPI tiles */}
        <Stagger
          stagger={0.06}
          delay={0.1}
          className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
        >
          <StaggerItem className="h-full">
            <StatCard
              icon={Send}
              label="Messages sent"
              value={totals ? totals.outbound : null}
              caption={`Last ${days} days`}
              tooltip="Outbound messages sent from your number in the selected period."
              trend={halfTrend(outbound)}
              spark={totals?.outbound ? outbound : undefined}
              loading={overview.isLoading}
              href="/analytics"
              accent="brand"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <StatCard
              icon={CheckCheck}
              label="Delivery rate"
              value={totals ? totals.deliveryRate * 100 : null}
              format={(n) => `${n.toFixed(1)}%`}
              caption={totals ? `${totals.delivered.toLocaleString()} delivered` : `Last ${days} days`}
              tooltip="Share of outbound messages delivered or read in the selected period."
              spark={totals?.delivered ? delivered : undefined}
              progress={totals ? totals.deliveryRate : undefined}
              loading={overview.isLoading}
              href="/analytics"
              accent="magenta"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <StatCard
              icon={Users}
              label="Contacts"
              value={contacts.data ? contacts.data.total : null}
              caption="Total audience"
              tooltip="Contacts saved in your workspace."
              loading={contacts.isLoading}
              href="/contacts"
              accent="pink"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <StatCard
              icon={FileText}
              label="Templates"
              value={st ? st.totalTemplates : null}
              caption="Message templates"
              tooltip="WhatsApp message templates created in this workspace."
              loading={stats.isLoading}
              href="/campaigns/templates"
              accent="orange"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <StatCard
              icon={Megaphone}
              label="Campaigns"
              value={st ? st.totalReports : null}
              caption="Campaign reports"
              tooltip="Campaigns created, each with a delivery report."
              loading={stats.isLoading}
              href="/campaigns/history"
              accent="brand"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <StatCard
              icon={currency === "INR" ? IndianRupee : Wallet}
              label="Wallet balance"
              value={balance}
              format={(n) => formatCurrency(n, currency)}
              caption="Available credit"
              tooltip="Prepaid balance used to pay for WhatsApp conversations."
              badge={balance !== null && balance <= 0 ? { text: "Top up", tone: "warning" } : undefined}
              loading={stats.isLoading && me.isLoading}
              href="/analytics/wallet"
              accent="magenta"
            />
          </StaggerItem>
        </Stagger>

        {/* Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <FadeIn inView className="lg:col-span-2">
            <MessageVolumeChart period={period} onPeriodChange={setPeriod} />
          </FadeIn>
          <FadeIn inView delay={0.08}>
            <DeliveryRateChart days={days} />
          </FadeIn>
        </div>

        {/* Workspace health */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FadeIn inView>
            <ConnectionCard waba={me.data?.waba} stats={st} loading={me.isLoading} />
          </FadeIn>
          {showChecklist && (
            <FadeIn inView delay={0.06}>
              <OnboardingChecklist steps={steps} loading={setupLoading} />
            </FadeIn>
          )}
          <FadeIn
            inView
            delay={0.12}
            className={cn(showChecklist ? "md:col-span-2 lg:col-span-1" : "lg:col-span-2")}
          >
            <CategorySpendChart days={days} currency={currency} />
          </FadeIn>
        </div>

        {/* Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FadeIn inView>
            <RecentCampaigns />
          </FadeIn>
          <FadeIn inView delay={0.08}>
            <RecentConversations />
          </FadeIn>
        </div>

        {/* Account & billing */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <FadeIn inView className="lg:col-span-3">
            <AccountCard
              account={account.data}
              loading={account.isLoading}
              error={account.isError}
              onRetry={() => void account.refetch()}
            />
          </FadeIn>
          <FadeIn inView delay={0.08} className="lg:col-span-2">
            <PricingCard
              charges={charges.data}
              loading={charges.isLoading}
              error={charges.isError}
              onRetry={() => void charges.refetch()}
              balance={balance}
              currency={currency}
            />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
