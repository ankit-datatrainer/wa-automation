"use client";

import { Search, Send, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, SegmentedTabs } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignTable, useDebounced } from "../campaign-table";
import { CampaignFunnelChart } from "./campaign-funnel-chart";

type Filter = "all" | "completed" | "running" | "failed" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "running", label: "Running" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function CampaignHistoryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());

  return (
    <>
      <PageHeader
        title="Campaign History"
        description="Delivery results for every campaign you have run."
        actions={
          <Link href="/campaigns/new" className={buttonVariants()}>
            <Send size={16} />
            New campaign
          </Link>
        }
      />

      <div className="space-y-6">
        <FadeIn>
          <CampaignFunnelChart />
        </FadeIn>

        <CampaignTable
            status={filter === "all" ? undefined : filter}
            search={search}
            emptyTitle={filter === "all" ? "No campaign history yet" : "Nothing here yet"}
            emptyDescription={
              filter === "all"
                ? "Once you send a campaign, its delivery, read and failure counts appear here."
                : "Campaigns with this status will show up here."
            }
            toolbar={
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
                  <SegmentedTabs
                    tabs={FILTERS}
                    value={filter}
                    onChange={setFilter}
                    layoutId="history-filter"
                  />
                </div>
                <div className="relative w-full lg:max-w-xs">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search campaigns..."
                    aria-label="Search campaigns"
                    className="h-10 pl-10 pr-9"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            }
          />
      </div>
    </>
  );
}
