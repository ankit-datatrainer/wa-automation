"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CampaignWizard } from "../../campaign-wizard";

export default function SendToContactsPage() {
  return (
    <>
      <PageHeader
        title="Send to Contacts"
        description="Choose an audience and send an approved template to your contacts."
      />
      <CampaignWizard audienceType="broadcast" />
    </>
  );
}
