"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Tag,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatePresence, AnimatedNumber, ease, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { CampaignWizard } from "../../campaign-wizard";

interface ParsedCsv {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: string[][];
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; waId: string; reason: string }[];
}

interface TagOption {
  id: string;
  name: string;
}

const MAX_ROWS = 10_000;
const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mirrors the API's phone check so the preview can warn before importing. */
const VALID_PHONE = /^[1-9]\d{7,14}$/;

const STEPS = ["Upload", "Map & import", "Send"] as const;

export default function CsvCampaignPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [phoneColumn, setPhoneColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [keepAttributes, setKeepAttributes] = useState(true);
  const [tagging, setTagging] = useState(true);
  const [tagName, setTagName] = useState("");
  const [result, setResult] = useState<(ImportResult & { tagId: string | null; tagName: string }) | null>(null);

  const step = result && result.imported > 0 ? 2 : parsed ? 1 : 0;

  const phoneIndex = phoneColumn === "" ? -1 : Number(phoneColumn);
  const nameIndex = nameColumn === "" ? -1 : Number(nameColumn);
  const emailIndex = emailColumn === "" ? -1 : Number(emailColumn);

  const check = useMemo(() => {
    if (!parsed || phoneIndex < 0) return { withPhone: 0, invalid: 0 };
    let withPhone = 0;
    let invalid = 0;
    for (const row of parsed.rows) {
      const raw = (row[phoneIndex] ?? "").trim();
      if (!raw) continue;
      withPhone += 1;
      if (!VALID_PHONE.test(raw.replace(/\D/g, ""))) invalid += 1;
    }
    return { withPhone, invalid };
  }, [parsed, phoneIndex]);

  /** Finds an existing tag with this name, or creates it. Returns null when tagging is unavailable. */
  const ensureTag = async (name: string): Promise<string | null> => {
    const findExisting = async () => {
      const list = await queryClient.fetchQuery({
        queryKey: ["tags"],
        queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
        staleTime: 0,
      });
      return list.data.find((t) => UUID.test(t.id) && t.name.toLowerCase() === name.toLowerCase());
    };

    const existing = await findExisting();
    if (existing) return existing.id;

    try {
      const created = await api.post<TagOption>("/tags", { name, color: "#833AB4" });
      return UUID.test(created.id) ? created.id : null;
    } catch (error) {
      // Someone created it between our lookup and insert.
      if (error instanceof ApiClientError && error.status === 409) {
        return (await findExisting())?.id ?? null;
      }
      throw error;
    }
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!parsed || phoneIndex < 0) throw new Error("Choose the phone number column first");

      const tagId = tagging && tagName.trim() ? await ensureTag(tagName.trim()) : null;

      const rows = parsed.rows
        .filter((row) => (row[phoneIndex] ?? "").trim())
        .map((row) => {
          const attributes: Record<string, string> = {};
          if (keepAttributes) {
            parsed.headers.forEach((header, i) => {
              if (i === phoneIndex || i === nameIndex || i === emailIndex) return;
              const value = (row[i] ?? "").trim();
              if (header && value) attributes[header] = value;
            });
          }
          const name = nameIndex >= 0 ? (row[nameIndex] ?? "").trim() : "";
          const email = emailIndex >= 0 ? (row[emailIndex] ?? "").trim() : "";
          return {
            waId: row[phoneIndex]!.trim(),
            name: name || undefined,
            email: email || undefined,
            attributes,
          };
        });

      if (rows.length === 0) throw new Error("No rows have a phone number in the selected column");

      const imported = await api.post<ImportResult>("/contacts/import", {
        rows,
        tagIds: tagId ? [tagId] : [],
        groupIds: [],
      });
      return { ...imported, tagId, tagName: tagName.trim() };
    },
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success(`Imported ${data.imported.toLocaleString()} contacts`);
      if (tagging && !data.tagId) {
        toast.warning("Contacts were imported, but they could not be tagged.");
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Import failed"),
  });

  const reset = () => {
    setParsed(null);
    setResult(null);
    setPhoneColumn("");
    setNameColumn("");
    setEmailColumn("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please choose a .csv file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("The file is larger than 10 MB");
      return;
    }

    const text = (await file.text()).replace(/^﻿/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      toast.error("The file needs a header row and at least one data row");
      return;
    }

    const delimiter = detectDelimiter(lines[0]!);
    const headers = splitCsvLine(lines[0]!, delimiter).map((h, i) => h || `Column ${i + 1}`);
    const rows = lines.slice(1).map((line) => splitCsvLine(line, delimiter));

    setParsed({ fileName: file.name, fileSize: file.size, headers, rows });
    setResult(null);
    // Pre-select the columns that look like phone, name and email.
    const find = (re: RegExp) => headers.findIndex((h) => re.test(h));
    const phone = find(/phone|mobile|number|whatsapp|wa_?id|msisdn/i);
    const name = find(/name/i);
    const email = find(/e-?mail/i);
    setPhoneColumn(String(phone >= 0 ? phone : 0));
    setNameColumn(name >= 0 && name !== phone ? String(name) : "");
    setEmailColumn(email >= 0 && email !== phone ? String(email) : "");

    const base = file.name.replace(/\.csv$/i, "").slice(0, 36);
    setTagName(`CSV · ${base} · ${new Date().toLocaleDateString()}`.slice(0, 60));
  };

  const downloadSample = () => {
    const sample = "phone,name,email,city\n+15550000001,Sample Contact,sample@example.com,Springfield\n";
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tooManyRows = (parsed?.rows.length ?? 0) > MAX_ROWS;
  const columnRole = (i: number) =>
    i === phoneIndex ? "Phone" : i === nameIndex ? "Name" : i === emailIndex ? "Email" : null;

  return (
    <>
      <PageHeader
        title="CSV Campaign"
        description="Upload a contact list, map its columns, then send a template to everyone in it."
        actions={
          <Button variant="outline" onClick={downloadSample}>
            <Download size={16} />
            Sample CSV
          </Button>
        }
      />

      <div className="space-y-5">
        <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-300",
                  i < step && "border-transparent bg-brand-50 text-brand-700",
                  i === step && "border-transparent bg-brand-gradient text-white shadow-glow",
                  i > step && "bg-white text-muted-foreground",
                )}
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-xs">{i + 1}</span>
                )}
                {label}
              </span>
              {i < STEPS.length - 1 && <span aria-hidden className="h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>1. Upload your list</CardTitle>
            <CardDescription>
              A CSV with a header row. Phone numbers must include the country code. Up to{" "}
              {MAX_ROWS.toLocaleString()} rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              ref={inputRef}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="peer sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />

            <AnimatePresence mode="wait" initial={false}>
              {!parsed ? (
                <motion.label
                  key="dropzone"
                  htmlFor="csv-file"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, scale: dragging ? 1.01 : 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!dragging) setDragging(true);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleFile(file);
                  }}
                  className={cn(
                    "group relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/60 sm:py-16",
                    dragging
                      ? "border-primary bg-brand-50"
                      : "border-brand-200 bg-gradient-to-b from-brand-50/40 to-white hover:border-brand-400 hover:bg-brand-50/50",
                  )}
                >
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
                  <motion.span
                    animate={dragging ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="relative grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
                  >
                    {dragging && (
                      <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-2xl bg-primary/40" />
                    )}
                    <UploadCloud size={28} className="relative" />
                  </motion.span>
                  <span className="relative space-y-1">
                    <span className="block font-display text-lg font-semibold">
                      {dragging ? "Release to upload" : "Drag & drop your CSV here"}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      or <span className="font-semibold text-primary underline-offset-4 group-hover:underline">browse your files</span>{" "}
                      — .csv up to 10 MB
                    </span>
                  </span>
                </motion.label>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  className="flex flex-col gap-4 rounded-2xl border bg-brand-50/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                      <FileSpreadsheet size={22} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{parsed.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {parsed.rows.length.toLocaleString()} rows · {parsed.headers.length} columns ·{" "}
                        {formatBytes(parsed.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                      <RefreshCw size={14} />
                      Replace
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset} className="text-rose-600 hover:bg-rose-50">
                      <Trash2 size={14} />
                      Remove
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {parsed && (
                <motion.div
                  key="mapping"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Phone number column" required>
                      {({ id }) => (
                        <Select id={id} value={phoneColumn} onChange={(e) => setPhoneColumn(e.target.value)}>
                          {parsed.headers.map((header, i) => (
                            <option key={i} value={String(i)}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label="Name column">
                      {({ id }) => (
                        <Select id={id} value={nameColumn} onChange={(e) => setNameColumn(e.target.value)}>
                          <option value="">None</option>
                          {parsed.headers.map((header, i) => (
                            <option key={i} value={String(i)} disabled={i === phoneIndex}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label="Email column">
                      {({ id }) => (
                        <Select id={id} value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)}>
                          <option value="">None</option>
                          {parsed.headers.map((header, i) => (
                            <option key={i} value={String(i)} disabled={i === phoneIndex}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2.5">
                      <p className="text-sm font-semibold">Preview</p>
                      <p className="text-xs text-muted-foreground">
                        First {Math.min(5, parsed.rows.length)} of {parsed.rows.length.toLocaleString()} rows
                      </p>
                    </div>
                    <Table>
                      <THead>
                        <TR className="hover:bg-transparent">
                          {parsed.headers.map((header, i) => {
                            const role = columnRole(i);
                            return (
                              <TH key={i} className={cn(role && "bg-brand-50 text-brand-700")}>
                                <span className="inline-flex items-center gap-1.5">
                                  {header}
                                  {role && <Badge tone="brand" className="px-1.5 py-0 text-[10px] normal-case tracking-normal">{role}</Badge>}
                                </span>
                              </TH>
                            );
                          })}
                        </TR>
                      </THead>
                      <TBody>
                        {parsed.rows.slice(0, 5).map((row, r) => (
                          <TR key={r}>
                            {parsed.headers.map((_, i) => (
                              <TD
                                key={i}
                                className={cn(
                                  "whitespace-nowrap text-xs",
                                  columnRole(i) && "bg-brand-50/40 font-medium",
                                )}
                              >
                                {row[i] ?? ""}
                              </TD>
                            ))}
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-3 rounded-xl border bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <Tag size={15} className="text-primary" />
                            Tag imported contacts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lets you send this campaign to exactly these contacts — and re-target them later.
                          </p>
                        </div>
                        <Switch checked={tagging} onCheckedChange={setTagging} aria-label="Tag imported contacts" />
                      </div>
                      <AnimatePresence initial={false}>
                        {tagging && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease }}
                            className="overflow-hidden"
                          >
                            <Input
                              aria-label="Tag name"
                              value={tagName}
                              maxLength={60}
                              onChange={(e) => setTagName(e.target.value)}
                              placeholder="e.g. Diwali leads"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4">
                      <div>
                        <p className="text-sm font-semibold">Save other columns as attributes</p>
                        <p className="text-xs text-muted-foreground">
                          Extra columns (city, plan, order id...) are stored on each contact.
                        </p>
                      </div>
                      <Switch
                        checked={keepAttributes}
                        onCheckedChange={setKeepAttributes}
                        aria-label="Save other columns as contact attributes"
                      />
                    </div>
                  </div>

                  {(tooManyRows || check.invalid > 0 || check.withPhone < parsed.rows.length) && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        {tooManyRows && (
                          <p className="font-semibold">
                            This file has more than {MAX_ROWS.toLocaleString()} rows. Split it into smaller files.
                          </p>
                        )}
                        {check.withPhone < parsed.rows.length && (
                          <p>
                            {(parsed.rows.length - check.withPhone).toLocaleString()} rows have no phone number
                            and will be ignored.
                          </p>
                        )}
                        {check.invalid > 0 && (
                          <p>
                            {check.invalid.toLocaleString()} phone numbers look invalid (they need a country
                            code) and will be skipped.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{check.withPhone.toLocaleString()}</span>{" "}
                      contacts ready to import
                    </p>
                    <Button
                      loading={upload.isPending}
                      disabled={tooManyRows || check.withPhone === 0 || (tagging && !tagName.trim())}
                      onClick={() => upload.mutate()}
                    >
                      {!upload.isPending && <Users size={16} />}
                      Import {check.withPhone.toLocaleString()} contacts
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <p className="font-semibold text-emerald-900">Import complete</p>
                      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                        <div className="rounded-xl bg-white p-3 shadow-soft">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Imported
                          </p>
                          <p className="font-display text-2xl font-bold text-emerald-700">
                            <AnimatedNumber value={result.imported} duration={0.8} />
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-3 shadow-soft">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Skipped
                          </p>
                          <p
                            className={cn(
                              "font-display text-2xl font-bold",
                              result.skipped > 0 ? "text-amber-600" : "text-foreground",
                            )}
                          >
                            <AnimatedNumber value={result.skipped} duration={0.8} />
                          </p>
                        </div>
                      </div>
                      {result.errors.length > 0 && (
                        <ul className="space-y-0.5 text-xs text-emerald-900/80">
                          {result.errors.slice(0, 8).map((error) => (
                            <li key={error.row}>
                              Row {error.row} ({error.waId}): {error.reason}
                            </li>
                          ))}
                          {result.errors.length > 8 && (
                            <li className="font-semibold">and {result.errors.length - 8} more…</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <AnimatePresence>
          {result && result.imported > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.45, ease, delay: 0.1 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-bold">2. Send to the imported contacts</h2>
                <p className="text-sm text-muted-foreground">
                  {result.tagId
                    ? `The imported contacts are tagged “${result.tagName}”, so this campaign targets exactly them.`
                    : "These contacts were not tagged, so choose an audience below. Broadcast reaches every contact who has not opted out — not only this list."}
                </p>
              </div>
              {result.tagId ? (
                <CampaignWizard
                  key={result.tagId}
                  audienceType="tags"
                  lockAudience
                  initialSelectedIds={[result.tagId]}
                />
              ) : (
                <CampaignWizard audienceType="broadcast" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Picks the delimiter that splits the header row into the most fields. */
function detectDelimiter(header: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = splitCsvLine(header, d).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** Minimal CSV splitter that honours double-quoted fields containing the delimiter. */
function splitCsvLine(line: string, delimiter = ","): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}
