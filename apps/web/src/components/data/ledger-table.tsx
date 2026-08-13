"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  total: number;
}

/**
 * Paginated read-only table for the ledger and history pages, which differ only
 * in their endpoint and columns.
 */
export function LedgerTable<T>({
  queryKey,
  endpoint,
  columns,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  pageSize = 25,
  toolbar,
  extraParams,
}: {
  queryKey: unknown[];
  endpoint: string;
  columns: Column<T>[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  pageSize?: number;
  toolbar?: React.ReactNode;
  extraParams?: Record<string, unknown>;
}) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: [...queryKey, { page, ...extraParams }],
    queryFn: () =>
      api.get<PaginatedResponse<T>>(endpoint, { page, pageSize, ...extraParams }),
  });

  const rows = query.data?.data ?? [];

  return (
    <Card>
      {toolbar && <div className="flex flex-wrap items-center gap-3 border-b p-4">{toolbar}</div>}

      {query.isError ? (
        <ErrorState message={`Could not load ${emptyTitle.toLowerCase()}.`} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                {columns.map((column) => (
                  <TH key={column.key} className={column.className}>
                    {column.header}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.map((row, index) => (
                <TR key={index}>
                  {columns.map((column) => (
                    <TD key={column.key} className={column.className}>
                      {column.render(row)}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={query.data!.page}
            totalPages={query.data!.totalPages}
            total={query.data!.total}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}

/** supabase-js types embedded to-one relations as arrays; normalize both. */
export function relation<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}
