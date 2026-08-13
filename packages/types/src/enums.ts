/** Roles, ordered most- to least-privileged. */
export const ROLES = ["owner", "admin", "manager", "agent"] as const;
export type Role = (typeof ROLES)[number];

/** WhatsApp conversation pricing categories. Drives the wallet ledger. */
export const MESSAGE_CATEGORIES = [
  "marketing",
  "utility",
  "authentication",
  "service",
] as const;
export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];

export const MESSAGE_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "document",
  "sticker",
  "location",
  "contacts",
  "template",
  "interactive",
  "reaction",
  "order",
  "system",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const CONVERSATION_STATUSES = ["open", "pending", "closed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const TEMPLATE_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "paused",
  "disabled",
] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Mirrors the Campaigns section: Send to Contacts / By Tags / By Groups / CSV / Broadcast. */
export const AUDIENCE_TYPES = [
  "contacts",
  "tags",
  "groups",
  "csv",
  "broadcast",
] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];

export const OPT_IN_STATUSES = ["opted_in", "opted_out", "unknown"] as const;
export type OptInStatus = (typeof OPT_IN_STATUSES)[number];

export const QUALITY_RATINGS = ["high", "medium", "low", "unknown"] as const;
export type QualityRating = (typeof QUALITY_RATINGS)[number];

export const CHATBOT_TRIGGERS = [
  "keyword",
  "welcome",
  "away",
  "catch_all",
] as const;
export type ChatbotTrigger = (typeof CHATBOT_TRIGGERS)[number];

export const FLOW_NODE_TYPES = [
  "send_message",
  "ask_question",
  "condition",
  "api_request",
  "delay",
  "add_tag",
  "assign_agent",
  "end",
] as const;
export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Meta messaging tiers: max unique business-initiated conversations per 24h. */
export const MESSAGING_TIERS = {
  TIER_250: 250,
  TIER_1K: 1_000,
  TIER_10K: 10_000,
  TIER_100K: 100_000,
  TIER_UNLIMITED: Number.POSITIVE_INFINITY,
} as const;
export type MessagingTier = keyof typeof MESSAGING_TIERS;

/** Free-form replies are only allowed within 24h of the contact's last message. */
export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
