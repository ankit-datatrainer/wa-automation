"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Percent, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { ease, motion, SegmentedTabs } from "@/components/motion";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import { formatDateTime, StatTile } from "../_components/settings-kit";

interface OptInRow {
  id: string;
  wa_id: string;
  name: string | null;
  opt_in_status: string;
  opt_in_updated_at: string | null;
  source: string | null;
}

interface OptInResponse {
  data: OptInRow[];
  page: number;
  totalPages: number;
  total: number;
  summary: { optedIn: number; optedOut: number };
}

type StatusFilter = "" | "opted_in" | "opted_out" | "unknown";

export default function OptInManagementPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("");

  const optIn = useQuery({
    queryKey: ["opt-in", { page, status }],
    queryFn: () =>
      api.get<OptInResponse>("/settings/opt-in", {
        page,
        pageSize: 25,
        status: status || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = optIn.data?.data ?? [];
  const summary = optIn.data?.summary;
  const consented = summary ? summary.optedIn + summary.optedOut : 0;
  const rate = summary && consented > 0 ? (summary.optedIn / consented) * 100 : null;

  return (
    <>
      <PageHeader
        title="Opt-in Management"
        description="Consent records for marketing messages. Contacts who reply STOP are opted out automatically."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={BadgeCheck} label="Opted in" tone="success" value={summary?.optedIn} />
        <StatTile icon={ShieldOff} label="Opted out" tone="danger" value={summary?.optedOut} />
        <StatTile
          icon={Percent}
          label="Consent rate"
          value={rate}
          format={(n) => `${n.toFixed(1)}%`}
          hint={rate == null ? "No consent records yet" : "Of contacts with a recorded choice"}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <SegmentedTabs
              layoutId="optin-filter"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              tabs={[
                { value: "", label: "All contacts" },
                { value: "opted_in", label: "Opted in" },
                { value: "opted_out", label: "Opted out" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck size={15} className="text-primary" />
            Marketing campaigns skip opted-out contacts automatically.
          </p>
        </div>

        {optIn.isError ? (
          <div className="p-5">
            <ErrorState message="Could not load opt-in records." onRetry={() => void optIn.refetch()} />
          </div>
        ) : optIn.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="No contacts to show"
            description="Opt-in status is tracked for every contact you add."
          />
        ) : (
          <motion.div
            key={`${status}-${page}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: optIn.isFetching ? 0.6 : 1 }}
            transition={{ duration: 0.25, ease }}
          >
            <Table>
              <THead>
                <TR>
                  <TH>Contact</TH>
                  <TH>Phone</TH>
                  <TH>Status</TH>
                  <TH>Source</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={i < 20 ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease, delay: i < 20 ? i * 0.02 : 0 }}
                    className="transition-colors duration-150 hover:bg-brand-50/50"
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-primary ring-1 ring-brand-100">
                          {initials(row.name, "#")}
                        </span>
                        <span className="font-medium">{row.name ?? "Unnamed"}</span>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap font-mono text-xs">+{row.wa_id}</TD>
                    <TD>
                      <Badge tone={statusTone(row.opt_in_status)} className="capitalize">
                        {row.opt_in_status.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD className="text-xs capitalize text-muted-foreground">{row.source ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(row.opt_in_updated_at)}
                    </TD>
                  </motion.tr>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={optIn.data!.page}
              totalPages={optIn.data!.totalPages}
              total={optIn.data!.total}
              onPageChange={setPage}
            />
          </motion.div>
        )}
      </Card>
    </>
  );
}
