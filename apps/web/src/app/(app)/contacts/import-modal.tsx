"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { downloadCsv, guessColumn, parseCsv, toCsv, uniqueHeaders } from "./csv";
import { isUuid, Modal, TagChip, type GroupOption, type TagOption } from "./ui";

interface ParsedFile {
  name: string;
  headers: string[];
  rows: string[][];
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; waId: string; reason: string }[];
}

/** The API accepts at most 10k rows per request; stay well below it. */
const BATCH_SIZE = 5000;

export function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phoneCol, setPhoneCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [emailCol, setEmailCol] = useState("");
  const [keepExtra, setKeepExtra] = useState(true);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
    enabled: open,
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<{ data: GroupOption[] }>("/groups"),
    enabled: open,
  });
  // Only real (persisted) tags/groups can be linked — the API validates UUIDs.
  const tagOptions = (tags.data?.data ?? []).filter((t) => isUuid(t.id));
  const groupOptions = (groups.data?.data ?? []).filter((g) => isUuid(g.id));

  const reset = () => {
    setFile(null);
    setPhoneCol("");
    setNameCol("");
    setEmailCol("");
    setTagIds([]);
    setGroupIds([]);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    if (importMutation.isPending) return;
    reset();
    onClose();
  };

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      toast.error("Please choose a .csv file");
      return;
    }
    const rows = parseCsv(await f.text());
    if (rows.length < 2) {
      toast.error("The file needs a header row and at least one contact");
      return;
    }
    const headers = uniqueHeaders(rows[0]!);
    setFile({ name: f.name, headers, rows: rows.slice(1) });
    setResult(null);
    setPhoneCol(
      guessColumn(headers, /phone|mobile|number|whatsapp|wa_?id|msisdn/i, /e-?mail/i) ||
        guessColumn(headers, /contact/i, /name|e-?mail/i) ||
        headers[0]!,
    );
    setNameCol(guessColumn(headers, /name/i));
    setEmailCol(guessColumn(headers, /e-?mail/i));
  };

  const builtRows = useMemo(() => {
    if (!file) return [];
    const idx = (col: string) => (col ? file.headers.indexOf(col) : -1);
    const p = idx(phoneCol);
    const n = idx(nameCol);
    const e = idx(emailCol);
    return file.rows
      .filter((row) => (row[p] ?? "").trim() !== "")
      .map((row) => {
        const attributes: Record<string, unknown> = {};
        if (keepExtra) {
          file.headers.forEach((header, i) => {
            if (i === p || i === n || i === e) return;
            const value = row[i];
            if (value) attributes[header] = value;
          });
        }
        return {
          waId: row[p]!,
          name: n >= 0 && row[n] ? row[n] : undefined,
          email: e >= 0 && row[e] ? row[e] : undefined,
          attributes,
        };
      });
  }, [file, phoneCol, nameCol, emailCol, keepExtra]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const rows = builtRows;
      if (rows.length === 0) throw new Error("No rows with a phone number were found");
      const total: ImportResult = { imported: 0, skipped: 0, errors: [] };
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const res = await api.post<ImportResult>("/contacts/import", {
          rows: rows.slice(i, i + BATCH_SIZE),
          tagIds,
          groupIds,
        });
        total.imported += res.imported;
        total.skipped += res.skipped;
        total.errors.push(...res.errors.map((err) => ({ ...err, row: err.row + i })));
      }
      return total;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Imported ${data.imported.toLocaleString()} contact${data.imported === 1 ? "" : "s"}`);
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Import failed", {
        description: error instanceof ApiClientError ? undefined : "Check the file and try again.",
      }),
  });

  const downloadSample = () =>
    downloadCsv(
      "contacts_sample.csv",
      toCsv(["phone", "name", "email", "city"], [
        ["919876543210", "Priya Sharma", "priya@example.com", "Mumbai"],
        ["14155550123", "Alex Morgan", "alex@example.com", "San Francisco"],
      ]),
    );

  const validCount = builtRows.length;
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  return (
    <Modal
      open={open}
      onClose={close}
      icon={FileSpreadsheet}
      title="Import contacts"
      description="Upload a CSV — existing numbers are updated in place, new ones are added."
      className="sm:max-w-2xl"
      footer={
        result ? (
          <>
            <Button variant="outline" onClick={reset}>
              <RotateCcw size={15} />
              Import another file
            </Button>
            <Button onClick={close}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!file || !phoneCol || validCount === 0}
              loading={importMutation.isPending}
            >
              {!importMutation.isPending && <UploadCloud size={16} />}
              Import {validCount > 0 ? validCount.toLocaleString() : ""} contact{validCount === 1 ? "" : "s"}
            </Button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <motion.span
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
              >
                <CheckCircle2 size={30} />
              </motion.span>
              <div>
                <p className="font-display text-xl font-semibold">Import complete</p>
                <p className="text-sm text-muted-foreground">
                  {result.imported.toLocaleString()} imported · {result.skipped.toLocaleString()} skipped
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle size={15} />
                  Rows that were skipped
                </p>
                <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto text-xs text-amber-900/80">
                  {result.errors.slice(0, 50).map((err) => (
                    <li key={`${err.row}-${err.waId}`}>
                      Row {err.row}: <span className="font-mono">{err.waId || "(empty)"}</span> — {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ) : !file ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease }}
            className="space-y-4"
          >
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all",
                dragging
                  ? "border-primary bg-brand-50"
                  : "border-brand-200 bg-brand-50/30 hover:border-brand-400 hover:bg-brand-50/70",
              )}
            >
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-aurora opacity-60" />
              <motion.span
                animate={dragging ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
                className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
              >
                <UploadCloud size={26} />
              </motion.span>
              <div className="relative">
                <p className="text-sm font-semibold">
                  <span className="text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  CSV with a phone column (country code included). Name, email and any other columns are optional.
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <Download size={14} />
              Download a sample CSV
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-soft">
                <FileSpreadsheet size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.rows.length.toLocaleString()} rows · {file.headers.length} columns
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                Change
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Phone column" required>
                {({ id }) => (
                  <Select id={id} value={phoneCol} onChange={(e) => setPhoneCol(e.target.value)}>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Name column">
                {({ id }) => (
                  <Select id={id} value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
                    <option value="">— None —</option>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Email column">
                {({ id }) => (
                  <Select id={id} value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
                    <option value="">— None —</option>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={keepExtra}
                onChange={(e) => setKeepExtra(e.target.checked)}
                className="h-4 w-4 rounded border-brand-300 accent-[#833ab4]"
              />
              Save the remaining columns as contact attributes
            </label>

            {(tagOptions.length > 0 || groupOptions.length > 0) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tagOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground/90">Apply tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tagOptions.map((tag) => {
                        const active = tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setTagIds((l) => toggle(l, tag.id))}
                            className={cn(
                              "rounded-full transition",
                              active ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100",
                            )}
                          >
                            <TagChip tag={tag} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {groupOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground/90">Add to groups</p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupOptions.map((group) => {
                        const active = groupIds.includes(group.id);
                        return (
                          <button
                            key={group.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setGroupIds((l) => toggle(l, group.id))}
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
                              active
                                ? "border-primary bg-brand-50 text-primary"
                                : "border-border bg-white text-muted-foreground hover:border-brand-200",
                            )}
                          >
                            {group.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border">
              <p className="border-b bg-brand-50/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Preview · first {Math.min(5, file.rows.length)} rows
              </p>
              <div className="scrollbar-thin relative overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {file.headers.map((h) => (
                        <th
                          key={h}
                          className={cn(
                            "whitespace-nowrap px-3 py-2 text-left font-semibold",
                            h === phoneCol ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {file.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {file.headers.map((h, j) => (
                          <td key={h} className="max-w-[12rem] truncate whitespace-nowrap px-3 py-2">
                            {row[j] || <span className="text-muted-foreground/50">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
