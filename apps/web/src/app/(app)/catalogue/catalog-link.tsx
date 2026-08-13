"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface Catalog {
  id: string;
  meta_catalog_id: string;
  name: string;
  product_count: number;
  last_synced_at: string | null;
}

/** Links a Meta Commerce catalog and pushes local products up to it. */
export function CatalogLink() {
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

  if (catalog.isLoading) return <Skeleton className="mb-4 h-28" />;

  const linked = catalog.data?.data;

  return (
    <Card className="mb-4 p-5">
      {linked ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold">{linked.name}</p>
                <Badge tone="success">Linked</Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {linked.meta_catalog_id} · {linked.product_count} products
                {linked.last_synced_at &&
                  ` · synced ${new Date(linked.last_synced_at).toLocaleString()}`}
              </p>
            </div>
          </div>

          <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
            {!sync.isPending && <RefreshCw size={16} />}
            Sync products to Meta
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            link.mutate();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-64 flex-1 space-y-1.5">
            <label className="text-sm font-medium">Meta Commerce catalog ID</label>
            <Input
              required
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              placeholder="1234567890123456"
            />
            <p className="text-xs text-muted-foreground">
              Find this in Meta Commerce Manager. Linking lets you send product and cart messages.
            </p>
          </div>
          <Button type="submit" loading={link.isPending}>
            <Link2 size={16} />
            Link catalog
          </Button>
        </form>
      )}
    </Card>
  );
}
