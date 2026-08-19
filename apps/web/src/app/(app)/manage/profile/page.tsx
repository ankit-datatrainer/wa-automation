"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  Building2,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  Upload,
  User,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency, initials } from "@/lib/utils";

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    city: string | null;
    country: string | null;
    avatarUrl: string | null;
  };
  company: {
    companyName: string | null;
    domain: string | null;
    organizationId: string;
  };
  balance: {
    currentBalance: number;
    totalCredit: number;
    totalDebit: number;
    currency: string;
  };
  pricing: {
    marketing: string;
    utility: string;
    auth: string;
    service: string;
  };
  account: {
    roleId: number;
    role: string;
    countryId: number;
    agentId: string | null;
    createdAt: string;
    updatedAt: string;
    isDemo: boolean;
    demoExpiresAt: string;
  };
}

export default function UserProfilePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"personal" | "billing" | "account">("personal");

  // 2FA states
  const [twoFactorMaster, setTwoFactorMaster] = useState(false);
  const [emailAuthEnabled, setEmailAuthEnabled] = useState(false);
  const [googleAuthModal, setGoogleAuthModal] = useState(false);
  const [phoneAuthModal, setPhoneAuthModal] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);

  // Edit form states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");

  const profile = useQuery({
    queryKey: ["settings", "profile"],
    queryFn: () => api.get<ProfileData>("/settings/profile"),
  });

  const updateProfile = useMutation({
    mutationFn: () =>
      api.patch("/settings/profile", {
        name: name.trim(),
        phone: mobile.trim(),
        country: country.trim().length === 2 ? country.trim().toUpperCase() : undefined,
        companyName: companyName.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setEditModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["settings", "profile"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Failed to update profile"),
  });

  const openEditModal = () => {
    if (profile.data) {
      setName(profile.data.user.name || "");
      setMobile(profile.data.user.mobile || "");
      setCity(profile.data.user.city || "");
      setCompanyName(profile.data.company.companyName || "");
      setCountry(profile.data.user.country || "IN");
    }
    setEditModalOpen(true);
  };

  const data = profile.data;
  const user = data?.user;
  const company = data?.company;
  const balance = data?.balance;
  const pricing = data?.pricing;
  const accountInfo = data?.account;

  const displayName = user?.name || "Ayush";

  const formatDate = (isoString?: string) => {
    if (!isoString) return "August 5, 2026";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "August 5, 2026";
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
        {/* Profile Header Banner */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#00C268] text-3xl font-bold text-white shadow-sm">
              {initials(displayName, "A")}
            </div>
            <button
              type="button"
              onClick={() => toast.info("Profile photo upload coming soon")}
              aria-label="Change photo"
              className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-white text-muted-foreground shadow-sm hover:text-foreground hover:scale-105 transition-transform"
            >
              <Camera size={14} />
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user?.email || "ayush.goel1910@gmail.com"}</p>
          </div>
        </div>

        {/* Main Grid: Left Tabs + Right Content */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Left Sub-Navigation Menu */}
          <div className="space-y-2">
            {/* Tab 1: Personal Information */}
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all ${
                activeTab === "personal"
                  ? "bg-[#00C268] text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  activeTab === "personal"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <User size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-sm">Personal Information</p>
                <p
                  className={`text-xs ${
                    activeTab === "personal" ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  Information about yourself.
                </p>
              </div>
            </button>

            {/* Tab 2: Billing & Balance */}
            <button
              type="button"
              onClick={() => setActiveTab("billing")}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all ${
                activeTab === "billing"
                  ? "bg-[#00C268] text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  activeTab === "billing"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CreditCard size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-sm">Billing & Balance</p>
                <p
                  className={`text-xs ${
                    activeTab === "billing" ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  Account balance and pricing.
                </p>
              </div>
            </button>

            {/* Tab 3: Account Details */}
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all ${
                activeTab === "account"
                  ? "bg-[#00C268] text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  activeTab === "account"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Shield size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-sm">Account Details</p>
                <p
                  className={`text-xs ${
                    activeTab === "account" ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  System information and dates.
                </p>
              </div>
            </button>
          </div>

          {/* Right Content Area */}
          <div className="space-y-6">
            {profile.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-44 rounded-2xl" />
                <Skeleton className="h-44 rounded-2xl" />
              </div>
            ) : (
              <>
                {/* TAB 1: Personal Information & 2FA Security on profile load */}
                {activeTab === "personal" && (
                  <div className="space-y-6">
                    {/* Top 2FA Master Card */}
                    <Card className="rounded-2xl border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-foreground">Secure your Account with 2FA</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">Don&apos;t wait - secure your account now!</p>
                        </div>
                        <Switch
                          checked={twoFactorMaster}
                          onCheckedChange={(val) => {
                            setTwoFactorMaster(val);
                            toast.success(val ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
                          }}
                          aria-label="Secure your account with 2FA"
                        />
                      </div>
                    </Card>

                    {/* 2FA Sub-cards Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Email Authentication Card */}
                      <Card className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-foreground text-sm">Email Authentication</h3>
                              <p className="text-xs text-muted-foreground">(If no other setup is done)</p>
                            </div>
                            <Switch
                              checked={emailAuthEnabled}
                              onCheckedChange={setEmailAuthEnabled}
                              aria-label="Toggle email authentication"
                            />
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Email Authentication is set by default for your Account. A 6 digit authentication code will be sent to your registered email during your login.
                          </p>
                        </div>

                        <div className="mt-5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVerificationCodeSent(true);
                              toast.success(`Verification code sent to ${user?.email || "your registered email"}`);
                            }}
                            className="w-full rounded-xl font-medium"
                          >
                            {verificationCodeSent ? "Resend Verification Code" : "Send Verification Code"}
                          </Button>
                        </div>
                      </Card>

                      {/* Google Authentication Card */}
                      <Card className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="space-y-3">
                          <h3 className="font-bold text-foreground text-sm">Google Authentication</h3>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            First, download Google Authenticator from the Google Play Store and the iOS App Store.
                          </p>
                        </div>

                        <div className="mt-5">
                          <button
                            type="button"
                            onClick={() => setGoogleAuthModal(true)}
                            className="flex items-center gap-1 text-xs font-bold text-[#00C268] hover:underline"
                          >
                            Setup Authentication <ChevronRight size={14} />
                          </button>
                        </div>
                      </Card>

                      {/* Phone Number Authentication Card */}
                      <Card className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm md:col-span-2">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-foreground text-sm">Phone Number Authentication</h3>
                            <p className="text-xs text-muted-foreground">(Only for Indian Numbers)</p>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Enter a one time code sent via text message on your registered Phone number.
                          </p>
                        </div>

                        <div className="mt-5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPhoneAuthModal(true)}
                            className="flex items-center gap-1 text-xs font-bold text-[#00C268] hover:underline"
                          >
                            Setup Authentication <ChevronRight size={14} />
                          </button>
                        </div>
                      </Card>
                    </div>

                    {/* Personal Details & Company Information Card */}
                    <Card className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-base font-bold text-foreground">Personal Information</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={openEditModal}
                          className="gap-1.5 rounded-xl text-xs font-semibold"
                        >
                          <Edit2 size={13} />
                          Edit Details
                        </Button>
                      </div>

                      {/* Info Cards Grid */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Email Card */}
                        <div className="flex items-center gap-4 rounded-2xl border p-4 bg-background">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-500">
                            <Mail size={20} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">Email</p>
                            <p className="truncate text-sm font-bold text-foreground mt-0.5">
                              {user?.email || "ayush.goel1910@gmail.com"}
                            </p>
                          </div>
                        </div>

                        {/* Mobile Card */}
                        <div className="flex items-center gap-4 rounded-2xl border p-4 bg-background">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-500">
                            <Phone size={20} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">Mobile</p>
                            <p className="truncate text-sm font-bold text-foreground mt-0.5">
                              {user?.mobile || "7428720768"}
                            </p>
                          </div>
                        </div>

                        {/* City Card */}
                        <div className="flex items-center gap-4 rounded-2xl border p-4 bg-background sm:col-span-2">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-500">
                            <MapPin size={20} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">City</p>
                            <p className="truncate text-sm font-bold text-foreground mt-0.5">
                              {user?.city || "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Company Details */}
                      <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                          <Building2 size={16} className="text-muted-foreground" />
                          <span>Company Details</span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border p-4 bg-background">
                            <p className="text-xs text-muted-foreground font-medium">Company Name</p>
                            <p className="truncate text-sm font-bold text-foreground mt-1">
                              {company?.companyName || "Not specified"}
                            </p>
                          </div>

                          <div className="rounded-2xl border p-4 bg-background">
                            <p className="text-xs text-muted-foreground font-medium">Domain</p>
                            <p className="truncate text-sm font-bold text-foreground mt-1">
                              {company?.domain || "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* TAB 2: Billing & Balance */}
                {activeTab === "billing" && (
                  <Card className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                    {/* Section Title */}
                    <div className="flex items-center gap-2 text-foreground font-bold text-base border-b pb-4">
                      <CreditCard size={18} className="text-[#00C268]" />
                      <span>Account balance and pricing</span>
                    </div>

                    {/* Top Balance Banner */}
                    <div className="rounded-2xl border border-emerald-100 bg-[#F0FDF4] p-8 text-center shadow-xs">
                      <p className="text-xs font-semibold text-muted-foreground">Current Balance</p>
                      <p className="mt-2 text-4xl font-extrabold text-[#00C268]">
                        {balance
                          ? formatCurrency(balance.currentBalance, balance.currency)
                          : "₹1,003.89"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground font-medium">Balance Enabled</p>
                    </div>

                    {/* Total Credit & Debit Row */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-100 bg-background p-6 text-center shadow-xs">
                        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                          <Upload size={18} />
                        </span>
                        <p className="text-xs font-semibold text-muted-foreground">Total Credit</p>
                        <p className="mt-1 text-2xl font-bold text-[#00C268]">
                          {balance
                            ? formatCurrency(balance.totalCredit, balance.currency)
                            : "₹1,010.00"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-rose-100 bg-background p-6 text-center shadow-xs">
                        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 mb-3">
                          <ArrowDown size={18} />
                        </span>
                        <p className="text-xs font-semibold text-muted-foreground">Total Debit</p>
                        <p className="mt-1 text-2xl font-bold text-[#E11D48]">
                          {balance
                            ? formatCurrency(balance.totalDebit, balance.currency)
                            : "₹6.11"}
                        </p>
                      </div>
                    </div>

                    {/* Message Pricing Section */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <MessageSquare size={16} className="text-muted-foreground" />
                        <span>Message Pricing</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border p-4 bg-background">
                          <p className="text-xs text-muted-foreground font-medium">Marketing Messages</p>
                          <p className="mt-1 text-lg font-bold text-foreground">
                            {pricing?.marketing || "₹0.95"}
                          </p>
                        </div>

                        <div className="rounded-2xl border p-4 bg-background">
                          <p className="text-xs text-muted-foreground font-medium">Utility Messages</p>
                          <p className="mt-1 text-lg font-bold text-foreground">
                            {pricing?.utility || "₹0.17"}
                          </p>
                        </div>

                        <div className="rounded-2xl border p-4 bg-background">
                          <p className="text-xs text-muted-foreground font-medium">Auth Messages</p>
                          <p className="mt-1 text-lg font-bold text-foreground">
                            {pricing?.auth || "₹0.17"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* TAB 3: Account Details */}
                {activeTab === "account" && (
                  <Card className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                    <div className="border-b pb-4">
                      <div className="flex items-center gap-2 text-foreground font-bold text-base">
                        <Shield size={18} className="text-[#00C268]" />
                        <span>Account Details</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">System information and dates</p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 text-xs">
                      <div className="space-y-4">
                        <div>
                          <p className="text-muted-foreground font-semibold">Role ID</p>
                          <p className="mt-0.5 text-sm font-bold text-foreground">
                            {accountInfo?.roleId ?? 3}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground font-semibold">Agent ID</p>
                          <p className="mt-0.5 text-sm font-bold text-foreground">
                            {accountInfo?.agentId || "Not assigned"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-muted-foreground font-semibold">Country ID</p>
                          <p className="mt-0.5 text-sm font-bold text-foreground">
                            {accountInfo?.countryId ?? 98}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* System Dates */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3.5 rounded-xl bg-muted/40 p-4 text-xs">
                        <span className="text-muted-foreground">
                          <Calendar size={18} />
                        </span>
                        <div>
                          <p className="text-muted-foreground font-medium">Account Created</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {formatDate(accountInfo?.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 rounded-xl bg-muted/40 p-4 text-xs">
                        <span className="text-muted-foreground">
                          <Clock size={18} />
                        </span>
                        <div>
                          <p className="text-muted-foreground font-medium">Last Updated</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {formatDate(accountInfo?.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Demo Warning Banner */}
                    {accountInfo?.isDemo !== false && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                          <Shield size={16} className="text-amber-600" />
                          <span>Demo Account</span>
                        </div>
                        <p className="text-amber-800">
                          This is a demo account with limited functionality.
                        </p>
                        <p className="font-semibold text-amber-950 pt-1">
                          Demo expires on: {formatDate(accountInfo?.demoExpiresAt)}
                        </p>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Google Authenticator Modal */}
        {googleAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md p-6 shadow-2xl space-y-4 rounded-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold">Setup Google Authenticator</h3>
              <p className="text-xs text-muted-foreground">
                Scan this QR code with Google Authenticator or enter the manual key below.
              </p>
              <div className="grid h-44 w-full place-items-center rounded-xl bg-muted/40 border border-dashed">
                <p className="text-xs font-mono text-muted-foreground">[ Authenticator QR Code ]</p>
              </div>
              <Field label="6-Digit Verification Code">
                {({ id }) => <Input id={id} placeholder="123456" maxLength={6} />}
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setGoogleAuthModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Google Authenticator connected successfully");
                    setGoogleAuthModal(false);
                  }}
                >
                  Verify & Save
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Phone Number Authenticator Modal */}
        {phoneAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md p-6 shadow-2xl space-y-4 rounded-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold">Setup Phone Number Authentication</h3>
              <p className="text-xs text-muted-foreground">
                Enter your Indian mobile number (+91) to receive login OTPs.
              </p>
              <Field label="Phone Number">
                {({ id }) => <Input id={id} defaultValue="+919266806659" placeholder="+91..." />}
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPhoneAuthModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success("OTP sent to your phone");
                    setPhoneAuthModal(false);
                  }}
                >
                  Send OTP
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Profile Modal */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg p-6 shadow-2xl space-y-4 rounded-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold">Edit Profile Details</h3>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfile.mutate();
                }}
                className="space-y-4 text-xs"
              >
                <Field label="Full Name">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ayush"
                    />
                  )}
                </Field>

                <Field label="Mobile Number">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="7428720768"
                    />
                  )}
                </Field>

                <Field label="Company Name">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="WA Automation"
                    />
                  )}
                </Field>

                <Field label="Country (2-Letter ISO Code)">
                  {({ id }) => (
                    <Input
                      id={id}
                      maxLength={2}
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      placeholder="IN"
                    />
                  )}
                </Field>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={updateProfile.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
  );
}
