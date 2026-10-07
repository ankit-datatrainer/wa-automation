"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { ease } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  /** Optional class for the header cell only (falls back to `className`). */
  headerClassName?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  total: number;
}

/** Only the first rows animate in; long pages render statically to avoid jank. */
const ANIMATED_ROWS = 20;

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
  emptyAction,
  pageSize = 25,
  toolbar,
  title,
  description,
  extraParams,
  className,
}: {
  queryKey: unknown[];
  endpoint: string;
  columns: Column<T>[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  pageSize?: number;
  toolbar?: React.ReactNode;
  /** Optional card heading rendered above the table. */
  title?: string;
  description?: string;
  extraParams?: Record<string, unknown>;
  className?: string;
}) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: [...queryKey, { page, ...extraParams }],
    queryFn: () => api.get<PaginatedResponse<T>>(endpoint, { page, pageSize, ...extraParams }),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const hasHeader = Boolean(title || description || toolbar);

  return (
    <Card className={cn("overflow-hidden", className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-brand-50/60 via-white to-white px-5 py-4">
          {(title || description) && (
            <div className="min-w-0">
              {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}
        </div>
      )}

      {query.isError ? (
        <div className="p-4">
          <ErrorState
            message={`Could not load ${emptyTitle.toLowerCase()}.`}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : query.isLoading ? (
        <div className="space-y-2.5 p-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-9 rounded-lg" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          <div
            className={cn(
              "transition-opacity duration-200",
              query.isPlaceholderData && "pointer-events-none opacity-60",
            )}
          >
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TH key={column.key} className={column.headerClassName ?? column.className}>
                      {column.header}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody key={query.data?.page}>
                {rows.map((row, index) => {
                  const id = (row as { id?: unknown }).id;
                  const key = typeof id === "string" || typeof id === "number" ? id : index;
                  const cells = columns.map((column) => (
                    <TD key={column.key} className={column.className}>
                      {column.render(row)}
                    </TD>
                  ));

                  return index < ANIMATED_ROWS ? (
                    <motion.tr
                      key={key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease, delay: index * 0.025 }}
                      className="transition-colors duration-150 hover:bg-brand-50/50"
                    >
                      {cells}
                    </motion.tr>
                  ) : (
                    <TR key={key}>{cells}</TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

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
