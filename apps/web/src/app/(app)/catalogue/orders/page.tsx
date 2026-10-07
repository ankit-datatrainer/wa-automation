"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  ChevronRight,
  IndianRupee,
  Package,
  PackageCheck,
  ShoppingBag,
  ShoppingCart,
  StickyNote,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FadeIn, motion, Stagger, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { relation } from "@/components/data/ledger-table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, formatCurrency, initials } from "@/lib/utils";
import { formatDateTime, humanize, timeAgo } from "../../chatbots/_components/data";
import { Modal } from "../../chatbots/_components/modal";
import { StatTile } from "../../chatbots/_components/stat-tile";

interface OrderLine {
  retailerId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  id: string;
  items: OrderLine[] | null;
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

type Contact = { wa_id: string; name: string | null };

const STATUSES = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const PIPELINE: { status: Status; icon: LucideIcon }[] = [
  { status: "placed", icon: ShoppingBag },
  { status: "confirmed", icon: Check },
  { status: "processing", icon: Package },
  { status: "shipped", icon: Truck },
  { status: "delivered", icon: PackageCheck },
];

const TONES: Record<string, NonNullable<BadgeProps["tone"]>> = {
  placed: "warning",
  confirmed: "info",
  processing: "brand",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

function money(amount: number, currency: string) {
  try {
    return formatCurrency(Number(amount), currency);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  // Snapshot of the order in the drawer, so it stays open even when a status
  // change moves the order out of the current filter/page.
  const [snapshot, setSnapshot] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const orders = useQuery({
    queryKey: ["orders", { page, status }],
    queryFn: () =>
      api.get<{ data: Order[]; page: number; totalPages: number; total: number }>(
        "/commerce/orders",
        { page, pageSize: 25, status: status || undefined },
      ),
    placeholderData: keepPreviousData,
  });

  const summary = useQuery({
    queryKey: ["orders", "summary"],
    queryFn: () => api.get<Summary>("/commerce/orders/summary"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      api.patch(`/commerce/orders/${id}`, { status: next }),
    onSuccess: (_, { id, next }) => {
      toast.success(`Order marked ${next}`);
      setSnapshot((current) => (current?.id === id ? { ...current, status: next } : current));
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update the order"),
  });

  const rows = orders.data?.data ?? [];
  const selected = (snapshot && rows.find((o) => o.id === snapshot.id)) ?? snapshot;

  const openOrder = (order: Order) => {
    setSnapshot(order);
    setDrawerOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders customers placed from your WhatsApp catalogue."
        onRefresh={() => {
          void orders.refetch();
          void summary.refetch();
        }}
        refreshing={orders.isFetching || summary.isFetching}
      />

      <Stagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile icon={ShoppingCart} label="Total orders" value={summary.data?.totalOrders} hint="All time" />
        <StatTile
          icon={Package}
          label="Open orders"
          accent="orange"
          value={summary.data?.openOrders}
          hint="Placed, confirmed or processing"
        />
        <div className="col-span-2 lg:col-span-1">
          <StatTile
            icon={IndianRupee}
            label="Revenue"
            accent="pink"
            value={summary.data?.revenue}
            format={(n) => money(n, summary.data?.currency ?? "INR")}
            hint="Excludes cancelled orders"
          />
        </div>
      </Stagger>

      <FadeIn delay={0.1}>
        <Card className="overflow-hidden">
          <div className="scrollbar-none overflow-x-auto border-b border-border/70 p-3 sm:p-4">
            <div role="tablist" aria-label="Filter by status" className="flex w-max gap-1.5">
              {["", ...STATUSES].map((s) => {
                const active = status === s;
                return (
                  <button
                    key={s || "all"}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setStatus(s);
                      setPage(1);
                    }}
                    className={cn(
                      "relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active ? "text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="order-status-pill"
                        className="absolute inset-0 rounded-lg bg-brand-gradient shadow-glow"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{s ? humanize(s) : "All orders"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {orders.isError ? (
            <div className="p-4">
              <ErrorState message="Could not load orders." onRetry={() => void orders.refetch()} />
            </div>
          ) : orders.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={status ? `No ${status} orders` : "No orders yet"}
              description={
                status
                  ? "Try another status filter."
                  : "When a customer checks out from your catalogue in WhatsApp, the order appears here."
              }
            />
          ) : (
            <div className={cn("transition-opacity", orders.isPlaceholderData && "opacity-60")}>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Customer</TH>
                    <TH>Items</TH>
                    <TH>Total</TH>
                    <TH>Placed</TH>
                    <TH>Status</TH>
                    <TH>
                      <span className="sr-only">Details</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((order, index) => {
                    const contact = relation<Contact>(order.contacts);
                    const items = order.items ?? [];
                    const units = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                    const animated = index < 20;
                    return (
                      <motion.tr
                        key={order.id}
                        initial={animated ? { opacity: 0, y: 6 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease, delay: animated ? index * 0.025 : 0 }}
                        onClick={() => openOrder(order)}
                        className="cursor-pointer transition-colors duration-150 hover:bg-brand-50/50"
                      >
                        <TD>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold text-brand-700">
                              {initials(contact?.name, "#")}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{contact?.name ?? "Unnamed"}</p>
                              {contact?.wa_id && (
                                <p className="font-mono text-xs text-muted-foreground">+{contact.wa_id}</p>
                              )}
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <p className="text-sm font-medium">
                            {units} {units === 1 ? "unit" : "units"}
                          </p>
                          <p className="max-w-[14rem] truncate font-mono text-xs text-muted-foreground">
                            {items.map((i) => i.retailerId).join(", ") || "—"}
                          </p>
                        </TD>
                        <TD className="whitespace-nowrap font-display font-bold">
                          {money(order.total, order.currency)}
                        </TD>
                        <TD className="whitespace-nowrap text-xs">
                          <p className="font-medium">{timeAgo(order.created_at)}</p>
                          <p className="text-muted-foreground">{formatDateTime(order.created_at)}</p>
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Badge tone={TONES[order.status] ?? "neutral"}>{humanize(order.status)}</Badge>
                            <Select
                              aria-label={`Change status for order from ${contact?.name ?? "customer"}`}
                              className="h-9 w-36 text-xs"
                              value={order.status}
                              disabled={updateStatus.isPending && updateStatus.variables?.id === order.id}
                              onChange={(e) => updateStatus.mutate({ id: order.id, next: e.target.value })}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {humanize(s)}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </TD>
                        <TD>
                          <button
                            type="button"
                            aria-label={`View order from ${contact?.name ?? "customer"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrder(order);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </TD>
                      </motion.tr>
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
            </div>
          )}
        </Card>
      </FadeIn>

      <Modal
        open={drawerOpen && Boolean(selected)}
        onClose={() => setDrawerOpen(false)}
        side="right"
        title="Order details"
        description={selected ? `#${selected.id.slice(0, 8).toUpperCase()} · ${formatDateTime(selected.created_at)}` : undefined}
        icon={<ShoppingBag size={18} />}
      >
        {selected && (
          <OrderDetail
            order={selected}
            updating={updateStatus.isPending}
            onStatus={(next) => updateStatus.mutate({ id: selected.id, next })}
          />
        )}
      </Modal>
    </>
  );
}

function OrderDetail({
  order,
  updating,
  onStatus,
}: {
  order: Order;
  updating: boolean;
  onStatus: (next: Status) => void;
}) {
  const contact = relation<Contact>(order.contacts);
  const items = order.items ?? [];
  const cancelled = order.status === "cancelled";
  const currentIndex = PIPELINE.findIndex((p) => p.status === order.status);
  const next = currentIndex >= 0 ? PIPELINE[currentIndex + 1] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50/60 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">
          {initials(contact?.name, "#")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{contact?.name ?? "Unnamed customer"}</p>
          {contact?.wa_id && <p className="font-mono text-xs text-muted-foreground">+{contact.wa_id}</p>}
        </div>
        <Badge tone={TONES[order.status] ?? "neutral"}>{humanize(order.status)}</Badge>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Progress</h3>
        {cancelled ? (
          <p className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
            <Ban size={16} />
            This order was cancelled.
          </p>
        ) : (
          <ol className="grid grid-cols-5 gap-1">
            {PIPELINE.map((step, i) => {
              const done = i <= currentIndex;
              const Icon = step.icon;
              return (
                <li key={step.status} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="relative flex w-full items-center justify-center">
                    {i > 0 && (
                      <span className="absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border">
                        <motion.span
                          className="block h-full bg-brand-gradient"
                          initial={{ width: 0 }}
                          animate={{ width: done ? "100%" : 0 }}
                          transition={{ duration: 0.45, ease, delay: i * 0.08 }}
                        />
                      </span>
                    )}
                    <motion.span
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.3, ease }}
                      className={cn(
                        "relative grid h-9 w-9 place-items-center rounded-full border-2 transition-colors",
                        done ? "border-transparent bg-brand-gradient text-white shadow-glow" : "border-border bg-white text-muted-foreground",
                      )}
                    >
                      <Icon size={15} />
                    </motion.span>
                  </div>
                  <span className={cn("text-[11px] font-semibold", done ? "text-foreground" : "text-muted-foreground")}>
                    {humanize(step.status)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {next && (
            <Button size="sm" loading={updating} onClick={() => onStatus(next.status)}>
              Mark as {next.status}
            </Button>
          )}
          {!cancelled && order.status !== "delivered" && (
            <Button size="sm" variant="outline" disabled={updating} onClick={() => onStatus("cancelled")}>
              Cancel order
            </Button>
          )}
          {cancelled && (
            <Button size="sm" variant="outline" loading={updating} onClick={() => onStatus("placed")}>
              Reopen as placed
            </Button>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Items ({items.length})
        </h3>
        <div className="overflow-hidden rounded-xl border">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No line items recorded.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold">{item.retailerId}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {money(item.unitPrice, order.currency)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{money(item.lineTotal, order.currency)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between bg-brand-50/50 px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-display text-lg font-bold text-primary">{money(order.total, order.currency)}</span>
          </div>
        </div>
      </section>

      {order.note && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <StickyNote size={13} />
            Customer note
          </h3>
          <p className="whitespace-pre-wrap rounded-xl border bg-white p-4 text-sm italic text-foreground/80">
            “{order.note}”
          </p>
        </section>
      )}
    </div>
  );
}
