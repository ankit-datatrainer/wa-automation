import type {
  AudienceType,
  CampaignStatus,
  ChatbotTrigger,
  ConversationStatus,
  MessageCategory,
  MessageStatus,
  MessageType,
  MessagingTier,
  OptInStatus,
  QualityRating,
  Role,
  TemplateStatus,
  TicketPriority,
  TicketStatus,
} from "./enums";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  walletBalance: number;
  currency: string;
  trialEndsAt: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  avatarUrl: string | null;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  permissions: string[];
  isOnline: boolean;
  user?: User;
}

export interface WabaAccount {
  id: string;
  organizationId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhone: string;
  verifiedName: string | null;
  qualityRating: QualityRating;
  messagingTier: MessagingTier;
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string | null;
}

export interface Contact {
  id: string;
  organizationId: string;
  waId: string;
  name: string | null;
  email: string | null;
  attributes: Record<string, unknown>;
  optInStatus: OptInStatus;
  source: string | null;
  lastSeenAt: string | null;
  tags?: Tag[];
  createdAt: string;
}

export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  color: string;
}

export interface Group {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  contactCount: number;
}

export interface Conversation {
  id: string;
  organizationId: string;
  contactId: string;
  status: ConversationStatus;
  assignedTo: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  /** Null once the 24-hour free-form window has closed. */
  sessionExpiresAt: string | null;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  type: MessageType;
  content: Record<string, unknown>;
  wamid: string | null;
  status: MessageStatus;
  error: { code: number; title: string; details?: string } | null;
  templateId: string | null;
  sentBy: string | null;
  sentAt: string;
}

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface TemplateComponents {
  header?: {
    format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
    text?: string;
    mediaHandle?: string;
  };
  body: { text: string; examples?: string[] };
  footer?: { text: string };
  buttons?: TemplateButton[];
}

export interface Template {
  id: string;
  organizationId: string;
  name: string;
  language: string;
  category: MessageCategory;
  components: TemplateComponents;
  metaTemplateId: string | null;
  status: TemplateStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
}

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  templateId: string;
  audienceType: AudienceType;
  audienceConfig: Record<string, unknown>;
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: CampaignStats;
  createdAt: string;
}

export interface Chatbot {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  triggerType: ChatbotTrigger;
  triggerConfig: { keywords?: string[] };
  flowId: string | null;
  isActive: boolean;
}

export interface ChatbotLibraryItem {
  id: string;
  title: string;
  description: string;
  industry: string;
  definition: FlowDefinition;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Flow {
  id: string;
  organizationId: string;
  name: string;
  definition: FlowDefinition;
  metaFlowId: string | null;
  status: "draft" | "published";
}

export interface Product {
  id: string;
  organizationId: string;
  retailerId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  availability: "in stock" | "out of stock";
}

export interface WalletTransaction {
  id: string;
  organizationId: string;
  type: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  reference: string | null;
  description: string;
  createdAt: string;
}

export interface CreditHistoryEntry {
  id: string;
  organizationId: string;
  conversationId: string | null;
  category: MessageCategory;
  cost: number;
  currency: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  organizationId: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** Powers the six dashboard KPI cards. */
export interface DashboardStats {
  accountDaysLeft: number;
  accountStatus: "active" | "expired" | "trial";
  totalTemplates: number;
  totalReports: number;
  balance: number;
  currency: string;
  qualityRating: QualityRating;
  perDayMessageLimit: number;
  messagesUsedToday: number;
}

export interface MessageCharge {
  category: MessageCategory;
  price: number;
  currency: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
