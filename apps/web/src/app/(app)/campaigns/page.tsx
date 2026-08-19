"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  Info,
  Layers,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Radio,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export default function CampaignsPage() {
  const highlightCards = [
    {
      title: "Lightning Fast",
      description: "Deploy campaigns in minutes with our streamlined workflow",
      icon: Zap,
    },
    {
      title: "Precision Targeting",
      description: "Reach the right audience with advanced segmentation tools",
      icon: Target,
    },
    {
      title: "Scale Effortlessly",
      description: "From small groups to millions - we handle any audience size",
      icon: Users,
    },
    {
      title: "Data-Driven Results",
      description: "Make informed decisions with comprehensive analytics",
      icon: TrendingUp,
    },
  ];

  const templateCards = [
    {
      title: "Template Library",
      description: "Access pre-built, professional templates for various campaign types",
      icon: FileText,
      href: "/campaigns/template-library",
    },
    {
      title: "Your Templates",
      description: "Create, customize, and manage your own reusable templates",
      icon: Radio,
      href: "/campaigns/templates",
    },
  ];

  const campaignTools = [
    {
      title: "Send Messages",
      description: "Unified interface for sending messages by tags or groups",
      icon: MessageSquare,
      href: "/campaigns/send/contacts",
    },
    {
      title: "Send By Tags",
      description: "Target specific audience segments using custom tags",
      icon: Tag,
      href: "/campaigns/send/tags",
    },
    {
      title: "Send By Groups",
      description: "Target audience segments using contact groups",
      icon: Users,
      href: "/campaigns/send/groups",
    },
    {
      title: "CSV Campaign",
      description: "Upload CSV files to run bulk campaigns efficiently",
      icon: FileSpreadsheet,
      href: "/campaigns/send/csv",
    },
    {
      title: "Broadcast",
      description: "Send messages to your entire audience instantly",
      icon: Radio,
      href: "/campaigns/broadcast",
    },
    {
      title: "Campaign History",
      description: "Track and analyze your past campaign performance",
      icon: Activity,
      href: "/campaigns/history",
    },
    {
      title: "Scheduled Campaign",
      description: "Plan and schedule campaigns for optimal timing",
      icon: Calendar,
      href: "/campaigns/scheduled",
    },
    {
      title: "Campaign Dashboard",
      description: "Monitor real-time metrics and campaign analytics",
      icon: LayoutGrid,
      href: "/dashboard",
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-16 font-poppins space-y-8">
      {/* ========================================================= */}
      {/* 1. Header Card (Campaign Manager) */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-13 h-13 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
            <Megaphone size={24} className="fill-white/20 stroke-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Campaign Manager
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium leading-relaxed">
              Create powerful campaigns with professional templates and advanced targeting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/campaigns/template-library"
            className="flex h-10 items-center gap-2 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] active:scale-95 transition-all"
          >
            <FileText size={15} />
            <span>Browse Templates</span>
          </Link>

          <Link
            href="/campaigns/new"
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Radio size={15} className="text-[#00C268]" />
            <span>Create Campaign</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 4 Value Proposition / Highlight Cards */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {highlightCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs hover:shadow-md hover:border-emerald-100 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00C268] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Icon size={22} className="stroke-[#00C268]" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mt-5">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 3. Templates Section */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-xs shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              Templates
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Professional templates to jumpstart your campaigns
            </p>
          </div>
        </div>

        {/* 2 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templateCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00C268] flex items-center justify-center shadow-2xs">
                    <Icon size={20} className="stroke-[#00C268]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-5">
                    <h3 className="text-sm font-bold text-gray-900">
                      {card.title}
                    </h3>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-6">
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00C268] hover:text-[#009A52] group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. Campaign Tools Section */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-xs shrink-0">
            <Megaphone size={18} className="fill-white/20 stroke-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              Campaign Tools
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Powerful tools to create, manage, and analyze your campaigns
            </p>
          </div>
        </div>

        {/* 8 Grid Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaignTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00C268] flex items-center justify-center shadow-2xs">
                    <Icon size={20} className="stroke-[#00C268]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-5">
                    <h3 className="text-sm font-bold text-gray-900">
                      {tool.title}
                    </h3>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed min-h-[34px]">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-5">
                  <Link
                    href={tool.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00C268] hover:text-[#009A52] group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Launch</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. Green Call To Action Banner */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-[#00C268] p-8 sm:p-12 text-center text-white shadow-xl shadow-emerald-500/15 relative overflow-hidden">
        {/* Background decorative ambient glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-700/30 blur-2xl" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Ready to Get Started?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-50 font-medium leading-relaxed">
            Choose your starting point and create your first campaign in minutes. Our intuitive tools make campaign management effortless.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              href="/campaigns/template-library"
              className="flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-gray-900 shadow-md hover:bg-gray-50 active:scale-95 transition-all"
            >
              <FileText size={15} className="text-[#00C268]" />
              <span>Browse Templates</span>
            </Link>

            <Link
              href="/campaigns/new"
              className="flex h-11 items-center gap-2 rounded-xl bg-white/90 backdrop-blur-xs px-5 text-xs font-bold text-gray-900 shadow-md hover:bg-white active:scale-95 transition-all"
            >
              <Radio size={15} className="text-[#00C268]" />
              <span>Create Campaign</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. Campaign Overview Footer Box */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-emerald-100 bg-[#E8F8F0] p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            Campaign Overview
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Start building powerful campaigns with our comprehensive tools
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-[#00C268] px-4 py-1.5 text-xs font-bold text-white shadow-2xs">
            8 Tools Available
          </span>
          <span className="rounded-full border border-gray-200/80 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs">
            Ready to Use
          </span>
        </div>
      </div>
    </div>
  );
}
