"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Hash,
  Mail,
  Pencil,
  Plus,
  Tag,
  Ticket,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { ease } from "@/components/motion";
import { api } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import { ContactAvatar } from "./inbox-ui";
import {
  AssignAgentModal,
  CreateTicketModal,
  EditAttributesModal,
  ManageGroupsModal,
  ManageTagsModal,
  type AgentMember,
} from "./inbox-modals";

interface ContactDetail {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  attributes: Record<string, unknown>;
  opt_in_status: string;
  created_at: string;
  contact_tags?: { tags: { id: string; name: string; color: string } | null }[];
  contact_groups?: { groups: { id: string; name: string } | null }[];
}

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at?: string;
}

type SectionKey = "attributes" | "tags" | "groups" | "tickets";

export function ContactDetailsPanel({
  conversationId,
  contactId,
  contactName,
  contactWaId,
  assignedTo,
  sessionOpen,
  onClose,
}: {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  contactWaId: string;
  assignedTo: string | null;
  sessionOpen?: boolean;
  onClose?: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    attributes: true,
    tags: true,
    groups: true,
    tickets: false,
  });
  const [copied, setCopied] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const contactQuery = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => api.get<ContactDetail>(`/contacts/${contactId}`),
    enabled: !!contactId,
  });

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => api.get<{ data: TicketRow[] }>("/support/tickets"),
  });

  // Same key as the assign modal, so the roster is fetched once and shared.
  const agentsQuery = useQuery({
    queryKey: ["admin", "agents"],
    queryFn: () => api.get<{ data: AgentMember[] }>("/admin/agents"),
    enabled: !!assignedTo,
  });

  const contactData = contactQuery.data;
  const attributes = contactData?.attributes ?? {};
  const attributeEntries = Object.entries(attributes);
  const tags =
    contactData?.contact_tags?.map((t) => t.tags).filter((t): t is NonNullable<typeof t> => !!t) ?? [];
  const groups =
    contactData?.contact_groups?.map((g) => g.groups).filter((g): g is NonNullable<typeof g> => !!g) ?? [];
  const tickets = ticketsQuery.data?.data ?? [];

  const assignee = assignedTo
    ? agentsQuery.data?.data.find((a) => a.user?.id === assignedTo)
    : undefined;
  const assigneeLabel = assignedTo
    ? (assignee?.user?.name ?? assignee?.user?.email ?? (agentsQuery.isLoading ? "Loading…" : "Team member"))
    : "Unassigned";

  const displayName = contactData?.name ?? contactName ?? `+${contactWaId}`;

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(`+${contactWaId}`);
      setCopied(true);
      toast.success("Phone number copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Profile header */}
        <div className="relative">
          <div aria-hidden className="h-24 bg-brand-gradient">
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_85%_60%,rgba(252,175,69,0.35),transparent_40%)]" />
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close contact details"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={16} />
            </button>
          )}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="-mt-10 flex flex-col items-center px-5 pb-5 text-center"
          >
            <ContactAvatar
              name={contactData?.name ?? contactName}
              waId={contactWaId}
              seed={contactId}
              size="xl"
              online={sessionOpen}
              className="[&>span:first-child]:ring-4"
            />
            <h3 className="mt-3 max-w-full truncate text-lg font-semibold tracking-tight">{displayName}</h3>
            <button
              type="button"
              onClick={copyNumber}
              className="group mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary"
              aria-label={`Copy phone number +${contactWaId}`}
            >
              <span className="font-medium tabular-nums">+{contactWaId}</span>
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="opacity-60 group-hover:opacity-100" />}
            </button>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {contactQuery.isLoading ? (
                <Skeleton className="h-5 w-24 rounded-full" />
              ) : contactData?.opt_in_status ? (
                <Badge tone={statusTone(contactData.opt_in_status)} className="capitalize">
                  {contactData.opt_in_status.replace(/_/g, " ")}
                </Badge>
              ) : null}
              <Badge tone={sessionOpen ? "success" : "neutral"}>
                {sessionOpen ? "Window open" : "Window closed"}
              </Badge>
            </div>
          </motion.div>
        </div>

        {/* Quick facts */}
        {(contactData?.email || contactData?.created_at) && (
          <div className="mx-4 mb-4 space-y-2 rounded-2xl border border-border/70 bg-muted/30 p-3 text-xs">
            {contactData?.email && (
              <a
                href={`mailto:${contactData.email}`}
                className="flex items-center gap-2 text-foreground/80 hover:text-primary"
              >
                <Mail size={14} className="shrink-0 text-primary" />
                <span className="truncate">{contactData.email}</span>
              </a>
            )}
            {contactData?.created_at && (
              <p className="flex items-center gap-2 text-foreground/80">
                <CalendarDays size={14} className="shrink-0 text-primary" />
                Contact since {format(new Date(contactData.created_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
        )}

        {/* Assignment */}
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 shadow-soft">
          {assignedTo ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-primary ring-1 ring-brand-200">
              {initials(assignee?.user?.name ?? assignee?.user?.email, "A")}
            </span>
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
              <UserCheck size={16} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Assigned to</p>
            <p className={cn("truncate text-sm font-semibold", !assignedTo && "text-muted-foreground")}>
              {assigneeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="shrink-0 rounded-xl bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_16px_-8px_rgba(131,58,180,0.8)] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            {assignedTo ? "Change" : "Assign"}
          </button>
        </div>

        <div className="divide-y divide-border/70 border-t border-border/70">
          {/* Attributes */}
          <PanelSection
            title="Attributes"
            icon={Hash}
            count={attributeEntries.length}
            open={openSections.attributes}
            onToggle={() => toggleSection("attributes")}
            actionLabel="Edit attributes"
            actionIcon={Pencil}
            onAction={() => setAttributesOpen(true)}
          >
            {contactQuery.isLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
            ) : attributeEntries.length === 0 ? (
              <EmptyLine text="No custom attributes yet." actionText="Add one" onAction={() => setAttributesOpen(true)} />
            ) : (
              <dl className="space-y-1.5">
                {attributeEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-xs"
                  >
                    <dt className="shrink-0 font-semibold capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                    <dd className="truncate text-right font-medium text-foreground" title={formatValue(v)}>
                      {formatValue(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </PanelSection>

          {/* Tags */}
          <PanelSection
            title="Tags"
            icon={Tag}
            count={tags.length}
            open={openSections.tags}
            onToggle={() => toggleSection("tags")}
            actionLabel="Manage tags"
            actionIcon={Plus}
            onAction={() => setTagsOpen(true)}
          >
            {tags.length === 0 ? (
              <EmptyLine text="No tags assigned." actionText="Add tags" onAction={() => setTagsOpen(true)} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1 text-xs font-semibold text-foreground shadow-soft"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </PanelSection>

          {/* Groups */}
          <PanelSection
            title="Groups"
            icon={Users}
            count={groups.length}
            open={openSections.groups}
            onToggle={() => toggleSection("groups")}
            actionLabel="Manage groups"
            actionIcon={Plus}
            onAction={() => setGroupsOpen(true)}
          >
            {groups.length === 0 ? (
              <EmptyLine text="Not in any group." actionText="Add to group" onAction={() => setGroupsOpen(true)} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((group) => (
                  <Badge key={group.id} tone="brand">
                    {group.name}
                  </Badge>
                ))}
              </div>
            )}
          </PanelSection>

          {/* Support tickets (workspace-wide; tickets aren't linked to a contact) */}
          <PanelSection
            title="Support tickets"
            icon={Ticket}
            count={tickets.length}
            open={openSections.tickets}
            onToggle={() => toggleSection("tickets")}
            actionLabel="Raise a support ticket"
            actionIcon={Plus}
            onAction={() => setTicketOpen(true)}
          >
            {ticketsQuery.isLoading ? (
              <Skeleton className="h-14 rounded-xl" />
            ) : tickets.length === 0 ? (
              <EmptyLine text="No support tickets yet." actionText="Raise one" onAction={() => setTicketOpen(true)} />
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 4).map((t) => (
                  <div key={t.id} className="rounded-xl border border-border/70 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-xs font-semibold">{t.subject}</span>
                      <Badge tone={statusTone(t.status)} className="shrink-0 text-[10px] capitalize">
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                      {t.priority} priority
                      {t.created_at ? ` · ${format(new Date(t.created_at), "MMM d")}` : ""}
                    </p>
                  </div>
                ))}
                <Link
                  href="/support/tickets"
                  className="inline-flex items-center gap-1 px-1 text-xs font-semibold text-primary hover:underline"
                >
                  View all tickets <ArrowUpRight size={12} />
                </Link>
              </div>
            )}
          </PanelSection>
        </div>
      </div>

      {/* Modals */}
      <AssignAgentModal
        conversationId={conversationId}
        currentAssigneeId={assignedTo}
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
      <EditAttributesModal
        contactId={contactId}
        currentAttributes={attributes}
        isOpen={attributesOpen}
        onClose={() => setAttributesOpen(false)}
      />
      <ManageTagsModal
        contactId={contactId}
        assignedTagIds={tags.map((t) => t.id)}
        isOpen={tagsOpen}
        onClose={() => setTagsOpen(false)}
      />
      <ManageGroupsModal
        contactId={contactId}
        assignedGroupIds={groups.map((g) => g.id)}
        isOpen={groupsOpen}
        onClose={() => setGroupsOpen(false)}
      />
      <CreateTicketModal contactName={contactName} isOpen={ticketOpen} onClose={() => setTicketOpen(false)} />
    </div>
  );
}

function PanelSection({
  title,
  icon: Icon,
  count,
  open,
  onToggle,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  children,
}: {
  title: string;
  icon: typeof Hash;
  count?: number;
  open: boolean;
  onToggle: () => void;
  actionLabel: string;
  actionIcon: typeof Hash;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 rounded-lg py-1 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-primary">
            <Icon size={13} />
          </span>
          {title}
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-bold tabular-nums text-foreground/70">
              {count}
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn("ml-auto transition-transform duration-300", !open && "-rotate-90")}
          />
        </button>
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ActionIcon size={13} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease }}
            className="overflow-hidden"
          >
            <div className="pb-1 pt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function EmptyLine({
  text,
  actionText,
  onAction,
}: {
  text: string;
  actionText: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
      <span>{text}</span>
      <button type="button" onClick={onAction} className="shrink-0 font-semibold text-primary hover:underline">
        {actionText}
      </button>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
