import {
  BadgeCheck,
  BarChart3,
  Bot,
  BookOpen,
  Building2,
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  FolderTree,
  Globe,
  Headphones,
  History,
  Inbox,
  Kanban,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Megaphone,
  Package,
  Phone,
  Radio,
  Receipt,
  ScrollText,
  Send,
  Settings2,
  ShieldCheck,
  Tags,
  Upload,
  UserCog,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: "New" | "Admin" | "Platform";
  /** Permission key checked against the member's grants. */
  permission?: string;
}

export interface NavSection {
  /** Section heading; omitted for the top-level standalone links. */
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
  /** Hidden entirely unless the signed-in user is a platform super admin. */
  superAdminOnly?: boolean;
}

/**
 * Platform administration, shown only to super admins. Kept separate from
 * `navigation` so a normal tenant's sidebar never even references these routes.
 */
export const platformNavigation: NavSection = {
  label: "Platform",
  collapsible: true,
  superAdminOnly: true,
  items: [
    { label: "Platform Overview", href: "/platform", icon: Globe, badge: "Platform" },
    { label: "Organizations", href: "/platform/organizations", icon: Building2 },
    { label: "Plans", href: "/platform/plans", icon: CreditCard },
    { label: "WhatsApp Numbers", href: "/platform/waba", icon: Phone },
    { label: "Support Desk", href: "/platform/support", icon: LifeBuoy },
    { label: "All Users", href: "/platform/users", icon: Users },
    { label: "Platform Audit", href: "/platform/audit", icon: ScrollText },
  ],
};

export const navigation: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { label: "Inbox", href: "/inbox", icon: Inbox },
      { label: "Chat History", href: "/chat-history", icon: History },
      { label: "Contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    label: "Campaigns",
    collapsible: true,
    items: [
      { label: "Campaigns", href: "/campaigns", icon: Send, badge: "New" },
      { label: "Template Library", href: "/campaigns/template-library", icon: FileText },
      { label: "Your Templates", href: "/campaigns/templates", icon: Radio },
      { label: "Send to Contacts", href: "/campaigns/send/contacts", icon: Send },
      { label: "Send By Tags", href: "/campaigns/send/tags", icon: Tags },
      { label: "Send By Groups", href: "/campaigns/send/groups", icon: Users },
      { label: "CSV Campaign", href: "/campaigns/send/csv", icon: FileText },
      { label: "Broadcast", href: "/campaigns/broadcast", icon: Megaphone },
      { label: "Campaign History", href: "/campaigns/history", icon: Clock },
      { label: "Scheduled Campaigns", href: "/campaigns/scheduled", icon: CalendarClock },
    ],
  },
  {
    label: "Ads Manager",
    collapsible: true,
    items: [{ label: "Setup", href: "/ads/setup", icon: Radio }],
  },
  {
    label: "Automation",
    collapsible: true,
    items: [
      { label: "Chatbots", href: "/chatbots", icon: Bot },
      { label: "Chatbots Library", href: "/chatbots/library", icon: BookOpen },
      { label: "Your Chatbots", href: "/chatbots/mine", icon: MessageCircle },
      { label: "Chatbot History", href: "/chatbots/history", icon: History },
      { label: "Manage Flows", href: "/flows", icon: Kanban },
      { label: "Flow Submissions", href: "/flows/submissions", icon: ListChecks },
    ],
  },
  {
    label: "Catalogue",
    collapsible: true,
    items: [
      { label: "Catalogue", href: "/catalogue", icon: FolderTree },
      { label: "Orders", href: "/catalogue/orders", icon: Package },
    ],
  },
  {
    label: "Analytics",
    collapsible: true,
    items: [
      { label: "Analytics Overview", href: "/analytics", icon: BarChart3, badge: "New" },
      { label: "Credit History", href: "/analytics/credits", icon: Receipt },
      { label: "Chat History", href: "/analytics/chats", icon: MessageSquare },
      { label: "Subscription History", href: "/analytics/subscriptions", icon: CreditCard },
      { label: "Wallet History", href: "/analytics/wallet", icon: Wallet },
    ],
  },
  {
    label: "Administration",
    collapsible: true,
    items: [
      {
        label: "User and Permission Manager",
        href: "/admin/users",
        icon: ShieldCheck,
        badge: "Admin",
        permission: "admin.users",
      },
      { label: "Agents Login", href: "/admin/agents", icon: UserCog, permission: "admin.agents" },
    ],
  },
  {
    label: "Support",
    collapsible: true,
    items: [
      { label: "Support Tickets", href: "/support/tickets", icon: LifeBuoy },
      { label: "Setup Support", href: "/support/setup", icon: Headphones },
      { label: "Support Reports", href: "/support/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    collapsible: true,
    items: [
      { label: "API Docs", href: "/settings/api-docs", icon: FileText },
      { label: "Integrations", href: "/settings/integrations", icon: Zap },
      { label: "Support", href: "/settings/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Manage",
    collapsible: true,
    items: [
      { label: "Business Profile", href: "/manage/business-profile", icon: Building2 },
      { label: "User Profile", href: "/manage/profile", icon: UserCog },
      { label: "Media Uploads", href: "/manage/media", icon: Upload },
      { label: "Manage Groups", href: "/manage/groups", icon: Users },
      { label: "Manage Credentials", href: "/manage/credentials", icon: Settings2 },
      { label: "Opt-in Management", href: "/manage/opt-in", icon: BadgeCheck },
      { label: "Canned Message", href: "/manage/canned-messages", icon: MessageSquare },
      { label: "Live Chat Setting", href: "/manage/live-chat", icon: MessageCircle },
    ],
  },
];

/** Tenant nav plus the platform section, for lookups that must cover both. */
const allSections: NavSection[] = [...navigation, platformNavigation];

/** Flattened list, used by the ⌘K command palette. */
export const allNavItems: NavItem[] = navigation.flatMap((s) => s.items);

/** Longest-prefix match so nested routes highlight their parent nav item. */
export function findActiveItem(pathname: string): NavItem | undefined {
  return allSections
    .flatMap((s) => s.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function breadcrumbsFor(pathname: string): { label: string; href: string }[] {
  const item = findActiveItem(pathname);
  if (!item) return [];
  const section = allSections.find((s) => s.items.includes(item));
  const crumbs: { label: string; href: string }[] = [];
  if (section?.label) crumbs.push({ label: section.label, href: section.items[0]!.href });
  crumbs.push({ label: item.label, href: item.href });
  return crumbs;
}

export const PACKAGE_ITEM_COUNT = allNavItems.length;
