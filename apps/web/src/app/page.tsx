"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  X,
  Bell,
  Check,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  Heart,
  Send,
  HelpCircle,
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck,
  Award,
  Zap,
  Shield,
  LogIn,
  UserCheck,
  Sliders,
} from "lucide-react";
import { RosetteBadge } from "@/components/ui/ai-green-tick-logo";

// 🟢 WA Automation Brand Logo Component
function WAAutomationLogo({ className = "h-8" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-neutral-900 ${className}`}>
      <RosetteBadge className="w-8 h-8 shrink-0" />
      <div className="flex items-baseline tracking-tight font-extrabold gap-1 text-2xl">
        <span className="font-black text-[#00C268]">WA</span>
        <span className="font-black text-neutral-950">Automation</span>
      </div>
    </Link>
  );
}

export default function WAAutomationHomePage() {
  const [dealsBannerOpen, setDealsBannerOpen] = useState(true);
  const [dealsAllowed, setDealsAllowed] = useState(false);
  const [blogTab, setBlogTab] = useState<"all" | "webpush" | "whatsapp">("all");
  const [servicesDropdown, setServicesDropdown] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [contactWidgetOpen, setContactWidgetOpen] = useState(false);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);

  // Demo form state
  const [demoForm, setDemoForm] = useState({ name: "", email: "", phone: "", service: "whatsapp" });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setBookDemoOpen(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#FCFCFD] text-neutral-900 font-poppins selection:bg-amber-200 selection:text-neutral-900">
      {/* 🔔 1. Top Push Notification Banner ("Get our Latest Deals & Offers") */}
      {dealsBannerOpen && (
        <aside aria-label="Latest Deals and Offers" className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-2xl rounded-2xl p-3.5 px-4 flex items-center gap-3.5 text-xs max-w-sm w-[90vw]">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-5 h-5 fill-amber-400" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="11" fill="#FACC15" />
                <circle cx="14" cy="14" r="9" fill="#FEF08A" />
                <circle cx="14" cy="14" r="2.5" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-neutral-900 text-xs">Get our Latest Deals &amp; Offers</p>
              <p className="text-neutral-500 text-[11px] truncate">{dealsAllowed ? "Notifications enabled!" : "Click on Allow to receive deals"}</p>
            </div>
            {!dealsAllowed ? (
              <button
                onClick={() => setDealsAllowed(true)}
                className="bg-amber-400 hover:bg-amber-500 text-neutral-950 font-bold px-3 py-1 rounded-lg text-xs transition shadow-sm shrink-0"
              >
                Allow
              </button>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px] shrink-0">
                <Check className="w-3.5 h-3.5" /> Enabled
              </span>
            )}
            <button
              onClick={() => setDealsBannerOpen(false)}
              className="text-neutral-400 hover:text-neutral-700 p-1 transition shrink-0"
              aria-label="Close banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* 🧭 2. Header & Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <WAAutomationLogo />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-700">
            <Link href="/" className="text-neutral-950 font-semibold hover:text-amber-600 transition">
              Home
            </Link>

            {/* Services Dropdown */}
            <div className="relative" onMouseLeave={() => setServicesDropdown(false)}>
              <button
                onMouseEnter={() => setServicesDropdown(true)}
                onClick={() => setServicesDropdown(!servicesDropdown)}
                className="flex items-center gap-1 text-neutral-700 hover:text-neutral-950 transition py-2"
              >
                Services
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${servicesDropdown ? "rotate-180" : ""}`} />
              </button>

              {servicesDropdown && (
                <div
                  onMouseEnter={() => setServicesDropdown(true)}
                  className="absolute top-full left-0 w-64 bg-white border border-neutral-100 rounded-2xl shadow-xl p-2.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <Link
                    href="#services"
                    onClick={() => setServicesDropdown(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 text-neutral-800 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">WhatsApp Business API</p>
                      <p className="text-[11px] text-neutral-400">Broadcasts &amp; team inbox</p>
                    </div>
                  </Link>

                  <Link
                    href="#services"
                    onClick={() => setServicesDropdown(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 text-neutral-800 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Web Push Marketing</p>
                      <p className="text-[11px] text-neutral-400">Re-engage website visitors</p>
                    </div>
                  </Link>

                  <Link
                    href="#services"
                    onClick={() => setServicesDropdown(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 text-neutral-800 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">RCS Messaging</p>
                      <p className="text-[11px] text-neutral-400">Rich interactive messaging</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link href="#proof" className="hover:text-neutral-950 transition">
              Partner
            </Link>
            <Link href="#blogs" className="hover:text-neutral-950 transition">
              Blog
            </Link>
            <Link href="#contact" className="hover:text-neutral-950 transition">
              Contact Us
            </Link>
          </nav>

          {/* Right Action Icons & Book a Demo CTA */}
          <div className="flex items-center gap-4">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-full transition"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Book a Demo Button */}
            <button
              onClick={() => setBookDemoOpen(true)}
              className="hidden sm:inline-flex items-center justify-center bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition shadow-sm hover:shadow-md"
            >
              BOOK A DEMO
            </button>

            {/* Cart Icon / Badge */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-neutral-950 text-white shrink-0 cursor-pointer hover:bg-neutral-800 transition">
              <ShoppingBag className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                0
              </span>
            </div>

            {/* App Sign In / Dashboard Link */}
            <Link
              href="/inbox"
              className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-full transition"
            >
              Open Inbox →
            </Link>
          </div>
        </div>
      </header>

      {/* 🚀 3. Hero Section (Brand Building with Automation & AI) */}
      <section className="relative overflow-hidden pt-8 pb-20 md:pt-14 md:pb-28">
        {/* Subtle background ambient circles */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-6 items-center">
            {/* Left Column: Headlines and Subtext */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-neutral-950 leading-[1.08]">
                Brand Building with Automation &amp; AI{" "}
                <span className="inline-flex items-center align-middle ml-2 p-1.5 px-3 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 rounded-full text-orange-600 shadow-sm text-2xl">
                  🤖
                </span>
              </h1>

              <p className="text-lg md:text-xl text-neutral-600 font-normal max-w-lg leading-relaxed">
                Do you know what it takes to grow your business? Do you want to?
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => setBookDemoOpen(true)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-sm px-8 py-4 rounded-full transition flex items-center gap-2 shadow-lg shadow-neutral-950/10 hover:shadow-neutral-950/20 group"
                >
                  <span>Book a Demo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  href="/login"
                  className="bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-semibold text-sm px-7 py-4 rounded-full transition shadow-sm"
                >
                  Sign In to Dashboard
                </Link>
              </div>

              {/* Trust Micro-Badges */}
              <div className="pt-6 flex items-center gap-6 text-xs text-neutral-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Official Meta Partner</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Instant Setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>15,000+ Brands</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Collage with Joyful Woman, Megaphone, and Shapes */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              {/* Decorative 8-point Dark Navy Star / Sparkle */}
              <div className="absolute -top-6 left-12 z-20 text-neutral-900 opacity-90 animate-pulse">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                </svg>
              </div>

              {/* Decorative Arch Backdrop (Soft Lavender) */}
              <div className="relative w-full max-w-[480px] h-[520px] rounded-t-full bg-gradient-to-b from-[#C4B5FD] via-[#DDD6FE] to-[#F5F3FF] p-4 flex items-end justify-center shadow-xl overflow-hidden">
                {/* Hero Woman Image */}
                <div className="relative w-full h-[460px] z-10">
                  <Image
                    src="/leminai-woman.jpg"
                    alt="Joyful Brand Marketer doing peace sign"
                    fill
                    priority
                    className="object-cover object-top rounded-t-full"
                  />
                </div>
              </div>

              {/* Floating Megaphone Badge (Right) */}
              <div className="absolute -right-4 top-12 z-30 w-36 h-36 rounded-full bg-[#DDD6FE] border-2 border-white shadow-xl flex flex-col items-center justify-center p-3 text-neutral-900 animate-in zoom-in duration-300">
                <span className="text-3xl">📢</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 mt-1">Broadcast</span>
                {/* Hashtag badge */}
                <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-md flex items-center justify-center font-black text-sm text-neutral-800">
                  #
                </div>
              </div>

              {/* Star Badge (Bottom Left) */}
              <div className="absolute bottom-6 -left-6 z-30 bg-black text-white p-3 px-4 rounded-2xl shadow-xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">10X ROI with AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📦 4. "What We Offer" Section (WHY CHOOSE US & Black Container with 3 Cards) */}
      <section id="services" className="py-20 bg-[#FCFCFD]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">WHY CHOOSE US</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-950">What We Offer</h2>
            <p className="text-neutral-500 font-medium">10X your revenue with WA Automation</p>
          </div>

          {/* Black Container with 3 Service Cards */}
          <div className="bg-neutral-950 rounded-[2.5rem] p-8 sm:p-12 lg:p-16 text-white shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {/* Card 1: Web Push Marketing */}
              <div className="space-y-6 flex flex-col justify-between group p-6 rounded-3xl hover:bg-neutral-900/80 transition duration-300">
                <div className="space-y-5">
                  {/* Icon illustration (3D Phone with Bell) */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-105 transition-transform">
                    📲
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Web Push Marketing</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed font-normal">
                    Re-Engage Lost Website Visitors with WA Automation Web Push notifications instantly.
                  </p>
                </div>
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-300 hover:text-white group-hover:translate-x-1 transition"
                >
                  <span>MORE INFO</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 2: RCS Messaging */}
              <div className="space-y-6 flex flex-col justify-between group p-6 rounded-3xl hover:bg-neutral-900/80 transition duration-300">
                <div className="space-y-5">
                  {/* Icon illustration (Yellow Chat Bubbles) */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-105 transition-transform">
                    💬
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">RCS Messaging</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed font-normal">
                    Reach customers by sending interactive, rich media, and engaging rich SMS messages.
                  </p>
                </div>
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-300 hover:text-white group-hover:translate-x-1 transition"
                >
                  <span>MORE INFO</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 3: WhatsApp Business API */}
              <div className="space-y-6 flex flex-col justify-between group p-6 rounded-3xl hover:bg-neutral-900/80 transition duration-300">
                <div className="space-y-5">
                  {/* Icon illustration (WhatsApp Green) */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-105 transition-transform">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">WhatsApp Business API</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed font-normal">
                    Reach customers easily, send automated messages and engage better on official WhatsApp.
                  </p>
                </div>
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 group-hover:translate-x-1 transition"
                >
                  <span>MORE INFO</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 5. Social Proof / Highlighted Statement Section */}
      <section id="proof" className="py-24 bg-gradient-to-b from-white via-[#FFF7ED] to-white border-y border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-snug">
            <span className="text-[#00C268]">
              Grow your business with WA Automation&apos;s powerful suite of marketing tools. Leverage Webpush, Social Media Management, RCS Messaging and WhatsApp Business API to reach more customers and drive sales.
            </span>{" "}
            <span className="text-neutral-400">
              Trusted by 15,000+ businesses and recognized by Forbes, Google, Jio, and the National Startup Award.
            </span>
          </p>

          {/* Recognized Brands & Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-8 md:gap-14 text-neutral-400 font-bold tracking-wider text-sm grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
            <span className="text-xl font-black text-neutral-800">Forbes</span>
            <span className="text-xl font-bold text-neutral-800">Google</span>
            <span className="text-xl font-black text-blue-600">Jio</span>
            <span className="text-sm font-semibold uppercase text-neutral-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> National Startup Award
            </span>
          </div>
        </div>
      </section>

      {/* 📈 6. Stats & Metrics Counters Section */}
      <section className="py-20 bg-gradient-to-b from-white to-[#F5F3FF]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Stat 1: Conversion Rate */}
            <div className="bg-white/80 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-8 text-center space-y-3 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-center gap-1 text-4xl sm:text-5xl font-black text-[#10B981]">
                <span className="text-3xl">↗</span>
                <span>+130 %</span>
              </div>
              <p className="text-sm font-semibold text-neutral-600">Conversion Rate Increased</p>
            </div>

            {/* Stat 2: Active Users */}
            <div className="bg-white/80 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-8 text-center space-y-3 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-center gap-1 text-4xl sm:text-5xl font-black text-[#7C4DFF]">
                <span className="text-3xl">↗</span>
                <span>+150 K</span>
              </div>
              <p className="text-sm font-semibold text-neutral-600">Monthly Active Users</p>
            </div>

            {/* Stat 3: Followers / Engagement */}
            <div className="bg-white/80 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-8 text-center space-y-3 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-center gap-1 text-4xl sm:text-5xl font-black text-[#EA580C]">
                <span className="text-3xl">↗</span>
                <span>+15 K</span>
              </div>
              <p className="text-sm font-semibold text-neutral-600">Active Followers</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🤖 7. Cute 3D Robot Mascot Banner with Marquee Typography */}
      <section className="relative py-24 bg-gradient-to-b from-[#E0E7FF] via-[#EDE9FE] to-[#F3E8FF] overflow-hidden">
        {/* Outlined hollow typography watermark */}
        <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-25">
          <p className="text-6xl sm:text-8xl md:text-9xl font-black text-transparent stroke-text uppercase tracking-widest whitespace-nowrap">
            Web Push · Chat Bot · AI Support · WhatsApp ·
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          {/* Mascot Image */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 bg-gradient-to-b from-white/60 to-purple-100/60 p-2">
            <div className="relative w-full h-full rounded-2xl overflow-hidden">
              <Image
                src="/leminai-robot.jpg"
                alt="WA Automation AI Robot Mascot"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

              <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950">
              Meet Your 24/7 WA Automation Sales &amp; Support Agent
            </h2>
            <p className="text-neutral-600 max-w-xl mx-auto text-base">
              Automate multi-channel conversations, answer customer inquiries instantly, and drive 24/7 conversions without hiring extra staff.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setBookDemoOpen(true)}
                className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-8 py-3.5 rounded-full text-sm shadow-xl hover:scale-105 transition duration-200"
              >
                Schedule AI Demo 🤖
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 📚 8. Knowledge Hub / Blogs Section */}
      <section id="blogs" className="py-24 bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {/* Header + Filter Pills */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Knowledge Hub</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Latest Marketing Insights</h2>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl shrink-0">
              {(["all", "webpush", "whatsapp"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBlogTab(tab)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition capitalize ${
                    blogTab === tab ? "bg-white text-neutral-950 shadow-md" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab === "all" ? "All Posts" : tab === "webpush" ? "Web Push" : "WhatsApp"}
                </button>
              ))}
            </div>
          </div>

          {/* Blog Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Blog 1 */}
            {(blogTab === "all" || blogTab === "whatsapp") && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 hover:border-neutral-700 transition group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-44 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 p-6 flex items-end justify-between">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      WhatsApp
                    </span>
                    <span className="text-white text-xs font-medium">5 min read</span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                    How to Scale Broadcast Campaigns on WhatsApp Business API
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-3">
                    Learn the secrets of high-open rate broadcasts, personalized catalog templates, and compliance rules to avoid number blocking.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Read Article →
                </span>
              </div>
            )}

            {/* Blog 2 */}
            {(blogTab === "all" || blogTab === "webpush") && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 hover:border-neutral-700 transition group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-44 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-800 p-6 flex items-end justify-between">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Web Push
                    </span>
                    <span className="text-white text-xs font-medium">4 min read</span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                    10 Web Push Strategies to Recover Abandoned Carts
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-3">
                    Re-target bouncing traffic without asking for an email address. Recover up to 25% of lost checkouts using automated push sequences.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Read Article →
                </span>
              </div>
            )}

            {/* Blog 3 */}
            {(blogTab === "all" || blogTab === "whatsapp") && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 hover:border-neutral-700 transition group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-44 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-800 p-6 flex items-end justify-between">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Automation
                    </span>
                    <span className="text-white text-xs font-medium">6 min read</span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                    Deploying AI Chatbots with Multi-Agent Escalation
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-3">
                    How leading e-commerce and SaaS companies use hybrid human-AI inboxes to resolve 80% of routine questions in under 30 seconds.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Read Article →
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ❓ 9. Frequently Asked Questions */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <details className="group border border-neutral-200 rounded-2xl p-5 [&_summary::-webkit-details-marker]:none cursor-pointer">
              <summary className="flex items-center justify-between font-bold text-neutral-900 text-sm">
                <span>How does WA Automation connect with official WhatsApp Business API?</span>
                <span className="transition group-open:rotate-180">
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-neutral-600 leading-relaxed">
                WA Automation utilizes the official Meta Cloud API infrastructure. You can onboard your phone number in under 5 minutes without any risk of number bans or third-party workarounds.
              </p>
            </details>

            <details className="group border border-neutral-200 rounded-2xl p-5 [&_summary::-webkit-details-marker]:none cursor-pointer">
              <summary className="flex items-center justify-between font-bold text-neutral-900 text-sm">
                <span>Can multiple team members manage the same WhatsApp number?</span>
                <span className="transition group-open:rotate-180">
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-neutral-600 leading-relaxed">
                Yes! WA Automation provides a unified shared inbox with role-based agent assignment, custom tags, private internal notes, and automated routing rules.
              </p>
            </details>

            <details className="group border border-neutral-200 rounded-2xl p-5 [&_summary::-webkit-details-marker]:none cursor-pointer">
              <summary className="flex items-center justify-between font-bold text-neutral-900 text-sm">
                <span>What is the difference between WhatsApp API and Web Push?</span>
                <span className="transition group-open:rotate-180">
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </span>
              </summary>
              <p className="mt-3 text-xs text-neutral-600 leading-relaxed">
                Web Push notifications allow you to message anonymous visitors on their desktop or Android browser with 1 click, while WhatsApp Business API provides rich two-way interactive messaging on the user&apos;s phone.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* 📞 10. Footer Section with Login & Super Admin Access */}
      <footer id="contact" className="bg-neutral-950 text-white border-t border-neutral-900 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Col 1: Logo & About */}
            <div className="md:col-span-2 space-y-4">
              <div className="text-white">
                <Link href="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight text-white">
                  <RosetteBadge className="w-8 h-8 shrink-0" />
                  <div className="flex items-baseline tracking-tight font-extrabold gap-1 text-2xl">
                    <span className="font-black text-[#00C268]">WA</span>
                    <span className="font-black text-white">Automation</span>
                  </div>
                </Link>
              </div>
              <p className="text-neutral-400 text-xs max-w-sm leading-relaxed">
                WA Automation is the enterprise omnichannel marketing and WhatsApp automation suite powering 15,000+ modern brands across official Meta Cloud API, RCS Messaging, and CRM shared inboxes.
              </p>
              <div className="pt-2 text-xs text-neutral-500 space-y-1">
                <p>📍 Tech Hub Innovation Park, India</p>
                <p>✉️ support@waautomation.com · 📞 +91 74287 20768</p>
              </div>
            </div>

            {/* Col 2: Solutions */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-200">Solutions</p>
              <ul className="space-y-2 text-xs text-neutral-400">
                <li><Link href="#services" className="hover:text-emerald-400 transition">WhatsApp Business API</Link></li>
                <li><Link href="#services" className="hover:text-emerald-400 transition">Web Push Marketing</Link></li>
                <li><Link href="#services" className="hover:text-emerald-400 transition">RCS Rich Messaging</Link></li>
                <li><Link href="#services" className="hover:text-emerald-400 transition">AI Sales &amp; Support Bots</Link></li>
                <li><Link href="/inbox" className="hover:text-emerald-400 transition">Shared Team Inbox</Link></li>
              </ul>
            </div>

            {/* Col 3: 🔐 Portals & Authentication */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Portals &amp; Login</span>
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/login" className="text-neutral-300 hover:text-white font-medium flex items-center gap-1.5 transition">
                    <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>User / Agent Login</span>
                  </Link>
                </li>
                <li>
                  <Link href="/platform" className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1.5 transition">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Super Admin Login 🛡️</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/agents" className="text-neutral-400 hover:text-white transition flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Agent Workspace</span>
                  </Link>
                </li>
                <li>
                  <Link href="/inbox" className="text-neutral-400 hover:text-white transition flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Live Shared Inbox</span>
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-neutral-400 hover:text-white transition">
                    Create New Account
                  </Link>
                </li>
                <li>
                  <Link href="/forgot-password" className="text-neutral-400 hover:text-white transition">
                    Reset Password
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Trust */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-200">Legal &amp; Trust</p>
              <ul className="space-y-2 text-xs text-neutral-400">
                <li><Link href="#" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition">Meta API Compliance</Link></li>
                <li><Link href="#" className="hover:text-white transition">GDPR Data Security</Link></li>
                <li><Link href="#" className="hover:text-white transition">Security Whitepaper</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with Quick Access Action Buttons */}
          <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} WA Automation Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="hidden md:inline mr-2">Status: <span className="text-emerald-400 font-semibold">All systems normal</span></span>
              <Link
                href="/login"
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-neutral-400" />
                <span>User Login</span>
              </Link>
              <Link
                href="/platform"
                className="bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-300 font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Super Admin Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* 💬 11. Floating Bottom-Right Contact Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setContactWidgetOpen(!contactWidgetOpen)}
          className="bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200/80 shadow-lg px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5"
        >
          <span>Contact us</span>
        </button>

        <button
          onClick={() => setContactWidgetOpen(!contactWidgetOpen)}
          className="w-12 h-12 rounded-full bg-[#00C268] hover:bg-[#00A859] text-white shadow-xl flex items-center justify-center transition hover:scale-105"
          aria-label="Open contact chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* 💬 Contact Drawer / Popover */}
      {contactWidgetOpen && (
        <div className="fixed bottom-22 right-6 z-50 w-80 bg-white border border-neutral-200 rounded-3xl shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <RosetteBadge className="w-7 h-7" />
              <div>
                <p className="text-xs font-bold text-neutral-900">WA Automation Support</p>
                <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online now
                </p>
              </div>
            </div>
            <button onClick={() => setContactWidgetOpen(false)} className="text-neutral-400 hover:text-neutral-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-3 text-xs text-neutral-700 space-y-2">
            <p>👋 Hi there! Looking to automate your WhatsApp or Web Push campaigns?</p>
            <p className="text-[11px] text-neutral-500">Leave your contact details or click below to message us directly.</p>
          </div>

          <div className="space-y-2">
            <Link
              href="/inbox"
              className="w-full bg-[#00C268] hover:bg-[#00A859] text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </Link>
            <button
              onClick={() => {
                setContactWidgetOpen(false);
                setBookDemoOpen(true);
              }}
              className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 rounded-xl transition"
            >
              Book a 15-Min Demo
            </button>
          </div>
        </div>
      )}

      {/* 📅 12. Book a Demo Modal */}
      {bookDemoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setBookDemoOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Schedule Live Demo</span>
              </div>
              <h3 className="text-2xl font-extrabold text-neutral-950">Experience WA Automation Live</h3>
              <p className="text-xs text-neutral-500">
                See how WhatsApp API &amp; omnichannel automation can increase your revenue by 10X.
              </p>
            </div>

            {demoSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2 text-emerald-900">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">Demo Request Received!</p>
                <p className="text-xs text-emerald-700">Our product specialist will reach out on WhatsApp within 15 minutes.</p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ayush Sharma"
                    value={demoForm.name}
                    onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="ayush@company.com"
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">WhatsApp Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 74287 20768"
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Primary Interest</label>
                  <select
                    value={demoForm.service}
                    onChange={(e) => setDemoForm({ ...demoForm, service: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs bg-white"
                  >
                    <option value="whatsapp">WhatsApp Business API &amp; CRM</option>
                    <option value="webpush">Web Push Marketing</option>
                    <option value="rcs">RCS Interactive Messaging</option>
                    <option value="all">All Omnichannel Features</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-md uppercase tracking-wider"
                >
                  Confirm Demo Booking
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 🔍 13. Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
              <Search className="w-5 h-5 text-neutral-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search solutions, blogs, docs..."
                className="w-full text-sm font-medium focus:outline-none"
              />
              <button onClick={() => setSearchModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-neutral-500">
              <p className="font-bold text-[11px] uppercase tracking-wider text-neutral-400">Popular Searches</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="#services"
                  onClick={() => setSearchModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded-full transition"
                >
                  WhatsApp Broadcast API
                </Link>
                <Link
                  href="#services"
                  onClick={() => setSearchModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded-full transition"
                >
                  Web Push Pricing
                </Link>
                <Link
                  href="/inbox"
                  onClick={() => setSearchModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded-full transition"
                >
                  Shared Team Inbox
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
