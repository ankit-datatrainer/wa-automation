"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Globe,
  HelpCircle,
  Info,
  Layers,
  MessageCircle,
  MoreVertical,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

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

interface TagOption {
  id: string;
  name: string;
  count: number;
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

const INITIAL_TAGS: TagOption[] = [
  { id: "t1", name: "VIP", count: 2 },
  { id: "t2", name: "Lead", count: 2 },
  { id: "t3", name: "Customer", count: 3 },
  { id: "t4", name: "Beta", count: 1 },
  { id: "t5", name: "Partner", count: 1 },
  { id: "t6", name: "Enterprise", count: 2 },
  { id: "t7", name: "Wholesale", count: 1 },
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

export default function SendByTagsPage() {
  const router = useRouter();

  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [targetCountry, setTargetCountry] = useState<string>("+91 India");
  const [tagsList, setTagsList] = useState<TagOption[]>(INITIAL_TAGS);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState<boolean>(false);
  const [tagSearch, setTagSearch] = useState<string>("");
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [isSending, setIsSending] = useState(false);

  // Variables mapping (e.g. {{1}}: "First Name")
  const [variableValues, setVariableValues] = useState<Record<string, string>>({
    "1": "Valued Customer",
    "2": "TXN-7781",
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

  // Calculate unique recipients count based on selected tags
  const totalRecipientsCount = useMemo(() => {
    if (selectedTags.length === 0) return 0;
    // Map tags to mock unique contacts count
    let total = 0;
    selectedTags.forEach((tagName) => {
      const found = tagsList.find((t) => t.name === tagName);
      if (found) total += found.count;
    });
    return Math.min(total, 7); // Cap to 7 contacts for demo realism
  }, [selectedTags, tagsList]);

  // Filtered tags for dropdown
  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return tagsList;
    return tagsList.filter((t) =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [tagsList, tagSearch]);

  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleAddNewTag = () => {
    if (!newTagInput.trim()) return;
    const cleanName = newTagInput.trim();
    if (tagsList.some((t) => t.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error(`Tag "${cleanName}" already exists.`);
      return;
    }

    const newTag: TagOption = {
      id: `tag-${Date.now()}`,
      name: cleanName,
      count: 1,
    };

    setTagsList((prev) => [...prev, newTag]);
    setSelectedTags((prev) => [...prev, cleanName]);
    setNewTagInput("");
    setIsAddingTag(false);
    toast.success(`Created and selected tag "${cleanName}"`);
  };

  // Preview body with dynamic replacement
  const renderPreviewBody = () => {
    if (!selectedTemplate) return null;
    let text = selectedTemplate.components.body.text;

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
    if (selectedTags.length === 0) {
      toast.error("Please select at least one tag.");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success(
        `WhatsApp Tag Campaign "${campaignName}" launched to ${totalRecipientsCount} recipients across ${selectedTags.length} tags!`
      );
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
        <span className="text-gray-800 font-semibold">Send By Tags</span>
      </div>

      {/* ========================================================= */}
      {/* 2. Top Header Card */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
            <Radio size={22} className="stroke-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                WhatsApp Tag Campaign
              </h1>
              <span className="text-gray-400 cursor-help" title="Send template messages grouped by customer tags">
                <Info size={15} />
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Send official template messages to multiple recipients using tags
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Main 2-Column Split: Config + Tags vs Live Preview */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns */}
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
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Template Selection <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-gray-400" title="Only pre-approved templates can be used for official messages">
                    <Info size={13} />
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-4 pr-10 text-xs font-medium text-gray-800 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Choose an approved template</option>
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
                <p className="text-[11px] text-gray-400">
                  Only pre-approved templates can be used for official messages
                </p>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Campaign Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-gray-400" title="Internal name for tracking and analytics">
                    <Info size={13} />
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g., New Year Promotion 2025"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-4 text-xs font-medium text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all"
                />
                <p className="text-[11px] text-gray-400">
                  Internal name for tracking and analytics
                </p>
              </div>
            </div>

            {/* Target Country */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Globe size={14} className="text-gray-400" />
                <label className="text-xs font-semibold text-gray-700">
                  Target Country <span className="text-rose-500">*</span>
                </label>
                <span className="text-gray-400" title="Country code will be automatically added to phone numbers">
                  <Info size={13} />
                </span>
              </div>
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
              <p className="text-[11px] text-gray-400">
                Country code +91 will be automatically added to phone numbers
              </p>
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
          {/* Section B: Select Tag */}
          {/* ===================================================== */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-900">
                <Tag size={18} className="text-gray-500" />
                <h2 className="text-sm font-bold tracking-tight">
                  Select Tag
                </h2>
                <span className="text-gray-400" title="Select one or more tags to target customers">
                  <Info size={14} />
                </span>
              </div>

              {/* Refresh Tags */}
              <button
                type="button"
                onClick={() => {
                  toast.success("Tags refreshed.");
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Refresh tags"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Custom Multi-Select Tag Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                className="flex h-11 w-full items-center justify-between rounded-2xl border border-gray-200/80 bg-white px-4 text-xs font-medium text-gray-800 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all text-left"
              >
                {selectedTags.length === 0 ? (
                  <span className="text-gray-400">Choose tags...</span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap overflow-hidden py-1">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#00C268] border border-emerald-200/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTag(tag);
                        }}
                      >
                        <span>{tag}</span>
                        <X size={12} className="hover:text-rose-500 cursor-pointer" />
                      </span>
                    ))}
                  </div>
                )}
                <ChevronDown size={15} className="text-gray-400 shrink-0 ml-2" />
              </button>

              {/* Dropdown Menu */}
              {isTagDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="relative">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="h-8 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-8 pr-3 text-xs outline-none focus:border-[#00C268]"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                    {filteredTags.map((t) => {
                      const isSelected = selectedTags.includes(t.name);
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTag(t.name)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-emerald-50 text-[#00C268]"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30"
                            />
                            <span>{t.name}</span>
                          </div>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                            {t.count} contacts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Add New Tag Controls */}
            {!isAddingTag ? (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
              >
                <Plus size={14} />
                <span>Add New Tag</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in duration-100">
                <input
                  type="text"
                  placeholder="New tag name (e.g., SummerPromo)..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20"
                />
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="h-9 rounded-xl bg-[#00C268] px-3 text-xs font-bold text-white shadow-2xs hover:bg-[#00ab5c]"
                >
                  Save Tag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTag(false);
                    setNewTagInput("");
                  }}
                  className="h-9 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* ===================================================== */}
          {/* Section C: Campaign Summary */}
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
                  {totalRecipientsCount}
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

            {/* Warning Note */}
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
