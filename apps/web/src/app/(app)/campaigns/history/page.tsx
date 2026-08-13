"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignTable } from "../campaign-table";
import { CampaignFunnelChart } from "./campaign-funnel-chart";

export default function CampaignHistoryPage() {
  return (
    <>
      <PageHeader
        title="Campaign History"
        description="Delivery results for every campaign you have run."
      />
      <CampaignFunnelChart />
      <div className="mt-4">
        <CampaignTable
          emptyTitle="No campaign history yet"
          emptyDescription="Once you send a campaign, its delivery, read and failure counts appear here."
        />
      </div>
    </>
  );
}
