"use client";

import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { CampaignWizard } from "../campaign-wizard";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="New campaign"
        description="Pick a template, choose who receives it, and schedule the send."
        actions={
          <Link href="/campaigns/template-library" className={buttonVariants({ variant: "outline" })}>
            <LayoutTemplate size={16} />
            Template library
          </Link>
        }
      />
      <FadeIn>
        <CampaignWizard audienceType="broadcast" />
      </FadeIn>
    </>
  );
}
