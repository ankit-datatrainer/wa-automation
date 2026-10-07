"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Link2, RefreshCw, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FadeIn, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { timeAgo } from "../chatbots/_components/data";

interface Catalog {
  id: string;
  meta_catalog_id: string;
  name: string;
  product_count: number;
  last_synced_at: string | null;
}

/** Links a Meta Commerce catalog and pushes local products up to it. */
export function CatalogLink({ productCount }: { productCount?: number }) {
  const queryClient = useQueryClient();
  const [catalogId, setCatalogId] = useState("");

  const catalog = useQuery({
    queryKey: ["commerce", "catalog"],
    queryFn: () => api.get<{ data: Catalog | null }>("/commerce/catalog"),
  });

  const link = useMutation({
    mutationFn: () => api.post("/commerce/catalog", { metaCatalogId: catalogId.trim() }),
    onSuccess: () => {
      toast.success("Catalog linked");
      setCatalogId("");
      void queryClient.invalidateQueries({ queryKey: ["commerce"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not link the catalog"),
  });

  const sync = useMutation({
    mutationFn: () =>
      api.post<{ synced: number; failed: number; errors: string[] }>("/commerce/catalog/sync"),
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(
          `Synced ${result.synced}, ${result.failed} failed${result.errors[0] ? `: ${result.errors[0]}` : ""}`,
        );
      } else {
        toast.success(`Synced ${result.synced} products to Meta`);
      }
      void queryClient.invalidateQueries({ queryKey: ["commerce"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Sync failed"),
  });

  if (catalog.isLoading) return <Skeleton className="mb-6 h-32" />;

  const linked = catalog.data?.data;
  const outOfSync =
    linked && productCount !== undefined && productCount !== linked.product_count;

  return (
    <FadeIn className="mb-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-soft sm:p-6">
        <div aria-hidden className="absolute inset-0 bg-aurora opacity-70" />
        <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-[0.12] blur-3xl" />

        {catalog.isError ? (
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Could not load your Meta catalog link.</p>
            <Button variant="outline" size="sm" onClick={() => void catalog.refetch()}>
              Try again
            </Button>
          </div>
        ) : linked ? (
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <motion.span
                initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
              >
                <CheckCircle2 size={22} />
              </motion.span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display text-base font-semibold">{linked.name}</p>
                  <Badge tone="success">Linked to Meta</Badge>
                  {outOfSync && <Badge tone="warning">Needs sync</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{linked.meta_catalog_id}</span> · {linked.product_count} products on
                  Meta · {linked.last_synced_at ? `synced ${timeAgo(linked.last_synced_at)}` : "never synced"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`https://business.facebook.com/commerce/catalogs/${encodeURIComponent(linked.meta_catalog_id)}/products`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-primary transition hover:bg-brand-50"
              >
                Commerce Manager
                <ExternalLink size={14} />
              </a>
              <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
                {!sync.isPending && <RefreshCw size={16} />}
                Sync products to Meta
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <Store size={22} />
              </span>
              <div>
                <p className="font-display text-base font-semibold">Connect your Meta catalog</p>
                <p className="text-sm text-muted-foreground">
                  Linking lets you send product and cart messages, and sync these products to Meta.
                </p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                link.mutate();
              }}
              className="flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <div className="flex-1 space-y-1.5">
                <label htmlFor="meta-catalog-id" className="text-sm font-semibold text-foreground/90">
                  Meta Commerce catalog ID
                </label>
                <Input
                  id="meta-catalog-id"
                  required
                  inputMode="numeric"
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                  placeholder="1234567890123456"
                />
                <p className="text-xs text-muted-foreground">Find it in Meta Commerce Manager → Catalog settings.</p>
              </div>
              <Button type="submit" className="sm:mt-[26px]" loading={link.isPending} disabled={!catalogId.trim()}>
                {!link.isPending && <Link2 size={16} />}
                Link catalog
              </Button>
            </form>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
