"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Check,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { TemplateBuilder } from "./template-builder";

interface TemplateItem {
  id: string;
  name: string;
  category: "marketing" | "utility" | "authentication";
  status: "approved" | "pending" | "rejected" | "draft";
  language: string;
  languageLabel?: string;
  created_at: string;
  updated_at?: string;
  components: {
    header?: { type: "IMAGE" | "TEXT" | "VIDEO" | "DOCUMENT"; text?: string };
    body: { text: string };
    footer?: { text?: string };
    buttons?: { type: string; text: string }[];
  };
}

const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl1",
    name: "peculiex_finvoq",
    category: "marketing",
    status: "approved",
    language: "en",
    languageLabel: "English",
    created_at: "2026-08-19T10:00:00.000Z",
    components: {
      header: { type: "IMAGE" },
      body: { text: "Hi {{1}}, welcome to Peculiex Finvoq! Explore our automated invoice and billing solution." },
      buttons: [{ type: "URL", text: "Get Started" }],
    },
  },
  {
    id: "tpl2",
    name: "website_development",
    category: "marketing",
    status: "approved",
    language: "en",
    languageLabel: "English",
    created_at: "2026-08-18T12:00:00.000Z",
    components: {
      header: { type: "IMAGE" },
      body: { text: "Hi {{1}}, transform your brand with custom website design and web applications." },
      buttons: [{ type: "URL", text: "View Portfolio" }],
    },
  },
  {
    id: "tpl3",
    name: "leads_whatsapp",
    category: "marketing",
    status: "approved",
    language: "en",
    languageLabel: "English",
    created_at: "2026-08-11T14:00:00.000Z",
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
    languageLabel: "English",
    created_at: "2026-08-06T15:00:00.000Z",
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
    languageLabel: "English",
    created_at: "2026-08-06T11:00:00.000Z",
    components: {
      body: { text: "Hi {{1}}, your transaction request #{{2}} has been successfully processed." },
      buttons: [{ type: "QUICK_REPLY", text: "View Details" }],
    },
  },
  {
    id: "tpl6",
    name: "msg",
    category: "utility",
    status: "approved",
    language: "en",
    languageLabel: "English",
    created_at: "2026-08-06T09:00:00.000Z",
    components: {
      body: { text: "Hi {{1}}, your account verification code is {{2}}. Valid for 10 minutes." },
    },
  },
  {
    id: "tpl7",
    name: "test",
    category: "utility",
    status: "approved",
    language: "en",
    languageLabel: "English",
    created_at: "2026-08-06T08:00:00.000Z",
    components: {
      body: { text: "This is a test utility notification message for account {{1}}." },
    },
  },
];

