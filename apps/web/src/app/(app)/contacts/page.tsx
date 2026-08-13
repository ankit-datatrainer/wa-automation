"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, Pagination } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import { ContactDrawer } from "./contact-drawer";

interface ContactRow {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  opt_in_status: "opted_in" | "opted_out" | "unknown";
  source: string | null;
  created_at: string;
  contact_tags: { tags: { id: string; name: string; color: string } | null }[];
}

interface ContactsResponse {
  data: ContactRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [optInStatus, setOptInStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const contacts = useQuery({
    queryKey: ["contacts", { page, search, optInStatus }],
    queryFn: () =>
      api.get<ContactsResponse>("/contacts", {
        page,
        pageSize: 25,
        search,
        optInStatus: optInStatus || undefined,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["contacts"] });

  const bulkDelete = useMutation({
    mutationFn: (contactIds: string[]) =>
      api.post("/contacts/bulk", { contactIds, action: "delete" }),
    onSuccess: () => {
      toast.success(`Deleted ${selected.length} contacts`);
      setSelected([]);
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = contacts.data?.data ?? [];
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Everyone you can reach on WhatsApp, with their tags and opt-in status."
        onRefresh={() => void contacts.refetch()}
        refreshing={contacts.isFetching}
        actions={
          <>
            <Button variant="outline" onClick={() => toast.info("CSV import opens in the next step")}>
              <Upload size={16} />
              Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditingId(null);
                setDrawerOpen(true);
              }}
            >
              <Plus size={16} />
              Add contact
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-64 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by name, phone or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            className="w-48"
            value={optInStatus}
            onChange={(e) => {
              setOptInStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All opt-in states</option>
            <option value="opted_in">Opted in</option>
            <option value="opted_out">Opted out</option>
            <option value="unknown">Unknown</option>
          </Select>

          {selected.length > 0 && (
            <Button
              variant="destructive"
              loading={bulkDelete.isPending}
              onClick={() => bulkDelete.mutate(selected)}
            >
              <Trash2 size={16} />
              Delete {selected.length}
            </Button>
          )}
        </div>

        {contacts.isError ? (
          <ErrorState message="Could not load contacts." onRetry={() => void contacts.refetch()} />
        ) : contacts.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add contacts manually or import a CSV to start sending campaigns."
            action={
              <Button
                onClick={() => {
                  setEditingId(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus size={16} />
                Add your first contact
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all contacts on this page"
                      checked={allSelected}
                      onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                    />
                  </TH>
                  <TH>Contact</TH>
                  <TH>Phone</TH>
                  <TH>Tags</TH>
                  <TH>Opt-in</TH>
                  <TH>Source</TH>
                  <TH>Added</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((contact) => (
                  <TR
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingId(contact.id);
                      setDrawerOpen(true);
                    }}
                  >
                    <TD onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${contact.name ?? contact.wa_id}`}
                        checked={selected.includes(contact.id)}
                        onChange={(e) =>
                          setSelected((current) =>
                            e.target.checked
                              ? [...current, contact.id]
                              : current.filter((id) => id !== contact.id),
                          )
                        }
                      />
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(contact.name, contact.wa_id.slice(-2))}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{contact.name ?? "Unnamed"}</p>
                          {contact.email && (
                            <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs">+{contact.wa_id}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {contact.contact_tags
                          .map((ct) => ct.tags)
                          .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
                          .map((tag) => (
                            <Badge key={tag.id} style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}>
                              {tag.name}
                            </Badge>
                          ))}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(contact.opt_in_status)}>
                        {contact.opt_in_status.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{contact.source ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={contacts.data!.page}
              totalPages={contacts.data!.totalPages}
              total={contacts.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <ContactDrawer
        open={drawerOpen}
        contactId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          void invalidate();
        }}
      />
    </>
  );
}
