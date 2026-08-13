"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  IndianRupee,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "./stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatCompact, formatCurrency } from "@/lib/utils";
import { MessageVolumeChart } from "./charts/message-volume-chart";
import { DeliveryRateChart } from "./charts/delivery-rate-chart";

interface Stats {
  accountDaysLeft: number;
  accountStatus: "active" | "expired";
  totalTemplates: number;
  totalReports: number;
  balance: number;
  currency: string;
  qualityRating: "high" | "medium" | "low" | "unknown";
  perDayMessageLimit: number;
  messagesUsedToday: number;
  isDemo: boolean;
}

interface Account {
  email: string;
  mobile: string | null;
  country: string | null;
  isDemo: boolean;
}

interface Charges {
  country: string;
  charges: { category: string; price: number; currency: string }[];
}

const QUALITY_TONE = {
  high: { tone: "success", label: "Good", className: "text-primary" },
  medium: { tone: "warning", label: "Fair", className: "text-amber-600" },
  low: { tone: "danger", label: "Poor", className: "text-destructive" },
  unknown: { tone: "neutral", label: "—", className: "text-muted-foreground" },
} as const;

export default function DashboardPage() {
  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<Stats>("/dashboard/stats"),
  });
  const account = useQuery({
    queryKey: ["dashboard", "account"],
    queryFn: () => api.get<Account>("/dashboard/account"),
  });
  const charges = useQuery({
    queryKey: ["dashboard", "charges"],
    queryFn: () => api.get<Charges>("/dashboard/message-charges"),
  });

  const refresh = () => {
    void stats.refetch();
    void account.refetch();
    void charges.refetch();
  };

  const s = stats.data;
  const quality = QUALITY_TONE[s?.qualityRating ?? "unknown"];

  return (
    <>
      <PageHeader onRefresh={refresh} refreshing={stats.isFetching} />

      {stats.isError ? (
        <ErrorState message="Could not load dashboard statistics." onRetry={refresh} />
      ) : stats.isLoading || !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            icon={CalendarDays}
            label="Account Days Left"
            value={String(s.accountDaysLeft)}
            caption="days remaining"
            tooltip="Days remaining before your plan or trial expires."
            badge={{
              text: s.accountStatus === "active" ? "Active" : "Expired",
              tone: s.accountStatus === "active" ? "success" : "danger",
            }}
            progress={s.accountDaysLeft / 30}
          />
          <StatCard
            icon={MessageSquare}
            label="Templates"
            value={String(s.totalTemplates)}
            caption="Total templates"
            tooltip="Message templates you have created, across all approval states."
            progress={Math.min(1, s.totalTemplates / 20)}
          />
          <StatCard
            icon={BarChart3}
            label="Reports"
            value={String(s.totalReports)}
            caption="Total reports"
            tooltip="Campaign reports available in Campaign History."
            progress={Math.min(1, s.totalReports / 50)}
          />
          <StatCard
            icon={IndianRupee}
            label="Balance"
            value={formatCurrency(s.balance, s.currency)}
            caption="Current balance"
            tooltip="Wallet balance available for message charges."
            progress={Math.min(1, s.balance / 5000)}
            progressClassName="bg-amber-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Quality Rating"
            value={s.qualityRating === "unknown" ? "—" : capitalize(s.qualityRating)}
            caption="WhatsApp quality rating"
            tooltip="Meta's quality rating for your number. A low rating can reduce your messaging limit."
            badge={{ text: quality.label, tone: quality.tone }}
            valueClassName={quality.className}
            progress={{ high: 1, medium: 0.6, low: 0.25, unknown: 0 }[s.qualityRating]}
          />
          <StatCard
            icon={Send}
            label="Per-Day Message Limit"
            value={formatCompact(s.perDayMessageLimit)}
            caption="Messages per day"
            tooltip="Unique business-initiated conversations allowed per 24 hours at your current tier."
            progress={s.messagesUsedToday / s.perDayMessageLimit}
            progressClassName="bg-fuchsia-500"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <User size={20} />
              </span>
              <div>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details and current status</CardDescription>
              </div>
            </div>
            {account.data?.isDemo && (
              <Badge tone="success">
                <ShieldCheck size={12} />
                Demo Account
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {account.isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-3">
                <InfoTile icon={Mail} label="Email" value={account.data?.email ?? "—"} />
                <InfoTile icon={Phone} label="Mobile" value={account.data?.mobile ?? "Not set"} />
                <InfoTile icon={MapPin} label="Country" value={account.data?.country ?? "Not set"} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <MessageSquare size={20} />
              </span>
              <div>
                <CardTitle>Message Charges by Category</CardTitle>
                <CardDescription>Per-message cost breakdown by template type</CardDescription>
              </div>
            </div>
            <Badge>Per message</Badge>
          </CardHeader>
          <CardContent>
            {charges.isLoading ? (
              <Skeleton className="h-24" />
            ) : charges.data?.charges.length ? (
              <ul className="divide-y">
                {charges.data.charges.map((charge) => (
                  <li key={charge.category} className="flex items-center justify-between py-3">
                    <span className="font-medium capitalize">{charge.category} Messages</span>
                    <span className="font-bold">
                      {formatCurrency(charge.price, charge.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pricing has not been configured for your country yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Message Analytics ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <MessageVolumeChart />
        <DeliveryRateChart />
      </div>
    </>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon size={13} />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
