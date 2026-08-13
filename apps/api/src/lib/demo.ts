import { env } from "../config/env.js";

/** True when no real Supabase project is configured — lets the app be clicked through with fake data. */
export const isDemoMode = env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

export const DEMO_USER_ID = "00000000-0000-0000-0000-0000000000d1";
export const DEMO_ORG_ID = "00000000-0000-0000-0000-0000000000d0";

export const demoAuth = {
  userId: DEMO_USER_ID,
  email: "demo@waautomations.com",
  organizationId: DEMO_ORG_ID,
  role: "owner" as const,
  permissions: [] as string[],
  accessToken: "demo",
};

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const demoData = {
  me: {
    user: { id: DEMO_USER_ID, email: demoAuth.email, name: "Demo User", phone: "919266806659", country: "IN" },
    organization: {
      id: DEMO_ORG_ID,
      name: "WA Automations Demo",
      slug: "wa-automations-demo",
      plan: "trial",
      walletBalance: 1003.89,
      currency: "INR",
      trialEndsAt: daysAgo(-27),
      isDemo: true,
    },
    membership: { role: "owner", permissions: [] as string[] },
    waba: {
      id: "demo-waba",
      wabaId: "102290129340398",
      phoneNumberId: "106540352242922",
      displayPhone: "+91 92668 06659",
      verifiedName: "WA Automations Demo",
      qualityRating: "high",
      messagingTier: "TIER_1K",
      status: "connected",
      lastSyncedAt: now(),
    },
  },

  dashboardStats: {
    accountDaysLeft: 27,
    accountStatus: "active",
    totalTemplates: 5,
    totalReports: 13,
    balance: 1003.89,
    currency: "INR",
    qualityRating: "high",
    perDayMessageLimit: 2000,
    messagesUsedToday: 340,
    isDemo: true,
    plan: "trial",
  },

  dashboardAccount: {
    email: "demo@waautomations.com",
    mobile: "+919266806659",
    country: "IN",
    name: "Demo User",
    organizationName: "WA Automations Demo",
    isDemo: true,
    plan: "trial",
  },

  messageCharges: {
    country: "IN",
    charges: [
      { category: "marketing", price: 0.7846, currency: "INR" },
      { category: "utility", price: 0.115, currency: "INR" },
      { category: "authentication", price: 0.125, currency: "INR" },
      { category: "service", price: 0, currency: "INR" },
    ],
  },

  waba: {
    id: "demo-waba",
    waba_id: "102290129340398",
    phone_number_id: "106540352242922",
    display_phone: "+91 92668 06659",
    verified_name: "WA Automations Demo",
    quality_rating: "high",
    messaging_tier: "TIER_1K",
    status: "connected",
    verify_token: "demo-verify-token",
    last_synced_at: now(),
  },

  contacts: paginated([
    { id: "c1", wa_id: "919266806659", name: "Ankit Kumar", email: "ankit@example.com", opt_in_status: "opted_in", source: "manual", created_at: daysAgo(3), contact_tags: [{ tags: { id: "t1", name: "VIP", color: "#16A34A" } }] },
    { id: "c2", wa_id: "919812345678", name: "Priya Sharma", email: null, opt_in_status: "opted_in", source: "csv_import", created_at: daysAgo(5), contact_tags: [] },
    { id: "c3", wa_id: "918899001122", name: "Rahul Verma", email: null, opt_in_status: "unknown", source: "whatsapp", created_at: daysAgo(1), contact_tags: [] },
    { id: "c4", wa_id: "917766554433", name: null, email: null, opt_in_status: "opted_out", source: "whatsapp", created_at: daysAgo(10), contact_tags: [] },
  ]),

  tags: {
    data: [
      { id: "t1", name: "VIP", color: "#16A34A", createdAt: now(), contactCount: 1 },
      { id: "t2", name: "New Lead", color: "#2563EB", createdAt: now(), contactCount: 0 },
    ],
  },

  groups: {
    data: [
      { id: "g1", name: "Delhi Customers", description: "Contacts based in Delhi NCR", createdAt: now(), contactCount: 2 },
      { id: "g2", name: "Newsletter", description: null, createdAt: now(), contactCount: 4 },
    ],
  },

  conversations: {
    data: [
      { id: "conv1", status: "open", assigned_to: null, unread_count: 1, last_message_at: daysAgo(0), last_message_preview: "Hii", session_expires_at: new Date(Date.now() + 3_600_000).toISOString(), contacts: { id: "c1", wa_id: "919266806659", name: "Ankit Kumar" } },
      { id: "conv2", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(1), last_message_preview: "Msme", session_expires_at: null, contacts: { id: "c2", wa_id: "919812345678", name: "Priya Sharma" } },
      { id: "conv3", status: "pending", assigned_to: null, unread_count: 1, last_message_at: daysAgo(2), last_message_preview: "No messages yet", session_expires_at: null, contacts: { id: "c3", wa_id: "918899001122", name: "Rahul Verma" } },
    ],
  },

  messages: (conversationId: string) => ({
    data: [
      { id: "m1", direction: "inbound", type: "text", content: { text: "Hi, I'd like to know more about your pricing." }, wamid: "wamid.demo1", status: "read", error: null, sent_by: null, sent_at: daysAgo(0), template_id: null },
      { id: "m2", direction: "outbound", type: "text", content: { text: "Hello! Sure, let me share our plans with you." }, wamid: "wamid.demo2", status: "read", error: null, sent_by: DEMO_USER_ID, sent_at: daysAgo(0), template_id: null },
    ],
    sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    canSendFreeform: true,
    _conversationId: conversationId,
  }),

  templates: paginated([
    { id: "tpl1", name: "order_confirmation", language: "en", category: "utility", components: { body: { text: "Hi {{1}}, your order {{2}} has been confirmed." } }, status: "approved", rejection_reason: null, meta_template_id: "meta-1", created_at: daysAgo(6) },
    { id: "tpl2", name: "diwali_offer", language: "en", category: "marketing", components: { body: { text: "🎉 Diwali special! Get 20% off with code DIWALI20." } }, status: "pending", rejection_reason: null, meta_template_id: null, created_at: daysAgo(2) },
    { id: "tpl3", name: "otp_login", language: "en", category: "authentication", components: { body: { text: "Your OTP is {{1}}. Valid for 5 minutes." } }, status: "approved", rejection_reason: null, meta_template_id: "meta-3", created_at: daysAgo(8) },
  ]),

  templateLibrary: {
    data: [
      { id: "lib1", title: "Order Confirmation", description: "Confirms an order with tracking details.", industry: "Ecommerce", language: "en", category: "utility", components: { body: { text: "Hi {{1}}, your order {{2}} is confirmed and will ship soon." } } },
      { id: "lib2", title: "Appointment Reminder", description: "Reminds a customer of an upcoming appointment.", industry: "Healthcare", language: "en", category: "utility", components: { body: { text: "Reminder: your appointment is on {{1}} at {{2}}." } } },
      { id: "lib3", title: "Festive Offer", description: "A festive-season marketing promo.", industry: "Retail", language: "en", category: "marketing", components: { body: { text: "🎉 Special festive offer just for you, {{1}}! Use code {{2}}." } } },
    ],
  },

  campaigns: paginated([
    { id: "camp1", name: "Diwali offer — October", audience_type: "broadcast", status: "completed", scheduled_at: null, started_at: daysAgo(4), completed_at: daysAgo(4), created_at: daysAgo(4), stats: { total: 120, sent: 120, delivered: 115, read: 90, replied: 12, failed: 5 }, templates: { name: "diwali_offer", category: "marketing" } },
    { id: "camp2", name: "Order confirmations", audience_type: "tags", status: "running", scheduled_at: null, started_at: daysAgo(0), completed_at: null, created_at: daysAgo(0), stats: { total: 40, sent: 22, delivered: 20, read: 15, replied: 2, failed: 0 }, templates: { name: "order_confirmation", category: "utility" } },
  ]),

  chatbots: {
    data: [
      { id: "bot1", name: "Ecommerce Support", description: "Handles order tracking and returns.", trigger_type: "keyword", trigger_config: { keywords: ["order", "track"] }, flow_id: "flow1", is_active: true, created_at: daysAgo(5) },
      { id: "bot2", name: "Welcome Bot", description: "Greets first-time contacts.", trigger_type: "welcome", trigger_config: { keywords: [] }, flow_id: "flow2", is_active: false, created_at: daysAgo(9) },
    ],
  },

  chatbotLibrary: {
    data: [
      { id: "cl1", title: "Banking & Finance Support", description: "High-priority banking chatbot helper for card blocking, fraud reporting, transaction issues, and accounts FAQ.", industry: "Banking", sort_order: 1 },
      { id: "cl2", title: "Delivery & Logistics Tracking", description: "Logistics tracking chatbot for checking package status via Tracking ID, reporting delivery issues, or agent handoff.", industry: "Logistics", sort_order: 2 },
      { id: "cl3", title: "Restaurant Support & Feedback", description: "Restaurant customer service chatbot for missing items reporting, FAQ searches, and feedback collection.", industry: "Restaurant", sort_order: 3 },
      { id: "cl4", title: "Ecommerce Support Flow", description: "Complete ecommerce support flow handling order tracking with Order ID verification, returns/refunds processing, and product FAQs.", industry: "Ecommerce", sort_order: 4 },
      { id: "cl5", title: "Customer Support Chatbot", description: "Complete customer support flow with ticket creation, FAQ search, and agent assignment.", industry: "General", sort_order: 5 },
      { id: "cl6", title: "SaaS Product Demo Booking", description: "Software demo booking flow with product interest qualification and calendar scheduling.", industry: "SaaS", sort_order: 6 },
    ],
    total: 21,
  },

  flows: { data: [{ id: "flow1", name: "Ecommerce Support Flow", status: "published", meta_flow_id: null, updated_at: daysAgo(1) }] },

  supportTickets: paginated([
    { id: "tk1", subject: "Templates stuck in pending review", status: "open", priority: "medium", created_at: daysAgo(1), resolved_at: null, users: { name: "Demo User", email: "demo@waautomations.com" } },
  ]),

  products: paginated([
    { id: "p1", retailer_id: "SKU-1001", name: "Classic T-Shirt", description: "100% cotton, available in 4 colors.", price: 599, currency: "INR", image_url: null, availability: "in stock" },
  ]),

  walletHistory: paginated([
    { id: "w1", type: "credit", amount: 2000, balance_after: 2000, description: "Wallet top-up", reference: null, created_at: daysAgo(15) },
    { id: "w2", type: "debit", amount: 996.11, balance_after: 1003.89, description: "Campaign charges", reference: "camp1", created_at: daysAgo(4) },
  ]),

  creditHistory: paginated([
    { id: "ch1", category: "marketing", cost: 0.7846, currency: "INR", created_at: daysAgo(4), conversation_id: null },
    { id: "ch2", category: "utility", cost: 0.115, currency: "INR", created_at: daysAgo(0), conversation_id: null },
  ]),

  subscriptions: paginated([
    { id: "s1", plan: "trial", amount: 0, currency: "INR", period_start: daysAgo(3), period_end: daysAgo(-27), status: "active", invoice_url: null },
  ]),

  members: {
    data: [
      { id: "mem1", role: "owner", permissions: [] as string[], is_online: true, last_active_at: now(), created_at: daysAgo(30), users: { id: DEMO_USER_ID, name: "Demo User", email: "demo@waautomations.com", avatar_url: null } },
    ],
  },

  agents: {
    data: [
      { id: "mem1", role: "manager", isOnline: true, lastActiveAt: now(), user: { id: DEMO_USER_ID, name: "Demo User", email: "demo@waautomations.com" }, openConversations: 2 },
    ],
  },
};

function paginated<T>(rows: T[]) {
  return { data: rows, page: 1, pageSize: 25, total: rows.length, totalPages: 1 };
}
