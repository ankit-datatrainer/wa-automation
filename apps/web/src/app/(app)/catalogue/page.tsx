"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Pagination, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { CatalogLink } from "./catalog-link";

interface Product {
  id: string;
  retailer_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  availability: string;
}

const EMPTY = {
  retailerId: "",
  name: "",
  price: "",
  currency: "INR",
  imageUrl: "",
  availability: "in stock",
};

export default function CataloguePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const products = useQuery({
    queryKey: ["products", { page }],
    queryFn: () =>
      api.get<{ data: Product[]; page: number; totalPages: number; total: number }>(
        "/settings/products",
        { page, pageSize: 25 },
      ),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const create = useMutation({
    mutationFn: () =>
      api.post("/settings/products", {
        retailerId: form.retailerId.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        currency: form.currency,
        ...(form.imageUrl.trim() && { imageUrl: form.imageUrl.trim() }),
        availability: form.availability,
      }),
    onSuccess: () => {
      toast.success("Product added");
      setForm(EMPTY);
      setFormOpen(false);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not add the product"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/products/${id}`),
    onSuccess: () => {
      toast.success("Product removed");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const rows = products.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Products you can send to customers as product or cart messages on WhatsApp."
        actions={
          <Button onClick={() => setFormOpen((open) => !open)}>
            <Plus size={16} />
            Add product
          </Button>
        }
      />

      <CatalogLink />

      {formOpen && (
        <Card className="mb-4 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Retailer ID" required hint="Your own SKU. Must be unique.">
                {({ id }) => (
                  <Input id={id} required value={form.retailerId} onChange={set("retailerId")} placeholder="SKU-1001" />
                )}
              </Field>
              <Field label="Name" required>
                {({ id }) => <Input id={id} required value={form.name} onChange={set("name")} />}
              </Field>
              <Field label="Price" required>
                {({ id }) => (
                  <Input id={id} required type="number" min={0} step="0.01" value={form.price} onChange={set("price")} />
                )}
              </Field>
              <Field label="Currency">
                {({ id }) => (
                  <Select id={id} value={form.currency} onChange={set("currency")}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                )}
              </Field>
              <Field label="Image URL">
                {({ id }) => (
                  <Input id={id} type="url" value={form.imageUrl} onChange={set("imageUrl")} />
                )}
              </Field>
              <Field label="Availability">
                {({ id }) => (
                  <Select id={id} value={form.availability} onChange={set("availability")}>
                    <option value="in stock">In stock</option>
                    <option value="out of stock">Out of stock</option>
                  </Select>
                )}
              </Field>
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={create.isPending}>
                Add product
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {products.isError ? (
          <ErrorState message="Could not load the catalogue." onRetry={() => void products.refetch()} />
        ) : products.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Your catalogue is empty"
            description="Add products so you can send product messages and take orders in chat."
            action={
              <Button onClick={() => setFormOpen(true)}>
                <Plus size={16} />
                Add your first product
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH>Retailer ID</TH>
                  <TH>Price</TH>
                  <TH>Availability</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((product) => (
                  <TR key={product.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Package size={16} />
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="max-w-sm truncate text-xs text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs">{product.retailer_id}</TD>
                    <TD className="font-medium">
                      {formatCurrency(Number(product.price), product.currency)}
                    </TD>
                    <TD>
                      <Badge
                        tone={statusTone(product.availability === "in stock" ? "approved" : "failed")}
                      >
                        {product.availability}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => remove.mutate(product.id)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={products.data!.page}
              totalPages={products.data!.totalPages}
              total={products.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  );
}
