"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, FileUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiClientError } from "@/lib/api-client";
import { CampaignWizard } from "../../campaign-wizard";

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; waId: string; reason: string }[];
}

export default function CsvCampaignPage() {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [phoneColumn, setPhoneColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const upload = useMutation({
    mutationFn: () => {
      if (!parsed) throw new Error("No file selected");
      const phoneIndex = parsed.headers.indexOf(phoneColumn);
      const nameIndex = parsed.headers.indexOf(nameColumn);

      return api.post<ImportResult>("/contacts/import", {
        rows: parsed.rows
          .filter((row) => row[phoneIndex])
          .map((row) => ({
            waId: row[phoneIndex]!,
            name: nameIndex >= 0 ? row[nameIndex] : undefined,
            attributes: {},
          })),
        tagIds: [],
        groupIds: [],
      });
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Imported ${data.imported} contacts`);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Import failed"),
  });

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      toast.error("The file needs a header row and at least one data row");
      return;
    }

    const headers = splitCsvLine(lines[0]!);
    const rows = lines.slice(1).map(splitCsvLine);

    setParsed({ headers, rows });
    setResult(null);
    // Pre-select the columns that look like phone and name.
    setPhoneColumn(headers.find((h) => /phone|mobile|number|wa/i.test(h)) ?? headers[0]!);
    setNameColumn(headers.find((h) => /name/i.test(h)) ?? "");
  };

  return (
    <>
      <PageHeader
        title="CSV Campaign"
        description="Upload a contact list, map its columns, then send a template to everyone in it."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload your list</CardTitle>
            <CardDescription>
              A CSV with a header row. Phone numbers must include the country code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:bg-muted/40">
              <FileUp size={32} className="text-muted-foreground" />
              <span className="text-sm font-medium">
                {parsed ? `${parsed.rows.length} rows loaded` : "Choose a CSV file"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>

            {parsed && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone number column</label>
                    <Select value={phoneColumn} onChange={(e) => setPhoneColumn(e.target.value)}>
                      {parsed.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name column (optional)</label>
                    <Select value={nameColumn} onChange={(e) => setNameColumn(e.target.value)}>
                      <option value="">None</option>
                      {parsed.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <THead>
                      <TR>
                        {parsed.headers.map((header) => (
                          <TH key={header}>{header}</TH>
                        ))}
                      </TR>
                    </THead>
                    <TBody>
                      {parsed.rows.slice(0, 5).map((row, i) => (
                        <TR key={i}>
                          {parsed.headers.map((header, j) => (
                            <TD key={header} className="text-xs">
                              {row[j] ?? ""}
                            </TD>
                          ))}
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>

                <Button loading={upload.isPending} onClick={() => upload.mutate()}>
                  Import {parsed.rows.length} contacts
                </Button>
              </>
            )}

            {result && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-accent p-4 text-sm">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">
                    Imported {result.imported} contacts, skipped {result.skipped}.
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {result.errors.slice(0, 5).map((error) => (
                        <li key={error.row}>
                          Row {error.row} ({error.waId}): {error.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {result && result.imported > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Send to the imported contacts</CardTitle>
              <CardDescription>
                The rows are now contacts, so send to them by broadcast or tag.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignWizard audienceType="broadcast" />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

/** Minimal CSV splitter that honours double-quoted fields containing commas. */
function splitCsvLine(line: string): string[] {
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
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}
