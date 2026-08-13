"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

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

export default function OptInManagementPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const optIn = useQuery({
    queryKey: ["opt-in", { page, status }],
    queryFn: () =>
      api.get<OptInResponse>("/settings/opt-in", {
        page,
        pageSize: 25,
        status: status || undefined,
      }),
  });

  const rows = optIn.data?.data ?? [];
  const summary = optIn.data?.summary;

  return (
    <>
      <PageHeader
        title="Opt-in Management"
        description="Consent records for marketing messages. Contacts who reply STOP are opted out automatically."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
            <BadgeCheck size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Opted in
            </p>
            <p className="text-2xl font-bold">{summary?.optedIn ?? "—"}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldOff size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Opted out
            </p>
            <p className="text-2xl font-bold">{summary?.optedOut ?? "—"}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Select
            className="w-56"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All contacts</option>
            <option value="opted_in">Opted in</option>
            <option value="opted_out">Opted out</option>
            <option value="unknown">Unknown</option>
          </Select>
          <p className="text-sm text-muted-foreground">
            Marketing campaigns skip opted-out contacts automatically.
          </p>
        </div>

        {optIn.isError ? (
          <ErrorState message="Could not load opt-in records." onRetry={() => void optIn.refetch()} />
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
          <>
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
                {rows.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium">{row.name ?? "Unnamed"}</TD>
                    <TD className="font-mono text-xs">+{row.wa_id}</TD>
                    <TD>
                      <Badge tone={statusTone(row.opt_in_status)}>
                        {row.opt_in_status.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{row.source ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.opt_in_updated_at
                        ? new Date(row.opt_in_updated_at).toLocaleString()
                        : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={optIn.data!.page}
              totalPages={optIn.data!.totalPages}
              total={optIn.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  );
}
