"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ChatHistoryTable } from "./chat-history-table";

export default function ChatHistoryPage() {
  return (
    <>
      <PageHeader
        title="Chat History"
        description="Every conversation, with its status and 24-hour session window."
      />
      <ChatHistoryTable />
    </>
  );
}
