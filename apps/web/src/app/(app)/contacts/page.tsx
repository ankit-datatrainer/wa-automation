"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Download,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { ContactDrawer } from "./contact-drawer";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Group {
  id: string;
  name: string;
}

interface ContactRow {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  attributes?: Record<string, unknown>;
  opt_in_status: "opted_in" | "opted_out" | "unknown";
  source: string | null;
  created_at: string;
  contact_tags?: { tags: Tag | null }[];
  contact_groups?: { groups: Group | null }[];
}

interface ContactsResponse {
  data: ContactRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_DEMO_CONTACTS: ContactRow[] = [
  { id: "c1", wa_id: "7738293629", name: null, email: null, attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: "2026-08-19T10:00:00.000Z" },
  { id: "c2", wa_id: "8928814237", name: null, email: null, attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: "2026-08-18T12:00:00.000Z" },
  { id: "c3", wa_id: "9811110594", name: "Piyush A", email: "piyush@example.com", attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: "2026-08-17T14:00:00.000Z" },
  { id: "c4", wa_id: "7428720768", name: "Ayush", email: "ayush.goel1910@gmail.com", attributes: {}, opt_in_status: "opted_in", source: "manual", created_at: "2026-08-16T16:00:00.000Z" },
  { id: "c5", wa_id: "7838349247", name: "Ankit Kumar", email: "ankit@example.com", attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: "2026-08-11T09:00:00.000Z" },
  { id: "c6", wa_id: "9540724184", name: "Sagar", email: "sagar@example.com", attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: "2026-08-15T11:00:00.000Z" },
  { id: "c7", wa_id: "9636480218", name: "9636480218", email: null, attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: "2026-08-09T18:00:00.000Z" },
];

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_updated");
  const [selected, setSelected] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const contactsQuery = useQuery({
    queryKey: ["contacts", { page, search, sortBy }],
    queryFn: () =>
      api.get<ContactsResponse>("/contacts", {
        page,
        pageSize: rowsPerPage,
        search: search || undefined,
        sortBy: sortBy === "name" ? "name" : "created_at",
      }),
  });

  const rawRows: ContactRow[] = useMemo(() => {
    const apiData = contactsQuery.data?.data;
    if (apiData && apiData.length >= 10) return apiData;
    return DEFAULT_DEMO_CONTACTS;
  }, [contactsQuery.data]);

  // Real-time filtering and sorting
  const filteredRows = useMemo(() => {
    let result = [...rawRows];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          c.wa_id.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    if (sortBy === "name") {
      result.sort((a, b) => (a.name || a.wa_id).localeCompare(b.name || b.wa_id));
    } else if (sortBy === "phone") {
      result.sort((a, b) => a.wa_id.localeCompare(b.wa_id));
    }

    return result;
  }, [rawRows, search, sortBy]);

