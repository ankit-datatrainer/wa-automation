import { z } from "zod";
import {
  AUDIENCE_TYPES,
  CHATBOT_TRIGGERS,
  MESSAGE_CATEGORIES,
  OPT_IN_STATUSES,
  ROLES,
  TICKET_PRIORITIES,
} from "./enums";

/** E.164 without the leading `+`, which is how Meta returns `wa_id`. */
export const waIdSchema = z
  .string()
  .regex(/^[1-9]\d{7,14}$/, "Must be a valid phone number in E.164 form");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

// ---------- Auth ----------
export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().min(2, "Enter your full name"),
  organizationName: z.string().min(2, "Enter your business name"),
  phone: z.string().optional(),
  country: z.string().length(2).optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

// ---------- Contacts ----------
export const contactSchema = z.object({
  waId: waIdSchema,
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  attributes: z.record(z.unknown()).default({}),
  optInStatus: z.enum(OPT_IN_STATUSES).default("unknown"),
  tagIds: z.array(z.string().uuid()).default([]),
  groupIds: z.array(z.string().uuid()).default([]),
});

export const contactImportRowSchema = z.object({
  waId: waIdSchema,
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

// ---------- Templates ----------
export const templateButtonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("QUICK_REPLY"), text: z.string().max(25) }),
  z.object({
    type: z.literal("URL"),
    text: z.string().max(25),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("PHONE_NUMBER"),
    text: z.string().max(25),
    phoneNumber: z.string(),
  }),
  z.object({ type: z.literal("COPY_CODE"), text: z.string().max(25) }),
]);

export const templateSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9_]{1,512}$/, "Lowercase letters, numbers and underscores only"),
  language: z.string().min(2).default("en"),
  category: z.enum(MESSAGE_CATEGORIES),
  components: z.object({
    header: z
      .object({
        format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]),
        text: z.string().max(60).optional(),
        mediaHandle: z.string().optional(),
      })
      .optional(),
    body: z.object({
      text: z.string().min(1).max(1024),
      examples: z.array(z.string()).default([]),
    }),
    footer: z.object({ text: z.string().max(60) }).optional(),
    buttons: z.array(templateButtonSchema).max(10).optional(),
  }),
});

// ---------- Campaigns ----------
export const campaignSchema = z
  .object({
    name: z.string().min(2).max(120),
    templateId: z.string().uuid(),
    audienceType: z.enum(AUDIENCE_TYPES),
    audienceConfig: z.record(z.unknown()).default({}),
    /** Maps template variable index -> contact field or literal. */
    variableMapping: z.record(z.string()).default({}),
    scheduledAt: z.string().datetime().nullable().default(null),
  })
  .refine(
    (c) => c.scheduledAt === null || new Date(c.scheduledAt) > new Date(),
    { message: "Scheduled time must be in the future", path: ["scheduledAt"] },
  );

// ---------- Messaging ----------
export const sendMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1).max(4096) }),
  z.object({
    type: z.literal("media"),
    mediaType: z.enum(["image", "video", "audio", "document"]),
    mediaUrl: z.string().url(),
    caption: z.string().max(1024).optional(),
  }),
  z.object({
    type: z.literal("template"),
    templateId: z.string().min(1),
    variables: z.record(z.string()).default({}),
  }),
]);

export const cannedMessageSchema = z.object({
  shortcode: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  body: z.string().min(1).max(4096),
});

// ---------- Automation ----------
export const chatbotSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  triggerType: z.enum(CHATBOT_TRIGGERS),
  triggerConfig: z.object({ keywords: z.array(z.string()).default([]) }).default({
    keywords: [],
  }),
  flowId: z.string().uuid().nullable().default(null),
  isActive: z.boolean().default(false),
});

export const flowDefinitionSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z.record(z.unknown()),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().optional(),
      label: z.string().optional(),
    }),
  ),
});

// ---------- Admin / settings ----------
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
  permissions: z.array(z.string()).default([]),
});

export const wabaCredentialsSchema = z.object({
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  accessToken: z.string().min(20),
  appSecret: z.string().min(1).optional(),
  verifyToken: z.string().min(8),
});

export const businessProfileSchema = z.object({
  about: z.string().max(139).optional(),
  address: z.string().max(256).optional(),
  description: z.string().max(512).optional(),
  email: z.string().email().optional().or(z.literal("")),
  websites: z.array(z.string().url()).max(2).default([]),
  vertical: z.string().optional(),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(4).max(200),
  message: z.string().min(4).max(5000),
  priority: z.enum(TICKET_PRIORITIES).default("medium"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ChatbotInput = z.infer<typeof chatbotSchema>;
export type WabaCredentialsInput = z.infer<typeof wabaCredentialsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
