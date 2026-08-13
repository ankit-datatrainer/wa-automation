"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignWizard } from "../campaign-wizard";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="New campaign"
        description="Pick a template, choose who receives it, and schedule the send."
      />
      <CampaignWizard audienceType="broadcast" />
    </>
  );
}
