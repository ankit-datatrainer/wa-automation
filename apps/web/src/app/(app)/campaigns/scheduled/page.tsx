"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignTable } from "../campaign-table";

export default function ScheduledCampaignsPage() {
  return (
    <>
      <PageHeader
        title="Scheduled Campaigns"
        description="Campaigns queued for a future date. Start one early or cancel it here."
      />
      <CampaignTable
        status="scheduled"
        emptyTitle="Nothing scheduled"
        emptyDescription="Campaigns you schedule for a future time will wait here until they run."
      />
    </>
  );
}
