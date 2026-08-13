"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Eye, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  industry: string;
}

export default function ChatbotLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const library = useQuery({
    queryKey: ["chatbot-library"],
    queryFn: () => api.get<{ data: LibraryItem[]; total: number }>("/chatbots/library"),
  });

  const clone = useMutation({
    mutationFn: (id: string) =>
      api.post<{ chatbotId: string; flowId: string }>(`/chatbots/library/${id}/clone`),
    onSuccess: (result) => {
      toast.success("Template added to your chatbots");
      router.push(`/flows/${result.flowId}`);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not use this template",
      ),
    onSettled: () => setCloningId(null),
  });

  const items = (library.data?.data ?? []).filter((item) => {
    const needle = search.toLowerCase();
    return (
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.description.toLowerCase().includes(needle) ||
      item.industry.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <PageHeader
        actions={
          <Button variant="outline">
            <Eye size={16} />
            Watch Tutorial
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-4 rounded-xl border bg-card p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Bot size={28} />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chatbot Library</h1>
          <p className="text-sm text-muted-foreground">
            Discover prebuilt chatbot templates to accelerate your workflow.
          </p>
        </div>
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm">
          Template Available{" "}
          <span className="font-bold">{library.data?.total ?? 0}</span>
        </p>
        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search chatbots..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {library.isError ? (
        <ErrorState
          message="Could not load the chatbot library."
          onRetry={() => void library.refetch()}
        />
      ) : library.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bot}
            title="No templates match your search"
            description="Try a different keyword or industry."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between gap-6 p-6">
              <div className="space-y-3">
                <h2 className="text-xl font-bold leading-snug">{item.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>

              <Button
                className="w-full justify-between"
                loading={cloningId === item.id && clone.isPending}
                onClick={() => {
                  setCloningId(item.id);
                  clone.mutate(item.id);
                }}
              >
                Try this Template
                {cloningId !== item.id && <ArrowRight size={16} />}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
