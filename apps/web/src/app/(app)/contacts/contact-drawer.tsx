"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface ContactDetail {
  id: string;
  wa_id: string;
  name: string | null;
  email: string | null;
  opt_in_status: "opted_in" | "opted_out" | "unknown";
  contact_tags: { tags: TagOption | null }[];
}

export function ContactDrawer({
  open,
  contactId,
  onClose,
  onSaved,
}: {
  open: boolean;
  contactId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [waId, setWaId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [optInStatus, setOptInStatus] = useState<ContactDetail["opt_in_status"]>("unknown");
  const [tagIds, setTagIds] = useState<string[]>([]);

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ data: TagOption[] }>("/tags"),
    enabled: open,
  });

  const detail = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => api.get<ContactDetail>(`/contacts/${contactId}`),
    enabled: open && !!contactId,
  });

  // Load the record into the form when editing; clear it when adding.
  useEffect(() => {
    if (!open) return;
    if (contactId && detail.data) {
      setWaId(detail.data.wa_id);
      setName(detail.data.name ?? "");
      setEmail(detail.data.email ?? "");
      setOptInStatus(detail.data.opt_in_status);
      setTagIds(
        detail.data.contact_tags.map((ct) => ct.tags?.id).filter((id): id is string => !!id),
      );
    } else if (!contactId) {
      setWaId("");
      setName("");
      setEmail("");
      setOptInStatus("unknown");
      setTagIds([]);
    }
  }, [open, contactId, detail.data]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        waId: waId.replace(/\D/g, ""),
        name: name.trim() || undefined,
        email: email.trim(),
        optInStatus,
        tagIds,
        attributes: {},
        groupIds: [],
      };
      return contactId
        ? api.patch(`/contacts/${contactId}`, payload)
        : api.post("/contacts", payload);
    },
    onSuccess: () => {
      toast.success(contactId ? "Contact updated" : "Contact created");
      onSaved();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not save the contact",
      ),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/40"
      />

      <aside className="flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-bold">{contactId ? "Edit contact" : "Add contact"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        {contactId && detail.isLoading ? (
          <div className="grid flex-1 place-items-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <Field
                label="WhatsApp number"
                required
                hint="Include the country code, e.g. 919266806659."
              >
                {({ id }) => (
                  <Input
                    id={id}
                    required
                    inputMode="numeric"
                    placeholder="919266806659"
                    value={waId}
                    onChange={(e) => setWaId(e.target.value)}
                  />
                )}
              </Field>

              <Field label="Name">
                {({ id }) => (
                  <Input id={id} placeholder="Ankit Kumar" value={name} onChange={(e) => setName(e.target.value)} />
                )}
              </Field>

              <Field label="Email">
                {({ id }) => (
                  <Input
                    id={id}
                    type="email"
                    placeholder="ankit@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Opt-in status"
                hint="Marketing messages may only go to opted-in contacts."
              >
                {({ id }) => (
                  <Select
                    id={id}
                    value={optInStatus}
                    onChange={(e) =>
                      setOptInStatus(e.target.value as ContactDetail["opt_in_status"])
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="opted_in">Opted in</option>
                    <option value="opted_out">Opted out</option>
                  </Select>
                )}
              </Field>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.data?.data.length ? (
                    tags.data.data.map((tag) => {
                      const active = tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            setTagIds((current) =>
                              active ? current.filter((id) => id !== tag.id) : [...current, tag.id],
                            )
                          }
                          className="rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
                          style={
                            active
                              ? { backgroundColor: tag.color, borderColor: tag.color, color: "#fff" }
                              : { borderColor: tag.color, color: tag.color }
                          }
                        >
                          {tag.name}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tags yet — create them under Manage.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <footer className="flex gap-3 border-t p-5">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={save.isPending}>
                {contactId ? "Save changes" : "Create contact"}
              </Button>
            </footer>
          </form>
        )}
      </aside>
    </div>
  );
}
