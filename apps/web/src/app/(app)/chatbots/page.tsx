"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ChatbotList } from "./chatbot-list";

export default function ChatbotsPage() {
  return (
    <>
      <PageHeader
        title="Chatbots"
        description="Automated replies triggered by keywords, first contact, or outside working hours."
        actions={
          <Link href="/chatbots/library">
            <Button>
              <BookOpen size={16} />
              Browse library
            </Button>
          </Link>
        }
      />
      <ChatbotList />
    </>
  );
}
