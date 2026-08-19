"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Info,
  Layers,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Settings,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

interface TemplateItem {
  id: string;
  name: string;
  category: "marketing" | "utility" | "authentication";
  status: string;
  language: string;
  components: {
    header?: { type: "IMAGE" | "TEXT" | "VIDEO" | "DOCUMENT"; text?: string };
    body: { text: string };
    footer?: { text?: string };
    buttons?: { type: string; text: string }[];
  };
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
  group?: string;
  countryCode?: string;
}

const AVAILABLE_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl1",
    name: "peculiex_finvoq",
    category: "marketing",
    status: "approved",
    language: "en",
    components: {
      header: { type: "IMAGE" },
      body: { text: "Hi {{1}}, welcome to Peculiex Finvoq! Explore our automated invoice and billing solution." },
      footer: { text: "Simplify your finances today." },
      buttons: [{ type: "URL", text: "Get Started" }],
    },
  },
  {
    id: "tpl2",
    name: "website_development",
    category: "marketing",
    status: "approved",
    language: "en",
    components: {
      header: { type: "IMAGE" },
      body: { text: "Hi {{1}}, transform your brand with custom website design and web applications." },
      footer: { text: "Special discounts for startup founders." },
      buttons: [{ type: "URL", text: "View Portfolio" }],
    },
  },
  {
    id: "tpl3",
    name: "leads_whatsapp",
    category: "marketing",
    status: "approved",
    language: "en",
    components: {
      header: { type: "IMAGE" },
      body: { text: "Hi {{1}}, thank you for reaching out through WhatsApp! Our consultant will connect with you shortly." },
      buttons: [{ type: "QUICK_REPLY", text: "Talk to Agent" }],
    },
  },
  {
    id: "tpl4",
    name: "peculiex_1st",
    category: "marketing",
    status: "approved",
    language: "en",
    components: {
      header: { type: "IMAGE" },
      body: { text: "Hello {{1}}, discover innovative technology solutions tailored for your business growth." },
      buttons: [{ type: "URL", text: "Visit Website" }],
    },
  },
  {
    id: "tpl5",
    name: "msg2",
    category: "utility",
    status: "approved",
    language: "en",
    components: {
      body: { text: "Hi {{1}}, your transaction request #{{2}} has been successfully processed." },
      footer: { text: "Thank you for choosing WA Automation." },
      buttons: [{ type: "QUICK_REPLY", text: "View Details" }],
    },
  },
  {
    id: "tpl6",
    name: "msg",
    category: "utility",
    status: "approved",
    language: "en",
    components: {
      body: { text: "Hi {{1}}, your account verification code is {{2}}. Valid for 10 minutes." },
      footer: { text: "Security Notice: Never share OTPs." },
    },
  },
  {
    id: "tpl7",
    name: "test",
    category: "utility",
    status: "approved",
    language: "en",
    components: {
      body: { text: "This is a test utility notification message for account {{1}}." },
    },
  },
];

const DEFAULT_CONTACTS: ContactItem[] = [
  { id: "c1", name: "Ayush Patel", phone: "+91 92668 06659", tags: ["VIP", "Lead"], group: "Enterprise" },
  { id: "c2", name: "Sneha Sharma", phone: "+91 98765 43210", tags: ["Customer", "Beta"], group: "Retail" },
  { id: "c3", name: "Vikram Malhotra", phone: "+91 98111 22334", tags: ["Lead"], group: "Marketing" },
  { id: "c4", name: "Priya Nair", phone: "+91 97234 56789", tags: ["Customer"], group: "Wholesale" },
  { id: "c5", name: "Rahul Verma", phone: "+91 99887 76655", tags: ["VIP"], group: "Enterprise" },
  { id: "c6", name: "Ananya Roy", phone: "+91 98300 11223", tags: ["Partner"], group: "Agency" },
  { id: "c7", name: "Rohan Mehta", phone: "+91 98200 99887", tags: ["Customer"], group: "Retail" },
];

