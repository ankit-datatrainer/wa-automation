"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ChatHistoryTable } from "../../chat-history/chat-history-table";

export default function AnalyticsChatsPage() {
  return (
    <>
      <PageHeader
        title="Chat History"
        description="Conversation-level analytics across your whole account."
      />
      <ChatHistoryTable />
    </>
  );
}
