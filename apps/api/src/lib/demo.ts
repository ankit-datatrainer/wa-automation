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
    user: { id: DEMO_USER_ID, email: "demo@waautomation.com", name: "Riya Sharma", phone: "+91 90000 12345", country: "India" },
    organization: {
      id: DEMO_ORG_ID,
      name: "WA Automation Demo",
      slug: "wa-automation-demo",
      plan: "trial",
      walletBalance: 1001.04,
      currency: "INR",
      trialEndsAt: "2026-09-08T00:00:00.000Z",
      isDemo: true,
    },
    membership: { role: "owner", permissions: [] as string[] },
    waba: {
      id: "demo-waba",
      wabaId: "102290129340398",
      phoneNumberId: "106540352242922",
      displayPhone: "+91 90000 00001",
      verifiedName: "WA Automation Demo",
      qualityRating: "high",
      messagingTier: "TIER_1K",
      status: "connected",
      lastSyncedAt: now(),
    },
  },

  dashboardStats: {
    accountDaysLeft: 20,
    accountStatus: "active",
    totalTemplates: 5,
    totalReports: 13,
    balance: 1001.04,
    currency: "INR",
    qualityRating: "high",
    perDayMessageLimit: 2000,
    messagesUsedToday: 340,
    isDemo: true,
    plan: "trial",
    totalCredit: 1010,
    totalDebit: 8.96,
    demoExpires: "September 8, 2026",
    memberSince: "August 5, 2026",
  },

  dashboardAccount: {
    email: "demo@waautomation.com",
    mobile: "+91 90000 12345",
    country: "India",
    name: "Riya Sharma",
    organizationName: "WA Automation Demo",
    isDemo: true,
    plan: "trial",
    demoExpires: "September 8, 2026",
    memberSince: "August 5, 2026",
    daysRemaining: 20,
  },

  messageCharges: {
    country: "India",
    charges: [
      { category: "marketing", price: 0.95, currency: "INR", percentage: "73.6% of total", description: "Promotional and marketing campaigns" },
      { category: "utility", price: 0.17, currency: "INR", percentage: "13.2% of total", description: "Service updates and notifications" },
      { category: "authentication", price: 0.17, currency: "INR", percentage: "13.2% of total", description: "OTP and verification messages" },
    ],
  },

  waba: {
    id: "demo-waba",
    waba_id: "102290129340398",
    phone_number_id: "106540352242922",
    display_phone: "+91 90000 00001",
    verified_name: "WA Automation Demo",
    quality_rating: "high",
    messaging_tier: "TIER_1K",
    status: "connected",
    verify_token: "demo-verify-token",
    last_synced_at: now(),
  },

  contacts: paginated([
    { id: "c1", wa_id: "7738293629", name: null, email: null, attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: daysAgo(1), contact_tags: [], contact_groups: [] },
    { id: "c2", wa_id: "8928814237", name: null, email: null, attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: daysAgo(2), contact_tags: [], contact_groups: [] },
    { id: "c3", wa_id: "9811110594", name: "Piyush A", email: "piyush@example.com", attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: daysAgo(3), contact_tags: [], contact_groups: [] },
    { id: "c4", wa_id: "919000012345", name: "Riya Sharma", email: "demo@waautomation.com", attributes: {}, opt_in_status: "opted_in", source: "manual", created_at: daysAgo(4), contact_tags: [], contact_groups: [] },
    { id: "c5", wa_id: "7838349247", name: "Ankit Kumar", email: "ankit@example.com", attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: daysAgo(8), contact_tags: [], contact_groups: [] },
    { id: "c6", wa_id: "9540724184", name: "Sagar", email: "sagar@example.com", attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: daysAgo(5), contact_tags: [], contact_groups: [] },
    { id: "c7", wa_id: "9636480218", name: "9636480218", email: null, attributes: {}, opt_in_status: "opted_in", source: "whatsapp", created_at: daysAgo(10), contact_tags: [], contact_groups: [] },
  ]),

  tags: {
    data: [
      { id: "t1", name: "VIP", color: "#16A34A", createdAt: now(), contactCount: 1 },
      { id: "t2", name: "Finance", color: "#2563EB", createdAt: now(), contactCount: 1 },
      { id: "t3", name: "SMM", color: "#8B5CF6", createdAt: now(), contactCount: 1 },
      { id: "t4", name: "New Lead", color: "#F59E0B", createdAt: now(), contactCount: 0 },
    ],
  },

  groups: {
    data: [
      { id: "g1", name: "Delhi Customers", description: "Contacts based in Delhi NCR", createdAt: now(), contactCount: 2 },
      { id: "g2", name: "Newsletter", description: null, createdAt: now(), contactCount: 4 },
      { id: "g3", name: "Beta Testers", description: "Early access users", createdAt: now(), contactCount: 1 },
    ],
  },

  conversations: {
    data: [
      { id: "conv1", status: "open", assigned_to: null, unread_count: 1, last_message_at: "2026-08-19T17:21:00.000Z", last_message_preview: "No messages yet", session_expires_at: null, contacts: { id: "c1", wa_id: "7738293629", name: null } },
      { id: "conv2", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(1), last_message_preview: "Thank you for reaching out!", session_expires_at: new Date(Date.now() + 3_600_000).toISOString(), contacts: { id: "c4", wa_id: "919000012345", name: "Riya Sharma" } },
      { id: "conv3", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(1), last_message_preview: "Sent a template message", session_expires_at: null, contacts: { id: "c6", wa_id: "9540724184", name: "Sagar" } },
      { id: "conv4", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(1), last_message_preview: "Sent a template message", session_expires_at: null, contacts: { id: "c3", wa_id: "9811110594", name: "Piyush A" } },
      { id: "conv5", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(8), last_message_preview: "Sent a template message", session_expires_at: null, contacts: { id: "c5", wa_id: "7838349247", name: "Ankit Kumar" } },
      { id: "conv6", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(9), last_message_preview: "No messages yet", session_expires_at: null, contacts: { id: "c2", wa_id: "8928814237", name: null } },
      { id: "conv7", status: "open", assigned_to: null, unread_count: 0, last_message_at: daysAgo(10), last_message_preview: "Sent a template message", session_expires_at: null, contacts: { id: "c7", wa_id: "9636480218", name: "9636480218" } },
    ],
  },

  messages: (conversationId: string) => {
    if (conversationId === "conv1") {
      return {
        data: [
          {
            id: "m-ayush-1",
            direction: "outbound",
            type: "text",
            content: { text: "Thank you for reaching out!" },
            wamid: "wamid.demo.ayush1",
            status: "read",
            error: null,
            sent_by: DEMO_USER_ID,
            sent_at: "2026-08-08T13:13:00.000Z",
            template_id: null,
          },
          {
            id: "m-ayush-2",
            direction: "outbound",
            type: "template",
            content: {
              templateName: "welcome_brand",
              text: "Welcome to aiGreenTick! Empowering your brand with WhatsApp business automation.",
              mediaUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
            },
            wamid: "wamid.demo.ayush2",
            status: "delivered",
            error: null,
            sent_by: DEMO_USER_ID,
            sent_at: "2026-08-11T15:20:00.000Z",
            template_id: "tpl1",
          },
        ],
        sessionExpiresAt: null,
        canSendFreeform: false,
        _conversationId: conversationId,
      };
    }

    return {
      data: [
        { id: "m1", direction: "inbound", type: "text", content: { text: "Hi, I'd like to know more about your pricing and features." }, wamid: "wamid.demo1", status: "read", error: null, sent_by: null, sent_at: daysAgo(0), template_id: null },
        { id: "m2", direction: "outbound", type: "text", content: { text: "Hello! Sure, let me share our plans and setup guide with you." }, wamid: "wamid.demo2", status: "read", error: null, sent_by: DEMO_USER_ID, sent_at: daysAgo(0), template_id: null },
      ],
      sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      canSendFreeform: true,
      _conversationId: conversationId,
    };
  },

  templates: paginated([
    { id: "tpl1", name: "peculiex_finvoq", language: "en", category: "marketing", components: { header: { type: "IMAGE" }, body: { text: "Hi {{1}}, welcome to Peculiex Finvoq! Explore our automated invoice and billing solution." }, buttons: [{ type: "URL", text: "Get Started" }] }, status: "approved", rejection_reason: null, meta_template_id: "meta-1", created_at: "2026-08-19T10:00:00.000Z" },
    { id: "tpl2", name: "website_development", language: "en", category: "marketing", components: { header: { type: "IMAGE" }, body: { text: "Hi {{1}}, transform your brand with custom website design and web applications." }, buttons: [{ type: "URL", text: "View Portfolio" }] }, status: "approved", rejection_reason: null, meta_template_id: "meta-2", created_at: "2026-08-18T12:00:00.000Z" },
    { id: "tpl3", name: "leads_whatsapp", language: "en", category: "marketing", components: { header: { type: "IMAGE" }, body: { text: "Hi {{1}}, thank you for reaching out through WhatsApp! Our consultant will connect with you shortly." }, buttons: [{ type: "QUICK_REPLY", text: "Talk to Agent" }] }, status: "approved", rejection_reason: null, meta_template_id: "meta-3", created_at: "2026-08-11T14:00:00.000Z" },
    { id: "tpl4", name: "peculiex_1st", language: "en", category: "marketing", components: { header: { type: "IMAGE" }, body: { text: "Hello {{1}}, discover innovative technology solutions tailored for your business growth." }, buttons: [{ type: "URL", text: "Visit Website" }] }, status: "approved", rejection_reason: null, meta_template_id: "meta-4", created_at: "2026-08-06T15:00:00.000Z" },
    { id: "tpl5", name: "msg2", language: "en", category: "utility", components: { body: { text: "Hi {{1}}, your transaction request #{{2}} has been successfully processed." }, buttons: [{ type: "QUICK_REPLY", text: "View Details" }] }, status: "approved", rejection_reason: null, meta_template_id: "meta-5", created_at: "2026-08-06T11:00:00.000Z" },
    { id: "tpl6", name: "msg", language: "en", category: "utility", components: { body: { text: "Hi {{1}}, your account verification code is {{2}}. Valid for 10 minutes." } }, status: "approved", rejection_reason: null, meta_template_id: "meta-6", created_at: "2026-08-06T09:00:00.000Z" },
    { id: "tpl7", name: "test", language: "en", category: "utility", components: { body: { text: "This is a test utility notification message for account {{1}}." } }, status: "approved", rejection_reason: null, meta_template_id: "meta-7", created_at: "2026-08-06T08:00:00.000Z" },
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
