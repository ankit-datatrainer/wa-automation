"use client";

import { Tags } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { CampaignWizard } from "../campaign-wizard";

export default function BroadcastPage() {
  return (
    <>
      <PageHeader
        title="Broadcast"
        description="Send one template to every contact who has not opted out."
        actions={
          <Link href="/campaigns/send/tags" className={buttonVariants({ variant: "outline" })}>
            <Tags size={16} />
            Target by tags instead
          </Link>
        }
      />
      <FadeIn>
        <CampaignWizard audienceType="broadcast" lockAudience />
      </FadeIn>
    </>
  );
}
