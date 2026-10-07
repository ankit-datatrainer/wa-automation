/** Response shapes for the endpoints the dashboard reads (see apps/api/src/routes). */

/** GET /api/me */
export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    country: string | null;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    walletBalance: number;
    currency: string;
    trialEndsAt: string | null;
    isDemo: boolean;
  };
  membership: { role: string; permissions: string[] };
  isSuperAdmin?: boolean;
  waba: {
    id: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhone: string | null;
    verifiedName: string | null;
    qualityRating: string | null;
    messagingTier: string | null;
    status: string;
    lastSyncedAt: string | null;
  } | null;
}

/** GET /api/dashboard/stats */
export interface StatsData {
  accountDaysLeft: number;
  accountStatus: "active" | "expired";
  totalTemplates: number;
  totalReports: number;
  balance: number;
  currency: string;
  qualityRating: string;
  /** `null` when the tier is unlimited (Infinity serialises to null). */
  perDayMessageLimit: number | null;
  messagesUsedToday: number;
  isDemo: boolean;
  plan?: string;
}

/** GET /api/dashboard/account */
export interface AccountData {
  email: string | null;
  mobile: string | null;
  country: string | null;
  name: string | null;
  organizationName: string | null;
  isDemo: boolean;
  plan: string;
  demoExpires: string | null;
  memberSince: string | null;
  daysRemaining: number | null;
}

/** GET /api/dashboard/message-charges */
export interface ChargesData {
  country: string;
  charges: {
    category: string;
    price: number | string;
    currency: string;
    description?: string;
  }[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Row of GET /api/campaigns */
export interface CampaignRow {
  id: string;
  name: string;
  audience_type: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  stats: Partial<Record<"total" | "sent" | "delivered" | "read" | "replied" | "failed", number>> | null;
  templates: { name: string; category: string } | { name: string; category: string }[] | null;
}

/** Row of GET /api/analytics/chats */
export interface ChatRow {
  id: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  session_expires_at: string | null;
  contacts: { wa_id: string; name: string | null } | { wa_id: string; name: string | null }[] | null;
}

/** Supabase returns to-one joins as an object, but the generated types allow arrays. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const TIER_LABELS: Record<string, string> = {
  TIER_250: "250",
  TIER_1K: "1K",
  TIER_10K: "10K",
  TIER_100K: "100K",
  TIER_UNLIMITED: "Unlimited",
};
