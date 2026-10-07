"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ImageOff, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "../chatbots/_components/modal";

export interface Product {
  id: string;
  retailer_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  availability: string;
}

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;

// Mirrors productSchema in apps/api/src/routes/settings.ts.
const formSchema = z.object({
  retailerId: z.string().trim().min(1, "Retailer ID is required").max(100),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().max(2000, "Keep it under 2000 characters"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "Enter a valid price"),
  currency: z.string().length(3),
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a full URL starting with https://"),
  availability: z.enum(["in stock", "out of stock"]),
});

type FormValues = z.infer<typeof formSchema>;

function defaultsFor(product: Product | null | undefined): FormValues {
  return {
    retailerId: product?.retailer_id ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    currency: product?.currency?.trim() || "INR",
    imageUrl: product?.image_url ?? "",
    availability: product?.availability === "out of stock" ? "out of stock" : "in stock",
  };
}

/** Add / edit product dialog with a live card preview. */
export function ProductForm({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}) {
  const queryClient = useQueryClient();
  const editing = Boolean(product);
  const [imageFailed, setImageFailed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaultsFor(product) });

  useEffect(() => {
    if (open) reset(defaultsFor(product));
  }, [open, product, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        retailerId: values.retailerId.trim(),
        name: values.name.trim(),
        price: Number(values.price),
        currency: values.currency,
        availability: values.availability,
      };
      if (product) {
        // PATCH: send explicit values so clearing a field actually clears it.
        return api.patch(`/settings/products/${product.id}`, {
          ...payload,
          description: values.description.trim(),
          imageUrl: values.imageUrl.trim(),
        });
      }
      return api.post("/settings/products", {
        ...payload,
        ...(values.description.trim() && { description: values.description.trim() }),
        ...(values.imageUrl.trim() && { imageUrl: values.imageUrl.trim() }),
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the product"),
  });

  const values = watch();
  useEffect(() => setImageFailed(false), [values.imageUrl]);
  const previewPrice = Number(values.price);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit product" : "Add product"}
      description="Products can be sent as product and cart messages on WhatsApp."
      icon={<Package size={20} />}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={save.isPending}>
            {!save.isPending && <Check size={16} />}
            {editing ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <form
          id="product-form"
          noValidate
          onSubmit={handleSubmit((v) => save.mutate(v))}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Name" required error={errors.name?.message}>
            {({ id }) => (
              <Input id={id} placeholder="Classic cotton tee" aria-invalid={Boolean(errors.name)} {...register("name")} />
            )}
          </Field>
          <Field
            label="Retailer ID"
            required
            hint="Your own SKU. Must be unique."
            error={errors.retailerId?.message}
          >
            {({ id }) => (
              <Input
                id={id}
                placeholder="SKU-1001"
                className="font-mono"
                aria-invalid={Boolean(errors.retailerId)}
                {...register("retailerId")}
              />
            )}
          </Field>
          <Field label="Price" required error={errors.price?.message}>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="499"
                aria-invalid={Boolean(errors.price)}
                {...register("price")}
              />
            )}
          </Field>
          <Field label="Currency">
            {({ id }) => (
              <Select id={id} {...register("currency")}>
                {/* Keep a product's existing currency selectable so editing never silently changes it. */}
                {(product?.currency && !(CURRENCIES as readonly string[]).includes(product.currency.trim())
                  ? [product.currency.trim(), ...CURRENCIES]
                  : CURRENCIES
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Image URL" error={errors.imageUrl?.message} hint="A public https:// link to a square image works best.">
              {({ id }) => (
                <Input
                  id={id}
                  type="url"
                  placeholder="https://cdn.example.com/tee.jpg"
                  aria-invalid={Boolean(errors.imageUrl)}
                  {...register("imageUrl")}
                />
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" error={errors.description?.message}>
              {({ id }) => (
                <Textarea id={id} rows={3} placeholder="Soft, breathable, everyday fit." {...register("description")} />
              )}
            </Field>
          </div>
          <Field label="Availability">
            {({ id }) => (
              <Select id={id} {...register("availability")}>
                <option value="in stock">In stock</option>
                <option value="out of stock">Out of stock</option>
              </Select>
            )}
          </Field>
        </form>

        <div className="hidden md:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Preview</p>
          <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
            <div className="grid aspect-square place-items-center bg-gradient-to-br from-brand-50 to-brand-100">
              {values.imageUrl && !imageFailed && /^https?:\/\//i.test(values.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.imageUrl}
                  alt=""
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid place-items-center gap-1 text-brand-400">
                  {imageFailed ? <ImageOff size={28} /> : <Package size={28} />}
                </span>
              )}
            </div>
            <div className="space-y-1 p-3">
              <p className="truncate text-sm font-semibold">{values.name || "Product name"}</p>
              <p className="text-sm font-bold text-primary">
                {Number.isFinite(previewPrice) && values.price !== ""
                  ? formatCurrency(previewPrice, values.currency || "INR")
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {values.availability === "in stock" ? "In stock" : "Out of stock"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
