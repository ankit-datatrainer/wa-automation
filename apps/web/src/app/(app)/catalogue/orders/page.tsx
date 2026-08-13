"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Package, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { relation } from "@/components/data/ledger-table";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

interface OrderLine {
  retailerId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  id: string;
  items: OrderLine[];
  total: number;
  currency: string;
  status: string;
  note: string | null;
  created_at: string;
  contacts: unknown;
}

interface Summary {
  totalOrders: number;
  openOrders: number;
  revenue: number;
  currency: string;
}

const STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const orders = useQuery({
    queryKey: ["orders", { page, status }],
    queryFn: () =>
      api.get<{ data: Order[]; page: number; totalPages: number; total: number }>(
        "/commerce/orders",
        { page, pageSize: 25, status: status || undefined },
      ),
  });

  const summary = useQuery({
    queryKey: ["orders", "summary"],
    queryFn: () => api.get<Summary>("/commerce/orders/summary"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      api.patch(`/commerce/orders/${id}`, { status: next }),
    onSuccess: () => {
      toast.success("Order updated");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update the order"),
  });

  const rows = orders.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders customers placed from your WhatsApp catalogue."
        onRefresh={() => {
          void orders.refetch();
          void summary.refetch();
        }}
        refreshing={orders.isFetching}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={ShoppingCart}
          label="Total orders"
          value={summary.data ? String(summary.data.totalOrders) : "—"}
        />
        <Metric
          icon={Package}
          label="Open orders"
          value={summary.data ? String(summary.data.openOrders) : "—"}
        />
        <Metric
          icon={IndianRupee}
          label="Revenue"
          value={
            summary.data
              ? formatCurrency(summary.data.revenue, summary.data.currency)
              : "—"
          }
        />
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
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
        </div>

        {orders.isError ? (
          <ErrorState message="Could not load orders." onRetry={() => void orders.refetch()} />
        ) : orders.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="When a customer checks out from your catalogue in WhatsApp, the order appears here."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH>Items</TH>
                  <TH>Total</TH>
                  <TH>Placed</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((order) => {
                  const contact = relation<{ wa_id: string; name: string | null }>(order.contacts);
                  return (
                    <TR key={order.id}>
                      <TD>
                        <p className="font-medium">{contact?.name ?? "Unnamed"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          +{contact?.wa_id}
                        </p>
                      </TD>
                      <TD>
                        <ul className="space-y-0.5 text-xs">
                          {order.items.map((item, i) => (
                            <li key={i} className="text-muted-foreground">
                              <span className="font-mono">{item.retailerId}</span> × {item.quantity}
                              {" — "}
                              {formatCurrency(item.lineTotal, order.currency)}
                            </li>
                          ))}
                        </ul>
                        {order.note && (
                          <p className="mt-1 max-w-xs truncate text-xs italic text-muted-foreground">
                            “{order.note}”
                          </p>
                        )}
                      </TD>
                      <TD className="font-bold">
                        {formatCurrency(Number(order.total), order.currency)}
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                          <Select
                            className="h-9 w-36"
                            value={order.status}
                            onChange={(e) =>
                              updateStatus.mutate({ id: order.id, next: e.target.value })
                            }
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            <Pagination
              page={orders.data!.page}
              totalPages={orders.data!.totalPages}
              total={orders.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
