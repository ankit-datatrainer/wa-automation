"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignWizard } from "../../campaign-wizard";

export default function SendByGroupsPage() {
  return (
    <>
      <PageHeader
        title="Send By Groups"
        description="Target the contact groups you have organised under Manage Groups."
      />
      <CampaignWizard audienceType="groups" lockAudience />
    </>
  );
}