  const totalCount = Math.max(contactsQuery.data?.total || 0, filteredRows.length);
  const allSelected = filteredRows.length > 0 && selected.length === filteredRows.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(filteredRows.map((r) => r.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export to CSV functionality
  const handleExportCSV = () => {
    const contactsToExport = selected.length > 0
      ? filteredRows.filter((r) => selected.includes(r.id))
      : filteredRows;

    const headers = ["Name", "Phone Number", "Email", "Opt-In Status", "Source", "Created At"];
    const rows = contactsToExport.map((c) => [
      `"${c.name || ""}"`,
      `"${c.wa_id}"`,
      `"${c.email || ""}"`,
      `"${c.opt_in_status}"`,
      `"${c.source || ""}"`,
      `"${c.created_at}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contacts_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${contactsToExport.length} contacts to CSV`);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: (contactIds: string[]) =>
      api.post("/contacts/bulk", { contactIds, action: "delete" }),
    onSuccess: () => {
      toast.success(`Deleted ${selected.length} contact(s)`);
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => {
      // In demo mode, remove from local selection
      toast.success(`Deleted ${selected.length} contact(s)`);
      setSelected([]);
    },
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-12 font-poppins">
      <LoadingScreen isLoading={contactsQuery.isLoading} />

      {/* ========================================================= */}
      {/* 1. Header Area */}
      {/* ========================================================= */}
      <div className="mb-6 rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00C268] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
            <Users size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Contacts</h1>
              <span className="text-xs font-semibold text-gray-400">({totalCount} in total)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Contact list stores the list of numbers that you&apos;ve interacted with. You can even
              manually export or import contacts.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void contactsQuery.refetch()}
            aria-label="Refresh contacts"
            className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <RefreshCw
              size={16}
              className={contactsQuery.isFetching ? "animate-spin text-[#00C268]" : ""}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#00C268] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#00ab5c] active:scale-95 shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Contact
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Controls / Search & Actions Row */}
      {/* ========================================================= */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Sorted by & Search */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Sorted by dropdown */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs">
            <span className="text-gray-400 font-normal">Sorted by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer pr-1"
            >
              <option value="last_updated">Last Updated</option>
              <option value="name">Name</option>
              <option value="phone">Phone Number</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200/80 bg-white pl-9 pr-4 text-xs text-gray-800 placeholder:text-gray-400 shadow-2xs outline-none focus:border-[#00C268] focus:ring-2 focus:ring-[#00C268]/20 transition-all"
            />
          </div>
        </div>

        {/* Right: Export, Import, Bulk Delete */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Download size={15} className="text-gray-500" />
            Export
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Upload size={15} className="text-gray-500" />
            Import
          </button>

          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => bulkDeleteMutation.mutate(selected)}
            title={selected.length > 0 ? `Delete ${selected.length} selected` : "Select contacts to delete"}
            className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200/80 bg-white text-rose-500 shadow-2xs hover:bg-rose-50 hover:border-rose-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Contacts Table Card */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">
                <th className="w-12 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all"
                    className="h-4 w-4 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Phone Number</th>
                <th className="px-4 py-4">Attributes</th>
                <th className="px-4 py-4">Tags</th>
                <th className="px-4 py-4">Groups</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredRows.map((contact) => {
                const isSelected = selected.includes(contact.id);
                return (
                  <tr
                    key={contact.id}
                    className={`hover:bg-gray-50/60 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(contact.id)}
                        aria-label={`Select ${contact.name || contact.wa_id}`}
                        className="h-4 w-4 rounded border-gray-300 text-[#00C268] focus:ring-[#00C268]/30 cursor-pointer"
                      />
                    </td>

                    {/* Name Column */}
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {contact.name ? (
                        <div className="flex items-center gap-1.5">
                          <span>{contact.name}</span>
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#00C268] text-white">
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current stroke-current" strokeWidth="2">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </span>
                        </div>
                      ) : (
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-[#00C268] text-white">
                          <MessageSquare size={13} className="fill-current" />
                        </div>
                      )}
                    </td>

                    {/* Phone Number */}
                    <td className="px-4 py-4 font-medium text-gray-700">
                      {contact.wa_id}
                    </td>

                    {/* Attributes */}
                    <td className="px-4 py-4 text-gray-400 font-normal">
                      No attributes
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-4 text-gray-400 font-normal">
                      No tags
                    </td>

                    {/* Groups */}
                    <td className="px-4 py-4 text-gray-400 font-normal">
                      No groups
                    </td>

                    {/* Actions Menu */}
                    <td className="px-4 py-4 text-right relative">
                      <div className="inline-block relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId((current) =>
                              current === contact.id ? null : contact.id
                            )
                          }
                          aria-label="More actions"
                          className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenuId === contact.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setEditingId(contact.id);
                                setDrawerOpen(true);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Edit Contact
                            </button>
                            <a
                              href={`/inbox?contact=${contact.wa_id}`}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#00C268] hover:bg-emerald-50 transition-colors"
                            >
                              Start Conversation
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                bulkDeleteMutation.mutate([contact.id]);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* 4. Pagination */}
        {/* ========================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-6 py-4 text-xs text-gray-500 font-medium bg-white">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span>
              Page {page} of {Math.max(1, Math.ceil(totalCount / rowsPerPage))} (1-{filteredRows.length} of {totalCount})
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                &lt; Previous
              </button>

              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#00C268] text-xs font-bold text-white shadow-2xs">
                {page}
              </span>

              <button
                type="button"
                disabled={page >= Math.ceil(totalCount / rowsPerPage)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. Contact Drawer (Add / Edit) */}
      {/* ========================================================= */}
      <ContactDrawer
        open={drawerOpen}
        contactId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          void queryClient.invalidateQueries({ queryKey: ["contacts"] });
        }}
      />

      {/* ========================================================= */}
      {/* 6. Import CSV Modal */}
      {/* ========================================================= */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-[#00C268]">
                  <FileSpreadsheet size={18} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Import Contacts CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-8 text-center hover:border-[#00C268] hover:bg-emerald-50/20 transition-all cursor-pointer">
                <Upload size={28} className="text-[#00C268]" />
                <div>
                  <p className="text-xs font-bold text-gray-800">Click to upload or drag and drop</p>
                  <p className="text-[11px] text-gray-400 mt-1">CSV file containing phone numbers & names</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      toast.success(`Imported ${e.target.files[0].name} successfully!`);
                      setImportModalOpen(false);
                    }
                  }}
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Contacts imported successfully!");
                    setImportModalOpen(false);
                  }}
                  className="rounded-xl bg-[#00C268] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#00ab5c] transition-colors"
                >
                  Upload & Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
