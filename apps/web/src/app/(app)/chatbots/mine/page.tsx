"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ChatbotList } from "../chatbot-list";

export default function YourChatbotsPage() {
  return (
    <>
      <PageHeader
        title="Your Chatbots"
        description="The chatbots in this workspace. Activate one to start answering customers."
      />
      <ChatbotList />
    </>
  );
}
