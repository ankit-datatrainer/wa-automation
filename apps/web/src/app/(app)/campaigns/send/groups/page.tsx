"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { CampaignWizard } from "../../campaign-wizard";

export default function SendByGroupsPage() {
  return (
    <>
      <PageHeader
        title="Send By Groups"
        description="Target the contact groups you have organised under Manage Groups."
        actions={
          <Link href="/manage/groups" className={buttonVariants({ variant: "outline" })}>
            <Users size={16} />
            Manage groups
          </Link>
        }
      />
      <FadeIn>
        <CampaignWizard audienceType="groups" lockAudience />
      </FadeIn>
    </>
  );
}
