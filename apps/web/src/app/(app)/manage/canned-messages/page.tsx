"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, MessageSquare, Plus, Search, Slash, Trash2, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import {
  CharCount,
  ConfirmDialog,
  CopyButton,
  SettingsSection,
  timeAgo,
} from "../_components/settings-kit";

interface CannedMessage {
  id: string;
  shortcode: string;
  body: string;
  created_at: string;
}

const SHORTCODE_RE = /^[a-z0-9_-]{1,40}$/;

/** Same normalisation the API expects: lowercase, spaces → dashes. */
function normalizeShortcode(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function CannedMessagesPage() {
  const queryClient = useQueryClient();
  const [shortcode, setShortcode] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CannedMessage | null>(null);

  const canned = useQuery({
    queryKey: ["canned-messages"],
    queryFn: () => api.get<{ data: CannedMessage[] }>("/canned-messages"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["canned-messages"] });

  const normalized = normalizeShortcode(shortcode);
  const shortcodeInvalid = shortcode.length > 0 && !SHORTCODE_RE.test(normalized);

  const create = useMutation({
    mutationFn: () =>
      api.post("/canned-messages", {
        shortcode: normalized,
        body: body.trim(),
      }),
    onSuccess: () => {
      toast.success("Canned message saved");
      setShortcode("");
      setBody("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/canned-messages/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      setPendingDelete(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const rows = useMemo(() => canned.data?.data ?? [], [canned.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) => row.shortcode.includes(q) || row.body.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <>
      <PageHeader
        title="Canned Message"
        description="Saved replies your agents can insert in the inbox by typing / followed by the shortcode."
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* ------------------------------------------------------- composer */}
        <div className="space-y-5 xl:sticky xl:top-4">
          <SettingsSection
            icon={Plus}
            title="New canned message"
            description="Write it once, reuse it in every chat."
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (shortcodeInvalid) return;
                create.mutate();
              }}
              className="space-y-4"
            >
              <Field
                label="Shortcode"
                required
                error={
                  shortcodeInvalid
                    ? "Use up to 40 lowercase letters, numbers, dashes or underscores."
                    : undefined
                }
                hint={`Agents type /${normalized || "shortcode"} then space to insert it.`}
              >
                {({ id }) => (
                  <div className="relative">
                    <Slash
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                    />
                    <Input
                      id={id}
                      required
                      maxLength={40}
                      value={shortcode}
                      onChange={(e) => setShortcode(e.target.value)}
                      placeholder="thanks"
                      aria-invalid={shortcodeInvalid || undefined}
                      className="pl-9 font-mono"
                    />
                  </div>
                )}
              </Field>

              <Field label="Message" required>
                {({ id }) => (
                  <div className="space-y-1">
                    <Textarea
                      id={id}
                      required
                      rows={4}
                      maxLength={4096}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Thanks for reaching out! We'll get back to you shortly."
                    />
                    <div className="flex justify-end">
                      <CharCount value={body} max={4096} />
                    </div>
                  </div>
                )}
              </Field>

              <Button
                type="submit"
                className="w-full"
                loading={create.isPending}
                disabled={shortcodeInvalid || !normalized || !body.trim()}
              >
                {!create.isPending && <Plus size={16} />}
                Save canned message
              </Button>
            </form>
          </SettingsSection>

          {/* Chat preview of what the agent will insert. */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-brand-50/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <Zap size={13} className="text-primary" />
              Inbox preview
            </div>
            <div className="space-y-2 bg-[radial-gradient(circle_at_1px_1px,rgba(131,58,180,0.08)_1px,transparent_0)] bg-[length:16px_16px] p-4">
              <div className="w-fit rounded-xl bg-white px-3 py-1.5 font-mono text-xs text-primary shadow-soft ring-1 ring-brand-100">
                /{normalized || "shortcode"}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={body ? "body" : "empty"}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-50 px-3.5 py-2 text-sm text-foreground shadow-soft ring-1 ring-brand-100"
                >
                  <p className="whitespace-pre-wrap break-words">
                    {body || "Your message will appear here."}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                    now <CheckCheck size={12} className="text-primary" />
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* --------------------------------------------------------- library */}
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Your library</h2>
              <p className="text-sm text-muted-foreground">
                {canned.isSuccess
                  ? `${rows.length} ${rows.length === 1 ? "reply" : "replies"} saved`
                  : "Loading your replies…"}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search canned messages"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search replies…"
                className="h-10 pl-9"
              />
            </div>
          </div>

          {canned.isError ? (
            <div className="p-5">
              <ErrorState message="Could not load canned messages." onRetry={() => void canned.refetch()} />
            </div>
          ) : canned.isLoading ? (
            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No canned messages yet"
              description="Save the replies your team sends most often to answer faster."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matches"
              description={`Nothing matches “${search}”. Try a different word.`}
            />
          ) : (
            <motion.ul layout className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              <AnimatePresence initial={true}>
                {filtered.map((item, i) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: Math.min(i, 12) * 0.04 } }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                    whileHover={{ y: -3 }}
                    className="group flex flex-col rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:border-brand-200 hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex max-w-full items-center truncate rounded-lg bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-primary ring-1 ring-brand-100">
                        /{item.shortcode}
                      </span>
                      <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-60 sm:group-hover:opacity-100">
                        <CopyButton value={item.body} label={`Copy /${item.shortcode}`} toastLabel="Reply copied" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Delete /${item.shortcode}`}
                          onClick={() => setPendingDelete(item)}
                        >
                          <Trash2 size={15} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap break-words text-sm text-foreground/80">
                      {item.body}
                    </p>
                    <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                      Added {timeAgo(item.created_at, "recently")}
                    </p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        loading={remove.isPending}
        title="Delete this canned message?"
        description={
          pendingDelete ? (
            <>
              Agents will no longer be able to insert <b>/{pendingDelete.shortcode}</b>. This can&apos;t be
              undone.
            </>
          ) : undefined
        }
      />
    </>
  );
}
