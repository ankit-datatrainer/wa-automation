"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid,
  List,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, FadeIn, motion, SegmentedTabs, Spotlight, ease } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { useDebounced } from "../chatbots/_components/data";
import { ConfirmDialog } from "../chatbots/_components/modal";
import { CatalogLink } from "./catalog-link";
import { type Product, ProductForm } from "./product-form";

type View = "grid" | "list";

function price(product: Product) {
  try {
    return formatCurrency(Number(product.price), product.currency);
  } catch {
    return `${product.currency} ${product.price}`;
  }
}

export default function CataloguePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const debouncedSearch = useDebounced(search.trim(), 300);

  const products = useQuery({
    queryKey: ["products", { page, search: debouncedSearch }],
    queryFn: () =>
      api.get<{ data: Product[]; page: number; totalPages: number; total: number }>(
        "/settings/products",
        { page, pageSize: 24, search: debouncedSearch || undefined },
      ),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/products/${id}`),
    onSuccess: () => {
      toast.success("Product removed");
      setDeleting(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const availability = useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) =>
      api.patch(`/settings/products/${id}`, { availability: inStock ? "in stock" : "out of stock" }),
    onMutate: ({ id }) => setTogglingId(id),
    onSuccess: (_, { inStock }) => {
      toast.success(inStock ? "Marked in stock" : "Marked out of stock");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update availability"),
    onSettled: () => setTogglingId(null),
  });

  const rows = products.data?.data ?? [];
  const total = products.data?.total ?? 0;
  const inStockOnPage = rows.filter((p) => p.availability === "in stock").length;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const actions = (product: Product) => (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        aria-label={`Edit ${product.name}`}
        onClick={() => openEdit(product)}
      >
        <Pencil size={15} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 text-destructive hover:bg-rose-50"
        aria-label={`Delete ${product.name}`}
        onClick={() => setDeleting(product)}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  );

  const stockSwitch = (product: Product) => (
    <Switch
      checked={product.availability === "in stock"}
      disabled={togglingId === product.id}
      onCheckedChange={(inStock) => availability.mutate({ id: product.id, inStock })}
      aria-label={`${product.name} in stock`}
    />
  );

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Products you can send to customers as product or cart messages on WhatsApp."
        actions={
          <>
            <Link href="/catalogue/orders" className={buttonVariants({ variant: "outline" })}>
              <ShoppingCart size={16} />
              Orders
            </Link>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add product
            </Button>
          </>
        }
      />

      <CatalogLink productCount={products.data ? total : undefined} />

      <FadeIn delay={0.1}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-semibold">Products</h2>
            {products.data && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge tone="brand">{total.toLocaleString()} total</Badge>
                {rows.length > 0 && (
                  <span className="hidden sm:inline">
                    {inStockOnPage} of {rows.length} on this page in stock
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-72 sm:flex-none">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search products"
                placeholder="Search products by name…"
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <SegmentedTabs<View>
              layoutId="catalogue-view"
              value={view}
              onChange={setView}
              tabs={[
                {
                  value: "grid",
                  label: (
                    <span className="inline-flex py-0.5">
                      <LayoutGrid size={16} aria-hidden />
                      <span className="sr-only">Grid view</span>
                    </span>
                  ),
                },
                {
                  value: "list",
                  label: (
                    <span className="inline-flex py-0.5">
                      <List size={16} aria-hidden />
                      <span className="sr-only">List view</span>
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>

        {products.isError ? (
          <ErrorState message="Could not load the catalogue." onRetry={() => void products.refetch()} />
        ) : products.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card>
            {debouncedSearch ? (
              <EmptyState
                icon={Search}
                title="No products match"
                description={`Nothing named like “${debouncedSearch}”.`}
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Package}
                title="Your catalogue is empty"
                description="Add products so you can send product messages and take orders in chat."
                action={
                  <Button onClick={openCreate}>
                    <Plus size={16} />
                    Add your first product
                  </Button>
                }
              />
            )}
          </Card>
        ) : (
          <div className={cn("transition-opacity", products.isPlaceholderData && "opacity-60")}>
            <AnimatePresence mode="wait" initial={false}>
              {view === "grid" ? (
                <motion.ul
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                >
                  {rows.map((product, index) => {
                    const inStock = product.availability === "in stock";
                    return (
                      <motion.li
                        key={product.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease, delay: Math.min(index, 15) * 0.035 }}
                        whileHover={{ y: -4 }}
                      >
                        <Spotlight className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-soft transition-shadow duration-300 hover:shadow-lift">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            aria-label={`Edit ${product.name}`}
                            className="relative block aspect-square w-full overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                          >
                            <ProductImage product={product} />
                            <span
                              className={cn(
                                "absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur",
                                inStock ? "bg-white/85 text-emerald-700" : "bg-rose-50/90 text-rose-700",
                              )}
                            >
                              {inStock ? "In stock" : "Sold out"}
                            </span>
                          </button>
                          <div className="relative flex flex-1 flex-col gap-1 p-3 sm:p-4">
                            <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">{product.retailer_id}</p>
                            <p className="mt-1 font-display text-base font-bold text-primary">{price(product)}</p>
                            <div aria-hidden className="flex-1" />
                            <div className="mt-2 flex items-center justify-between gap-1 border-t border-border/60 pt-2.5">
                              {stockSwitch(product)}
                              {actions(product)}
                            </div>
                          </div>
                        </Spotlight>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden">
                    <Table>
                      <THead>
                        <TR className="hover:bg-transparent">
                          <TH>Product</TH>
                          <TH>Retailer ID</TH>
                          <TH>Price</TH>
                          <TH>In stock</TH>
                          <TH className="text-right">Actions</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {rows.map((product) => (
                          <TR key={product.id}>
                            <TD>
                              <div className="flex items-center gap-3">
                                <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-brand-100">
                                  <ProductImage product={product} small />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{product.name}</p>
                                  {product.description && (
                                    <p className="max-w-sm truncate text-xs text-muted-foreground">
                                      {product.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TD>
                            <TD className="font-mono text-xs">{product.retailer_id}</TD>
                            <TD className="whitespace-nowrap font-semibold">{price(product)}</TD>
                            <TD>{stockSwitch(product)}</TD>
                            <TD>
                              <div className="flex justify-end">{actions(product)}</div>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {products.data && products.data.totalPages > 1 && (
              <Card className="mt-4 overflow-hidden">
                <Pagination
                  page={products.data.page}
                  totalPages={products.data.totalPages}
                  total={products.data.total}
                  onPageChange={setPage}
                />
              </Card>
            )}
          </div>
        )}
      </FadeIn>

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} product={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Remove this product?"
        icon={<PackageX size={18} />}
        description={
          <>
            <span className="font-semibold text-foreground">{deleting?.name}</span> will be removed from
            your catalogue. If it was synced to Meta, sync again to update the remote catalog.
          </>
        }
      />
    </>
  );
}

function ProductImage({ product, small }: { product: Product; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!product.image_url || failed) {
    return (
      <span className="grid h-full w-full place-items-center text-brand-400">
        {product.availability === "in stock" ? (
          <PackageCheck size={small ? 18 : 32} />
        ) : (
          <Package size={small ? 18 : 32} />
        )}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}
