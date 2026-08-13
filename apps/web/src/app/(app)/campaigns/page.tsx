"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CampaignTable } from "./campaign-table";

export default function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Send approved templates to segments of your contacts and track delivery."
        actions={
          <Link href="/campaigns/new">
            <Button>
              <Plus size={16} />
              New campaign
            </Button>
          </Link>
        }
      />
      <CampaignTable
        emptyTitle="No campaigns yet"
        emptyDescription="Create your first campaign to reach your contacts on WhatsApp."
      />
    </>
  );
}
