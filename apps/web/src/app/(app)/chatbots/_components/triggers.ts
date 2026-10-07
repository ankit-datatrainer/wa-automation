import { Hash, Hand, MessagesSquare, Moon, type LucideIcon } from "lucide-react";
import type { ChatbotTrigger } from "@wa/types";

export const TRIGGERS: {
  value: ChatbotTrigger;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "keyword",
    label: "Keyword",
    description: "Runs when a message contains one of your keywords.",
    icon: Hash,
  },
  {
    value: "welcome",
    label: "Welcome",
    description: "Greets a contact on their very first message.",
    icon: Hand,
  },
  {
    value: "away",
    label: "Away",
    description: "Answers outside working hours (09:00–18:00).",
    icon: Moon,
  },
  {
    value: "catch_all",
    label: "Catch-all",
    description: "Replies when nothing else matched.",
    icon: MessagesSquare,
  },
];

export function triggerMeta(value: string) {
  return TRIGGERS.find((t) => t.value === value) ?? TRIGGERS[0]!;
}