const COUNTRIES = [
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+1", label: "United States", flag: "🇺🇸" },
  { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+1", label: "Canada", flag: "🇨🇦" },
];

export default function SendToContactsPage() {
  const router = useRouter();

  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [targetCountry, setTargetCountry] = useState<string>("+91 India");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Variables mapping (e.g. {{1}}: "First Name", {{2}}: "Order #")
  const [variableValues, setVariableValues] = useState<Record<string, string>>({
    "1": "Contact Name",
    "2": "TXN-9082",
    "3": "Special Offer",
  });

  // Selected template object
  const selectedTemplate = useMemo(() => {
    return AVAILABLE_TEMPLATES.find((t) => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId]);

  // Extract variables from body text
  const templateVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    const text = selectedTemplate.components.body.text;
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
  }, [selectedTemplate]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return DEFAULT_CONTACTS.filter((c) => {
      if (contactSearch.trim()) {
        const q = contactSearch.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      if (tagFilter !== "all") {
        if (!c.tags?.includes(tagFilter)) return false;
      }
      return true;
    });
  }, [contactSearch, tagFilter]);

  const allContactsSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((c) => selectedContactIds.includes(c.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const visibleIds = filteredContacts.map((c) => c.id);
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleIds = new Set(filteredContacts.map((c) => c.id));
      setSelectedContactIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    }
  };

  const handleToggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Preview body with dynamic replacement or highlighted variables
  const renderPreviewBody = () => {
    if (!selectedTemplate) return null;
    let text = selectedTemplate.components.body.text;

    // Split and highlight variables with actual sample values
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, index) => {
      const varMatch = part.match(/^\{\{(\d+)\}\}$/);
      if (varMatch) {
        const varNum = varMatch[1];
        const val = variableValues[varNum] || `{{${varNum}}}`;
        return (
          <span
            key={index}
            className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-600 border border-blue-200/60 mx-0.5"
            title={`Variable {{${varNum}}}`}
          >
            {val}
          </span>
        );
      }
      return part;
    });
  };

  const handleSendCampaign = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template to proceed.");
      return;
    }
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    if (selectedContactIds.length === 0) {
      toast.error("Please select at least one recipient contact.");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success(`Campaign "${campaignName}" launched to ${selectedContactIds.length} recipients!`);
      router.push("/campaigns");
    }, 1200);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-16 font-poppins space-y-6">
      {/* ========================================================= */}
      {/* 1. Breadcrumb Bar */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-1">
        <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
          🏠
        </Link>
        <span className="text-gray-300">&gt;</span>
        <Link href="/campaigns" className="hover:text-gray-800 transition-colors">
          Campaigns
        </Link>
        <span className="text-gray-300">&gt;</span>
        <span className="text-gray-800 font-semibold">Send to Contacts</span>
      </div>

      {/* ========================================================= */}
      {/* 2. Top Header Card */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
            <Send size={22} className="fill-white/20 stroke-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Send to Contacts
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Use advanced filters to send targeted campaigns
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Main 2-Column Split: Config + Recipients vs Live Preview */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Campaign Config, Recipients & Summary */}
        <div className="xl:col-span-2 space-y-6">
          {/* ===================================================== */}
          {/* Section A: Campaign Configuration */}
          {/* ===================================================== */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 text-gray-900">
              <Settings size={18} className="text-gray-500" />
              <h2 className="text-sm font-bold tracking-tight">
                Campaign Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Template Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Template Selection <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-4 pr-10 text-xs font-medium text-gray-800 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Choose template</option>
                    {AVAILABLE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., New Year Promotion"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-4 text-xs font-medium text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all"
                />
              </div>
            </div>

            {/* Target Country */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={14} className="text-gray-400" />
                  <span>Target Country</span>
                  <span className="text-rose-500">*</span>
                </span>
              </label>
              <div className="relative">
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-4 pr-10 text-xs font-medium text-gray-800 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all appearance-none cursor-pointer"
                >
                  {COUNTRIES.map((c, i) => (
                    <option key={i} value={`${c.code} ${c.label}`}>
                      {c.flag} {c.code} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* If template has variables, render quick mapping inputs */}
            {templateVariables.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3 mt-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">
                    Template Variables Parameterization
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templateVariables.map((v) => (
                    <div key={v} className="space-y-1">
                      <label className="text-[11px] font-bold text-blue-900">
                        Value for {"{{" + v + "}}"}
                      </label>
                      <input
                        type="text"
                        value={variableValues[v] || ""}
                        onChange={(e) =>
                          setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        placeholder={`Variable ${v} value`}
                        className="h-9 w-full rounded-xl border border-blue-200 bg-white px-3 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-400/30"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===================================================== */}
          {/* Section B: Select Recipients */}
          {/* ===================================================== */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-gray-900">
                <Users size={18} className="text-gray-500" />
                <h2 className="text-sm font-bold tracking-tight">
                  Select Recipients
                </h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                  {selectedContactIds.length} Selected
                </span>
              </div>

              {/* Advanced Filter Button */}
              <button
                type="button"
                onClick={() => setIsAdvancedFilterOpen((prev) => !prev)}
                className={`flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-2xs transition-all ${
                  isAdvancedFilterOpen || tagFilter !== "all"
                    ? "bg-emerald-50 text-[#00C268] border border-emerald-200"
                    : "bg-[#00C268] text-white hover:bg-[#00ab5c]"
                }`}
              >
                <Filter size={14} />
                <span>Advanced Filter</span>
              </button>
            </div>

            {/* Advanced Filters Drawer/Row */}
            {isAdvancedFilterOpen && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Filter By Tag</span>
                  {tagFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setTagFilter("all")}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", "VIP", "Lead", "Customer", "Beta", "Partner"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter(tag)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        tagFilter === tag
                          ? "bg-[#00C268] text-white shadow-2xs"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {tag === "all" ? "All Contacts" : tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Bar for Contacts */}
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or phone number..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200/80 bg-white pl-9 pr-4 text-xs text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all"
              />
            </div>

            {/* Recipients Table */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase text-gray-500">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allContactsSelected}
                        onChange={handleSelectAll}
                        aria-label="Select all contacts"
                        className="h-4 w-4 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3">NAME</th>
                    <th className="px-3 py-3">PHONE NUMBER</th>
                    <th className="px-3 py-3">TAGS / GROUP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacts.map((contact) => {
                    const isSelected = selectedContactIds.includes(contact.id);
                    return (
                      <tr
                        key={contact.id}
                        onClick={() => handleToggleContact(contact.id)}
                        className={`cursor-pointer hover:bg-gray-50/60 transition-colors ${
                          isSelected ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleContact(contact.id)}
                            aria-label={`Select ${contact.name}`}
                            className="h-4 w-4 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold text-gray-900">
                          {contact.name}
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-600">
                          {contact.phone}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {contact.tags?.map((t, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600"
                              >
                                {t}
                              </span>
                            ))}
                            {contact.group && (
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#00C268]">
                                {contact.group}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================================== */}
          {/* Section C: Campaign Summary Card */}
          {/* ===================================================== */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00C268] flex items-center justify-center">
                <Send size={16} />
              </div>
              <h2 className="text-base font-bold tracking-tight">
                Campaign Summary
              </h2>
            </div>

            {/* 4 Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Template */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Template:</span>
                <span
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    selectedTemplate
                      ? "bg-blue-50 text-blue-700 font-mono"
                      : "bg-gray-200/70 text-gray-500"
                  }`}
                >
                  {selectedTemplate ? selectedTemplate.name : "Not selected"}
                </span>
              </div>

              {/* Country */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Country:</span>
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">
                  {targetCountry}
                </span>
              </div>

              {/* Campaign */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Campaign:</span>
                <span className="text-xs font-bold text-gray-800 truncate max-w-[160px]">
                  {campaignName.trim() ? campaignName : "Unnamed"}
                </span>
              </div>

              {/* Recipients */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Recipients:</span>
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800 font-mono">
                  {selectedContactIds.length}
                </span>
              </div>
            </div>

            {/* Launch Campaign Button */}
            <button
              type="button"
              onClick={handleSendCampaign}
              disabled={isSending}
              className={`w-full flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-xs transition-all ${
                !selectedTemplate
                  ? "bg-emerald-300 cursor-not-allowed"
                  : "bg-[#00C268] hover:bg-[#00ab5c] active:scale-[0.99]"
              }`}
            >
              <Send size={16} />
              <span>{isSending ? "Launching Campaign..." : "Send Campaign Now"}</span>
            </button>

            {/* Status / Warning Banner if no template is chosen */}
            {!selectedTemplate && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 px-4 flex items-center gap-2.5 text-xs font-semibold text-amber-800">
                <Info size={16} className="text-amber-600 shrink-0" />
                <span>Please select a template to proceed</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* Right 1 Column: Live Template Preview Mockup */}
        {/* ========================================================= */}
        <div className="xl:col-span-1 sticky top-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 text-gray-900 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#00C268] text-white flex items-center justify-center shadow-xs">
                <Eye size={16} />
              </div>
              <h2 className="text-sm font-bold tracking-tight">
                Template Preview
              </h2>
            </div>

            {/* Body */}
            {!selectedTemplate ? (
              /* No Template Selected Empty State */
              <div className="py-12 px-4 text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-[#00C268] flex items-center justify-center">
                  <Eye size={26} strokeWidth={1.8} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  No Template Selected
                </h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Choose a template to see the WhatsApp preview
                </p>
              </div>
            ) : (
              /* WhatsApp Phone Mockup Card */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                {/* Meta details badge */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-gray-800">
                    {selectedTemplate.name}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-[#00C268] uppercase">
                    {selectedTemplate.status}
                  </span>
                </div>

                {/* Chat Mockup Card */}
                <div className="w-full rounded-2xl border border-gray-200/80 bg-white shadow-md overflow-hidden">
                  {/* WhatsApp Topbar */}
                  <div className="bg-[#00C268] px-4 py-2.5 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#00C268] font-bold text-[10px]">
                        B
                      </span>
                      <div>
                        <p className="font-bold text-xs leading-tight">Business Account</p>
                        <p className="text-[9px] text-emerald-100">Template Message</p>
                      </div>
                    </div>
                    <MoreVertical size={14} className="text-white/80" />
                  </div>

                  {/* Bubble Body */}
                  <div className="p-4 space-y-3 bg-[#f8fafc]/50 text-xs">
                    {/* Header Type */}
                    {selectedTemplate.components.header?.type && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600">
                        <span>🖼️</span>
                        <span>{selectedTemplate.components.header.type} Header</span>
                      </div>
                    )}

                    {/* Message Body */}
                    <p className="text-gray-800 leading-relaxed">
                      {renderPreviewBody()}
                    </p>

                    {/* Footer */}
                    {selectedTemplate.components.footer?.text && (
                      <p className="italic text-gray-400 text-[11px]">
                        {selectedTemplate.components.footer.text}
                      </p>
                    )}

                    {/* Buttons Mock */}
                    {selectedTemplate.components.buttons &&
                      selectedTemplate.components.buttons.map((btn, idx) => (
                        <div key={idx} className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-center gap-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 font-bold text-xs shadow-2xs cursor-pointer transition-colors">
                            <ExternalLink size={13} />
                            <span>{btn.text}</span>
                          </div>
                        </div>
                      ))}

                    {/* WhatsApp Template watermark */}
                    <div className="text-right text-[9px] text-gray-400 pt-1">
                      WhatsApp Template
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