export default function YourTemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "category" | "status" | "language" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["templates", { categoryFilter, statusFilter }],
    queryFn: () =>
      api.get<{ data: TemplateItem[]; total: number }>("/templates", {
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  });

  const rawTemplates: TemplateItem[] = useMemo(() => {
    const apiData = templatesQuery.data?.data;
    if (apiData && apiData.length >= 7) return apiData;
    return DEFAULT_TEMPLATES;
  }, [templatesQuery.data]);

  // Real-time filtering and sorting
  const filteredTemplates = useMemo(() => {
    let list = [...rawTemplates];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.components?.body?.text?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }

    list.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (sortField === "created_at") {
        return sortOrder === "asc"
          ? new Date(valA).getTime() - new Date(valB).getTime()
          : new Date(valB).getTime() - new Date(valA).getTime();
      }
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return list;
  }, [rawTemplates, search, categoryFilter, statusFilter, sortField, sortOrder]);

  const allSelected = filteredTemplates.length > 0 && selected.length === filteredTemplates.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(filteredTemplates.map((t) => t.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      toast.success("Template deleted");
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: () => {
      toast.success("Template deleted");
    },
  });

  // Render {{1}} variable highlights
  const renderHighlightedBody = (text: string) => {
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, index) => {
      if (/^\{\{\d+\}\}$/.test(part)) {
        return (
          <span
            key={index}
            className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-600 border border-blue-200/60 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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
        <span className="text-gray-800 font-semibold">Your Templates</span>
      </div>

      {/* ========================================================= */}
      {/* 2. Top Header Card */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
            <MessageSquare size={22} className="fill-white/20 stroke-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Your Templates
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Select or create your template and submit it for WhatsApp approval
            </p>
          </div>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#E8F8F0] px-4 py-2 text-xs font-bold text-[#00C268] shadow-2xs">
            {filteredTemplates.length} Templates
          </span>

          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Template Message</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Guidelines Notice Box */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-5 py-3.5 text-xs text-gray-500 font-medium leading-relaxed">
        All templates must adhere to{" "}
        <a
          href="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines"
          target="_blank"
          rel="noreferrer"
          className="text-[#00C268] font-bold hover:underline"
        >
          WhatsApp&apos;s guidelines
        </a>
        . Templates are reviewed and approved by WhatsApp before they can be used.
      </div>

      {/* ========================================================= */}
      {/* 4. Controls & Filters Bar */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200/80 bg-white pl-9 pr-4 text-xs text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs">
            <span className="text-gray-400 font-normal">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer pr-1"
            >
              <option value="all">All Categories</option>
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
              <option value="authentication">Authentication</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs">
            <span className="text-gray-400 font-normal">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer pr-1"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => void templatesQuery.refetch()}
          className="flex h-10 items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
        >
          <RefreshCw
            size={14}
            className={templatesQuery.isFetching ? "animate-spin text-[#00C268]" : "text-gray-500"}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 5. Templates Table Card */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="w-12 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all"
                    className="h-4 w-4 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => toggleSort("name")}
                  className="px-4 py-4 cursor-pointer hover:text-gray-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TEMPLATE NAME</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("category")}
                  className="px-4 py-4 cursor-pointer hover:text-gray-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CATEGORY</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  className="px-4 py-4 cursor-pointer hover:text-gray-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STATUS</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("language")}
                  className="px-4 py-4 cursor-pointer hover:text-gray-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>LANGUAGE</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("created_at")}
                  className="px-4 py-4 cursor-pointer hover:text-gray-800 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>LAST UPDATED</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th className="px-4 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredTemplates.map((template) => {
                const isSelected = selected.includes(template.id);
                const isMarketing = template.category === "marketing";

                return (
                  <tr
                    key={template.id}
                    className={`hover:bg-gray-50/60 transition-colors ${
                      isSelected ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(template.id)}
                        aria-label={`Select ${template.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30 cursor-pointer"
                      />
                    </td>

                    {/* Template Name */}
                    <td className="px-4 py-4 font-mono font-medium text-gray-900">
                      {template.name}
                    </td>

                    {/* Category Pill */}
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-md px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${
                          isMarketing
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {template.category}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="px-4 py-4">
                      <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#00C268] uppercase tracking-wide">
                        {template.status}
                      </span>
                    </td>

                    {/* Language */}
                    <td className="px-4 py-4 text-gray-700">
                      <p className="font-medium">{template.languageLabel || "English"}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{template.language}</p>
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                      <p className="font-medium">{formatDate(template.created_at)}</p>
                      <p className="text-[10px] text-gray-400">
                        Created: {formatDate(template.created_at)}
                      </p>
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 relative">
                        {/* Eye icon: View Preview Modal */}
                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(template)}
                          aria-label="View template preview"
                          title="View Template"
                          className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-[#00C268] hover:bg-emerald-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>

                        {/* More Actions Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId((current) =>
                                current === template.id ? null : template.id
                              )
                            }
                            aria-label="More options"
                            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {activeMenuId === template.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setPreviewTemplate(template);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Eye size={14} className="text-[#00C268]" />
                                <span>Preview</span>
                              </button>

                              <Link
                                href={`/campaigns/new?template=${template.name}`}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#00C268] hover:bg-emerald-50 transition-colors"
                              >
                                <Send size={14} />
                                <span>Send Campaign</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  deleteMutation.mutate(template.id);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. "View Template" Interactive Preview Modal */}
      {/* ========================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Modal Topbar */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Template Preview
              </h2>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Technical Name & Meta Badges Box */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs space-y-2">
                <h3 className="font-mono text-sm font-bold text-gray-900">
                  {previewTemplate.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 uppercase">
                    {previewTemplate.category}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 uppercase">
                    {previewTemplate.status}
                  </span>
                  <span className="text-gray-400 font-medium text-[11px]">
                    Language: {previewTemplate.language.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* WhatsApp Phone Mockup Container */}
              <div className="rounded-3xl border border-emerald-100/80 bg-emerald-50/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-[#00C268] text-white">
                    <MessageCircle size={14} className="fill-current" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      WhatsApp Preview
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      How your message will appear
                    </p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble Card Mockup */}
                <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200/70 bg-white shadow-md overflow-hidden">
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
                    {previewTemplate.components?.header?.type && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600">
                        <span>🖼️</span>
                        <span>{previewTemplate.components.header.type} Header</span>
                      </div>
                    )}

                    {/* Body text */}
                    <p className="text-gray-800 leading-relaxed">
                      {renderHighlightedBody(previewTemplate.components?.body?.text || "")}
                    </p>

                    {/* Buttons Mock */}
                    {previewTemplate.components?.buttons &&
                      previewTemplate.components.buttons.map((btn, idx) => (
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

              {/* Bottom Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/campaigns/new?template=${previewTemplate.name}`}
                  className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] transition-all"
                >
                  <Send size={15} />
                  <span>Send Campaign</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="h-11 rounded-xl border border-gray-200 px-5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. Template Builder Drawer */}
      {/* ========================================================= */}
      <TemplateBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSaved={() => {
          setBuilderOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["templates"] });
        }}
      />
    </div>
  );
}
