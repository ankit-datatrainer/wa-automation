"use client";

import { Megaphone, MousePointerClick, Radio, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

/**
 * Click-to-WhatsApp ads run through the Meta Ads API, which requires its own
 * OAuth grant separate from the WABA token. This page collects the ad account
 * and explains the attribution model.
 */
export default function AdsSetupPage() {
  return (
    <>
      <PageHeader
        title="Ads Manager Setup"
        description="Connect Meta Ads to run Click-to-WhatsApp campaigns and attribute the chats they generate."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connect your ad account</CardTitle>
            <CardDescription>
              Find the account ID in Meta Ads Manager under Account Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="space-y-4"
            >
              <Field label="Meta Ad Account ID" required hint="Format: act_1234567890">
                {({ id }) => <Input id={id} required placeholder="act_1234567890" />}
              </Field>

              <Button type="submit">Connect with Meta</Button>

              <p className="text-xs text-muted-foreground">
                You&apos;ll be redirected to Meta to grant the <code>ads_management</code> and{" "}
                <code>ads_read</code> permissions.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How attribution works</CardTitle>
            <CardDescription>
              What happens once a customer taps your ad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <Step
                icon={Megaphone}
                title="You run a Click-to-WhatsApp ad"
                description="The ad's destination is your connected WhatsApp number."
              />
              <Step
                icon={MousePointerClick}
                title="A customer taps the ad"
                description="WhatsApp opens with a prefilled message and an ad referral payload."
              />
              <Step
                icon={Radio}
                title="The chat lands in your Inbox"
                description="The referral is stored on the conversation, so you know which ad brought them."
              />
              <Step
                icon={TrendingUp}
                title="Results roll up into Analytics"
                description="Cost per conversation and per lead, by campaign."
              />
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Step({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Megaphone;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon size={17} />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}
