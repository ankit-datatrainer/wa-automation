"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ChatbotList } from "../chatbot-list";

export default function YourChatbotsPage() {
  return (
    <>
      <PageHeader
        title="Your Chatbots"
        description="The chatbots in this workspace. Activate one to start answering customers."
        actions={
          <Link href="/chatbots/library" className={buttonVariants({ variant: "outline" })}>
            <BookOpen size={16} />
            Templates
          </Link>
        }
      />
      <FadeIn>
        <ChatbotList />
      </FadeIn>
    </>
  );
}
