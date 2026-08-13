"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { TemplatePreview } from "../templates/template-preview";

interface LibraryTemplate {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  language: string;
  category: string;
  components: {
    header?: { format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"; text?: string };
    body: { text: string };
    footer?: { text: string };
    buttons?: { type: string; text: string }[];
  };
}

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const library = useQuery({
    queryKey: ["template-library"],
    queryFn: () => api.get<{ data: LibraryTemplate[] }>("/templates/library"),
  });

  const clone = useMutation({
    mutationFn: (item: LibraryTemplate) =>
      api.post("/templates", {
        // Library titles are prose; template names must be snake_case.
        name: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
        language: item.language,
        category: item.category,
        components: item.components,
      }),
    onSuccess: () => {
      toast.success("Added to Your Templates as a draft");
      router.push("/campaigns/templates");
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not copy the template"),
    onSettled: () => setCloningId(null),
  });

  const items = (library.data?.data ?? []).filter((item) => {
    const needle = search.toLowerCase();
    return (
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.description?.toLowerCase().includes(needle) ||
      item.industry?.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <PageHeader
        title="Template Library"
        description="Prebuilt message templates you can copy and submit to Meta."
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm">
          Templates available <span className="font-bold">{library.data?.data.length ?? 0}</span>
        </p>
        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search templates..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {library.isError ? (
        <ErrorState
          message="Could not load the template library."
          onRetry={() => void library.refetch()}
        />
      ) : library.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No library templates yet"
            description="Starter templates seeded into your database will appear here."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-4 p-5">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold leading-snug">{item.title}</h2>
                  <Badge tone="info" className="capitalize">
                    {item.category}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>

              <TemplatePreview
                draft={{
                  header: item.components.header,
                  body: item.components.body.text,
                  footer: item.components.footer?.text,
                  buttons: item.components.buttons ?? [],
                }}
              />

              <Button
                className="w-full justify-between"
                loading={cloningId === item.id && clone.isPending}
                onClick={() => {
                  setCloningId(item.id);
                  clone.mutate(item);
                }}
              >
                Use this template
                {cloningId !== item.id && <ArrowRight size={16} />}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
