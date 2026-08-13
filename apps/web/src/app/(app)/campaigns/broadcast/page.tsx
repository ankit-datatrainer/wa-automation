"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignWizard } from "../campaign-wizard";

export default function BroadcastPage() {
  return (
    <>
      <PageHeader
        title="Broadcast"
        description="Send one template to every contact who has not opted out."
      />
      <CampaignWizard audienceType="broadcast" lockAudience />
    </>
  );
}
