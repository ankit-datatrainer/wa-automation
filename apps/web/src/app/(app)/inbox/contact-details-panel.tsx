"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronDown,
  Hash,
  Pencil,
  Phone,
  Plus,
  Tag,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";
import {
  AssignAgentModal,
  CreateTicketModal,
  EditAttributesModal,
  ManageGroupsModal,
  ManageTagsModal,
} from "./inbox-modals";

interface ContactDetail {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  attributes: Record<string, unknown>;
  opt_in_status: string;
  created_at: string;
  contact_tags?: { tags: { id: string; name: string; color: string } }[];
  contact_groups?: { groups: { id: string; name: string } }[];
}

export function ContactDetailsPanel({
  conversationId,
  contactId,
  contactName,
  contactWaId,
  assignedTo,
  assigneeName,
}: {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  contactWaId: string;
  assignedTo: string | null;
  assigneeName: string | null;
}) {
  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    attributes: true,
    tags: true,
    groups: true,
    tickets: true,
  });

  // Modal open states
  const [assignOpen, setAssignOpen] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const contactQuery = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => api.get<ContactDetail>(`/contacts/${contactId}`),
    enabled: !!contactId,
  });

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => api.get<{ data: { id: string; subject: string; status: string; priority: string }[] }>("/support/tickets"),
  });

  const contactData = contactQuery.data;
  const attributes = contactData?.attributes ?? {};
  const attributeEntries = Object.entries(attributes);

  const tags = contactData?.contact_tags?.map((t) => t.tags).filter(Boolean) ?? [];
  const groups = contactData?.contact_groups?.map((g) => g.groups).filter(Boolean) ?? [];
  const tickets = ticketsQuery.data?.data ?? [];

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-card overflow-y-auto scrollbar-thin divide-y">
      {/* Contact Profile Header */}
      <div className="flex flex-col items-center p-6 text-center">
        <div className="relative mb-3">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#00C268] text-2xl font-bold text-white shadow-md">
            {initials(contactName, contactWaId.slice(-2))}
          </span>
          {/* Online green indicator on the rim */}
          <span
            title="Online"
            className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card bg-emerald-500 shadow-sm"
          />
        </div>

        <h3 className="text-lg font-bold text-foreground">
          {contactName ?? `+${contactWaId}`}
        </h3>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Phone size={13} className="text-muted-foreground/80" />
          <span className="font-mono">{contactWaId}</span>
        </div>
      </div>

      {/* Assignment Section */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <User size={14} className="text-muted-foreground" />
            <span>Assignment</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-medium text-muted-foreground">
            {assigneeName ?? (assignedTo ? "Assigned Agent" : "Not assigned")}
          </span>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="rounded-lg bg-[#00C268] px-3.5 py-1 text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95 shadow-sm"
          >
            Assign
          </button>
        </div>
      </div>

      {/* # Attributes Section */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => toggleSection("attributes")}
            className="flex flex-1 items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground text-left"
          >
            <Hash size={14} />
            <span>Attributes</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAttributesOpen(true)}
              aria-label="Edit attributes"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => toggleSection("attributes")}
              aria-label="Toggle attributes"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform duration-200",
                  !openSections.attributes && "-rotate-90",
                )}
              />
            </button>
          </div>
        </div>

        {openSections.attributes && (
          <div className="pt-2">
            {attributeEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Hash size={24} className="text-muted-foreground/30 mb-1" />
                <p className="text-xs text-muted-foreground">No attributes available</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {attributeEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-muted-foreground capitalize">{k}</span>
                    <span className="font-medium text-foreground truncate max-w-[140px]">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tags Section */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => toggleSection("tags")}
            className="flex flex-1 items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground text-left"
          >
            <Tag size={14} />
            <span>Tags</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTagsOpen(true)}
              aria-label="Add tags"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleSection("tags")}
              aria-label="Toggle tags"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform duration-200",
                  !openSections.tags && "-rotate-90",
                )}
              />
            </button>
          </div>
        </div>

        {openSections.tags && (
          <div className="pt-2">
            {tags.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No tags assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Groups Section */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => toggleSection("groups")}
            className="flex flex-1 items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground text-left"
          >
            <Users size={14} />
            <span>Groups</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGroupsOpen(true)}
              aria-label="Add groups"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleSection("groups")}
              aria-label="Toggle groups"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform duration-200",
                  !openSections.groups && "-rotate-90",
                )}
              />
            </button>
          </div>
        </div>

        {openSections.groups && (
          <div className="pt-2">
            {groups.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No groups assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((group) => (
                  <Badge key={group.id} tone="info" className="text-xs">
                    {group.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket History Section */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => toggleSection("tickets")}
            className="flex flex-1 items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground text-left"
          >
            <Ticket size={14} />
            <span>Ticket History</span>
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">
              {tickets.length}
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              aria-label="Create ticket"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => toggleSection("tickets")}
              aria-label="Toggle tickets"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform duration-200",
                  !openSections.tickets && "-rotate-90",
                )}
              />
            </button>
          </div>
        </div>

        {openSections.tickets && (
          <div className="pt-2">
            {tickets.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center">
                <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground mb-1.5">
                  <Ticket size={16} />
                </div>
                <p className="text-xs text-muted-foreground">No support ticket history found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-xl border p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate max-w-[150px]">{t.subject}</span>
                      <Badge tone={t.status === "open" ? "warning" : "success"} className="text-[10px]">
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground capitalize">Priority: {t.priority}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

      <CreateTicketModal
        contactName={contactName}
        isOpen={ticketOpen}
        onClose={() => setTicketOpen(false)}
      />
    </div>
  );
}
