"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api-client";
import { isUuid } from "./ui";

/**
 * Opens (or reuses) the conversation with a contact and jumps to its
 * transcript in Chat History, where a reply can be sent.
 */
export function useStartConversation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!isUuid(contactId)) {
        throw new Error("Sample contacts can't start a conversation. Add a real contact first.");
      }
      return api.post<{ id: string }>("/conversations", { contactId });
    },
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chat-history?conversation=${encodeURIComponent(id)}`);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Could not open the conversation",
      ),
  });
}
