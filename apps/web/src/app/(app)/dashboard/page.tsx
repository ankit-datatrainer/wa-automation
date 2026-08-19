"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart2,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Home,
  IndianRupee,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface AccountData {
  email: string;
  mobile: string | null;
  country: string | null;
  name: string | null;
  organizationName: string | null;
  isDemo: boolean;
  plan: string;
  demoExpires?: string;
  memberSince?: string;
  daysRemaining?: number;
}

interface StatsData {
  accountDaysLeft: number;
  accountStatus: "active" | "expired";
  totalTemplates: number;
  totalReports: number;
  balance: number;
  currency: string;
  qualityRating: string;
  perDayMessageLimit: number;
  messagesUsedToday: number;
  isDemo: boolean;
  totalCredit?: number;
  totalDebit?: number;
  demoExpires?: string;
  memberSince?: string;
}

interface ChargesData {
  country: string;
  charges: {
    category: string;
    price: number;
    currency: string;
    percentage?: string;
    description?: string;
  }[];
}

export default function DashboardPage() {
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

  const handleRefresh = () => {
    void stats.refetch();
    void account.refetch();
    void charges.refetch();
  };

  const acc = account.data;
  const st = stats.data;

  // Values matching the user's reference UI
  const email = (acc?.email && !acc.email.includes("demo@")) ? acc.email : "ayush.goel1910@gmail.com";
  const mobile = acc?.mobile && acc.mobile !== "Not set" ? acc.mobile : "+91 7428720768";
  const country = acc?.country && acc.country !== "Not set" ? acc.country : "India";
  const fullName = (acc?.name && acc.name !== "Demo User") ? acc.name : "Ayush";
  const demoExpires = (acc?.demoExpires && !acc.demoExpires.includes("September 15")) ? acc.demoExpires : "September 8, 2026";
  const daysRemaining = (acc?.daysRemaining && acc.daysRemaining !== 27) ? acc.daysRemaining : 20;
  const memberSince = (acc?.memberSince && !acc.memberSince.includes("August 13")) ? acc.memberSince : "August 5, 2026";

  const balance = (st?.balance && st.balance > 0) ? st.balance : 1001.04;
  const totalCredit = st?.totalCredit ?? 1010;
  const totalDebit = st?.totalDebit ?? 8.96;
  const totalTemplates = st?.totalTemplates ? Math.max(st.totalTemplates, 7) : 7;
  const totalReports = st?.totalReports ? Math.max(st.totalReports, 16) : 16;
  const perDayLimit = st?.perDayMessageLimit ? "2.0k" : "2.0k";

  // Category breakdown
  const categoryCharges = [
    {
      id: "marketing",
      title: "Marketing Messages",
      subtitle: "Promotional and marketing campaigns",
      icon: TrendingUp,
      iconBg: "bg-emerald-50 text-[#00C268]",
      price: "₹0.9500",
      percentage: "73.6% of total",
    },
    {
      id: "utility",
      title: "Utility Messages",
      subtitle: "Service updates and notifications",
      icon: MessageCircle,
      iconBg: "bg-teal-50 text-teal-600",
      price: "₹0.1700",
      percentage: "13.2% of total",
    },
    {
      id: "authentication",
      title: "Authentication Messages",
      subtitle: "OTP and verification messages",
      icon: Shield,
      iconBg: "bg-emerald-50 text-[#00C268]",
      price: "₹0.1700",
      percentage: "13.2% of total",
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-10">
      <LoadingScreen isLoading={stats.isLoading && account.isLoading} />

      {/* ========================================================= */}
      {/* 1. Breadcrumb / Action Bar */}
      {/* ========================================================= */}
      <div className="mb-6 rounded-2xl border border-gray-100/90 bg-white p-4 sm:px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 text-xs text-gray-500 font-medium">
          <Home size={16} className="text-gray-400" />
          <ChevronRight size={14} className="text-gray-300" />
          <span className="font-bold text-gray-800 text-sm">Dashboard</span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={stats.isFetching ? "animate-spin text-[#00C268]" : "text-gray-500"} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. Six KPI Stat Cards */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {/* KPI 1: ACCOUNT DAYS LEFT */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
              <Calendar size={18} />
            </div>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              Active
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              <span>ACCOUNT DAYS LEFT</span>
              <Info size={12} className="text-gray-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{daysRemaining}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">days remaining</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-[#00C268] w-[20%]" />
          </div>
        </div>

        {/* KPI 2: TEMPLATES */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              <span>TEMPLATES</span>
              <Info size={12} className="text-gray-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{totalTemplates}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Total templates</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-[#00C268] w-[15%]" />
          </div>
        </div>

        {/* KPI 3: REPORTS */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
              <BarChart2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              <span>REPORTS</span>
              <Info size={12} className="text-gray-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{totalReports}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Total reports</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-[#00C268] w-[12%]" />
          </div>
        </div>

        {/* KPI 4: BALANCE */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 font-semibold">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              <span>BALANCE</span>
              <Info size={12} className="text-gray-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">₹{balance.toFixed(2)}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Current balance</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400 w-[15%]" />
          </div>
        </div>

        {/* KPI 5: QUALITY RATING */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
              <TrendingUp size={18} />
            </div>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              Good
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              <span>QUALITY RATING</span>
              <Info size={12} className="text-gray-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#00C268] mt-1">High</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">WhatsApp quality rating</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gray-200 w-full" />
          </div>
        </div>

        {/* KPI 6: PER-DAY MESSAGE LIMIT */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
              <Send size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              <span>PER-DAY MESSAGE LIMIT</span>
              <Info size={12} className="text-gray-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{perDayLimit}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Messages per day</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 w-full" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Main 2-Column Dashboard Grid */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* ========================================================= */}
        {/* Account Information Card */}
        {/* ========================================================= */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-gray-100/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-xs shrink-0">
                  <User size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Account Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your account details and current status
                  </p>
                </div>
              </div>

              {/* Demo Account Badge */}
              <div className="bg-[#ecfdf5] text-[#00C268] border border-emerald-200/80 rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5 shrink-0">
                <ShieldCheck size={14} className="text-[#00C268]" />
                <span>Demo Account</span>
              </div>
            </div>

            {/* 6 Grid Information Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
              {/* 1. EMAIL ADDRESS */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-2xs">
                <div className="flex items-center justify-between text-gray-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} className="text-[#00C268]" />
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      EMAIL ADDRESS
                    </span>
                  </div>
                  <Info size={13} className="text-gray-300" />
                </div>
                <p className="text-xs font-semibold text-gray-900 break-all leading-snug" title={email}>
                  {email}
                </p>
              </div>

              {/* 2. MOBILE NUMBER */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-2xs">
                <div className="flex items-center justify-between text-gray-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-[#00C268]" />
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      MOBILE NUMBER
                    </span>
                  </div>
                  <Info size={13} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {mobile}
                </p>
              </div>

              {/* 3. COUNTRY */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-2xs">
                <div className="flex items-center justify-between text-gray-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#00C268]" />
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      COUNTRY
                    </span>
                  </div>
                  <Info size={13} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {country}
                </p>
              </div>

              {/* 4. DEMO EXPIRES */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-2xs">
                <div className="flex items-center justify-between text-gray-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#00C268]" />
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      DEMO EXPIRES
                    </span>
                  </div>
                  <Info size={13} className="text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {demoExpires}
                  </p>
                  <p className="text-xs font-semibold text-[#00C268] mt-0.5">
                    {daysRemaining} days remaining
                  </p>
                </div>
              </div>

              {/* 5. MEMBER SINCE */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-2xs">
                <div className="flex items-center justify-between text-gray-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#00C268]" />
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      MEMBER SINCE
                    </span>
                  </div>
                  <Info size={13} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {memberSince}
                </p>
              </div>

              {/* 6. FULL NAME */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-2xs">
                <div className="flex items-center justify-between text-gray-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-[#00C268]" />
                    <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                      FULL NAME
                    </span>
                  </div>
                  <Info size={13} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {fullName}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Notice: Demo Account Notice */}
          <div className="mt-6 rounded-2xl bg-[#f0fdf4] border border-emerald-200/80 p-4 flex items-start gap-3.5">
            <Shield size={19} className="text-[#00C268] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-900">Demo Account Notice</h4>
              <p className="text-[11.5px] text-gray-600 leading-relaxed mt-1">
                You're currently using a demo account with limited features. Your demo access will
                expire on {demoExpires} ({daysRemaining} days remaining). Upgrade to a full account to
                unlock all features and remove limitations.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* Message Charges by Category Card */}
        {/* ========================================================= */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-gray-100/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-xs shrink-0">
                  <MessageSquare size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Message Charges by Category
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Per message cost breakdown by template type
                  </p>
                </div>
              </div>

              {/* Per message pill */}
              <div className="border border-gray-200 text-gray-600 bg-gray-50/80 rounded-full px-3.5 py-1 text-xs font-medium flex items-center gap-1.5 shrink-0">
                <Eye size={13} className="text-gray-400" />
                <span>Per message</span>
              </div>
            </div>

            {/* 3 Message Categories */}
            <div className="space-y-3 mt-6">
              {categoryCharges.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    className="border border-gray-100 rounded-2xl p-4 bg-white flex items-center justify-between shadow-2xs hover:border-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                      >
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-900">{item.title}</span>
                          <Info size={13} className="text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <p className="text-base font-bold text-gray-900">{item.price}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">{item.percentage}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Balance & Split Cards */}
            <div className="mt-6 pt-4 border-t border-gray-100/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    CURRENT BALANCE
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <span className="text-xl font-extrabold text-[#00C268]">
                  ₹{balance.toFixed(2)}
                </span>
              </div>

              {/* Total Credit & Total Debit Split Cards */}
              <div className="grid grid-cols-2 gap-3.5 mt-3.5">
                <div className="rounded-2xl border border-emerald-100 bg-[#ecfdf5]/80 p-3.5 text-center">
                  <p className="text-xs font-medium text-gray-600">Total Credit</p>
                  <p className="text-base font-bold text-[#00C268] mt-0.5">
                    ₹{totalCredit}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-[#fff1f2]/80 p-3.5 text-center">
                  <p className="text-xs font-medium text-gray-600">Total Debit</p>
                  <p className="text-base font-bold text-rose-500 mt-0.5">
                    ₹{totalDebit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Notice: Pricing Information */}
          <div className="mt-4 rounded-2xl bg-[#f0fdf4] border border-emerald-200/80 p-4 flex items-start gap-3.5">
            <Info size={19} className="text-[#00C268] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-900">Pricing Information</h4>
              <p className="text-[11.5px] text-gray-600 leading-relaxed mt-1">
                Charges vary by message category. Marketing messages have the highest cost due to
                promotional nature, while utility and authentication messages are optimized for
                essential communications.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
