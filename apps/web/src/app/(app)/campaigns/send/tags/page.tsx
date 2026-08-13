"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignWizard } from "../../campaign-wizard";

export default function SendByTagsPage() {
  return (
    <>
      <PageHeader
        title="Send By Tags"
        description="Target everyone carrying one or more of the tags you select."
      />
      <CampaignWizard audienceType="tags" lockAudience />
    </>
  );
}
