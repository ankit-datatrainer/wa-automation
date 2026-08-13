"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";

interface Stats {
  totalTemplates: number;
}

interface WabaResponse {
  data: { status: string } | null;
}

/** Onboarding checklist, driven by what the account has actually configured. */
export default function SetupSupportPage() {
  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () => api.get<WabaResponse>("/waba"),
  });

  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<Stats>("/dashboard/stats"),
  });

  const contacts = useQuery({
    queryKey: ["contacts", "count"],
    queryFn: () => api.get<{ total: number }>("/contacts", { page: 1, pageSize: 1 }),
  });

  const loading = waba.isLoading || stats.isLoading || contacts.isLoading;

  const steps = [
    {
      title: "Connect your WhatsApp number",
      description: "Add your WABA ID, phone number ID and permanent token.",
      href: "/manage/credentials",
      done: waba.data?.data?.status === "connected",
    },
    {
      title: "Set your business profile",
      description: "Your about text, address and website, as customers see them.",
      href: "/manage/business-profile",
      done: waba.data?.data?.status === "connected",
    },
    {
      title: "Import your contacts",
      description: "Upload a CSV or add contacts manually.",
      href: "/contacts",
      done: (contacts.data?.total ?? 0) > 0,
    },
    {
      title: "Create a message template",
      description: "Templates are needed to start conversations outside the 24-hour window.",
      href: "/campaigns/templates",
      done: (stats.data?.totalTemplates ?? 0) > 0,
    },
    {
      title: "Set up a chatbot",
      description: "Answer common questions automatically, day and night.",
      href: "/chatbots/library",
      done: false,
    },
  ];

  const completed = steps.filter((step) => step.done).length;

  return (
    <>
      <PageHeader
        title="Setup Support"
        description="Everything you need in place before your first campaign goes out."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>
            Getting started — {completed} of {steps.length} complete
          </CardTitle>
          <CardDescription>
            Work through these in order. Each one links straight to where it&apos;s done.
          </CardDescription>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <ol className="divide-y">
              {steps.map((step) => (
                <li key={step.href} className="flex items-center gap-4 py-4">
                  {step.done ? (
                    <CheckCircle2 size={22} className="shrink-0 text-primary" />
                  ) : (
                    <Circle size={22} className="shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className={step.done ? "font-medium text-muted-foreground line-through" : "font-medium"}>
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <Link href={step.href}>
                    <Button variant={step.done ? "ghost" : "outline"} size="sm">
                      {step.done ? "Review" : "Set up"}
                    </Button>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
