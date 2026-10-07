"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Gauge, MessagesSquare, Power, UserCog, UserPlus, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, HoverLift, SegmentedTabs, Stagger, StaggerItem, motion, ease } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Avatar, KpiTile, SearchField, timeAgo } from "../../platform/_components/ui";

interface Agent {
  id: string;
  role: string;
  isOnline: boolean;
  lastActiveAt: string | null;
  user: { id: string; name: string | null; email: string } | null;
  openConversations: number;
}

type Filter = "all" | "online" | "offline";

export default function AgentsLoginPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  // Presence the current user last set from this page, for when they are
  // not on the agent roster themselves (owners and admins).
  const [localPresence, setLocalPresence] = useState<boolean | null>(null);

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get<{ data: Agent[] }>("/admin/agents"),
  });

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user?: { id: string; name: string | null; email: string } }>("/me"),
    staleTime: 60_000,
  });

  const setPresence = useMutation({
    mutationFn: (isOnline: boolean) => api.post("/admin/presence", { isOnline }),
    onSuccess: (_, isOnline) => {
      setLocalPresence(isOnline);
      toast.success(isOnline ? "You are now online" : "You are now offline");
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update presence"),
  });

  const rows = agents.data?.data ?? [];
  const myRow = rows.find((a) => a.user?.id && a.user.id === me.data?.user?.id);
  const myPresence = myRow ? myRow.isOnline : localPresence;

  const online = rows.filter((a) => a.isOnline).length;
  const openTotal = rows.reduce((sum, a) => sum + a.openConversations, 0);
  const maxLoad = Math.max(1, ...rows.map((a) => a.openConversations));

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (filter === "online" && !a.isOnline) return false;
      if (filter === "offline" && a.isOnline) return false;
      if (!term) return true;
      return [a.user?.name, a.user?.email, a.role].some((v) => v?.toLowerCase().includes(term));
    });
  }, [rows, filter, search]);

  return (
    <>
      <PageHeader
        title="Agents Login"
        description="Who is available to take conversations, and how many each one is handling."
        onRefresh={() => void agents.refetch()}
        refreshing={agents.isFetching}
        actions={
          <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
            <UserPlus size={16} />
            Invite agents
          </Link>
        }
      />

      {/* My availability */}
      <FadeIn>
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-brand-gradient p-5 text-white shadow-glow sm:p-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-[0.1]" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                <Power size={24} />
                {myPresence && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-white" />
                  </span>
                )}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/75">My availability</p>
                <p className="font-display text-xl font-bold">
                  {myPresence === null
                    ? "Set your status"
                    : myPresence
                      ? "You're online and receiving chats"
                      : "You're offline"}
                </p>
              </div>
            </div>
            <div role="group" aria-label="My availability" className="inline-flex rounded-2xl bg-white/15 p-1 backdrop-blur">
              {[
                { value: true, label: "Online", icon: Wifi },
                { value: false, label: "Offline", icon: WifiOff },
              ].map((opt) => {
                const active = myPresence === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={active}
                    disabled={setPresence.isPending}
                    onClick={() => setPresence.mutate(opt.value)}
                    className={cn(
                      "relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-70",
                      active ? "text-brand-700" : "text-white hover:bg-white/10",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="my-presence"
                        className="absolute inset-0 rounded-xl bg-white shadow-soft"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <opt.icon size={15} />
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FadeIn>

      <Stagger className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={UserCog} label="Agents" value={rows.length} loading={agents.isLoading} sublabel="Agents & managers" />
        <KpiTile icon={Wifi} label="Online now" value={online} loading={agents.isLoading} tone="success" sublabel="Ready for chats" />
        <KpiTile icon={MessagesSquare} label="Open conversations" value={openTotal} loading={agents.isLoading} sublabel="Assigned to agents" />
        <KpiTile
          icon={Gauge}
          label="Avg. load"
          value={online > 0 ? openTotal / online : 0}
          format={(n) => n.toFixed(1)}
          loading={agents.isLoading}
          sublabel="Open chats per online agent"
        />
      </Stagger>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <SearchField label="Search agents" placeholder="Search agents by name or email…" value={search} onChange={setSearch} />
          <div className="scrollbar-none overflow-x-auto">
            <SegmentedTabs<Filter>
              layoutId="agents-filter"
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: "all", label: `All (${rows.length})` },
                { value: "online", label: `Online (${online})` },
                { value: "offline", label: `Offline (${rows.length - online})` },
              ]}
            />
          </div>
        </div>

        {agents.isError ? (
          <div className="p-4">
            <ErrorState message="Could not load agents." onRetry={() => void agents.refetch()} />
          </div>
        ) : agents.isLoading ? (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No agents yet"
            description="Invite teammates with the Agent or Manager role to staff your inbox."
            action={
              <Link href="/admin/users" className={buttonVariants()}>
                <UserPlus size={16} />
                Invite agents
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">No agents match this filter.</p>
        ) : (
          <Stagger key={filter} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.04}>
            {visible.map((agent) => {
                const isMe = !!myRow && agent.id === myRow.id;
                const loadPct = (agent.openConversations / maxLoad) * 100;
                return (
                  <StaggerItem key={agent.id} layout>
                    <HoverLift className="h-full">
                      <div
                        className={cn(
                          "h-full rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:shadow-lift",
                          agent.isOnline && "border-emerald-200/70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={agent.user?.name ?? agent.user?.email} size="lg" online={agent.isOnline} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-semibold">
                                <span className="truncate">{agent.user?.name ?? "Unnamed"}</span>
                                {isMe && <Badge tone="brand">You</Badge>}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{agent.user?.email}</p>
                            </div>
                          </div>
                          <Badge tone={agent.isOnline ? "success" : "neutral"}>
                            {agent.isOnline ? "Online" : "Offline"}
                          </Badge>
                        </div>

                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-muted-foreground">Open conversations</span>
                            <span className="font-bold tabular-nums">{agent.openConversations}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              className="h-full rounded-full bg-brand-gradient"
                              initial={{ width: 0 }}
                              animate={{ width: `${loadPct}%` }}
                              transition={{ duration: 0.8, ease }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                          <Badge tone="neutral" className="capitalize">
                            {agent.role}
                          </Badge>
                          <span
                            className="inline-flex items-center gap-1"
                            title={agent.lastActiveAt ? new Date(agent.lastActiveAt).toLocaleString() : undefined}
                          >
                            <Clock size={12} />
                            {agent.isOnline ? "Active now" : `Last active ${timeAgo(agent.lastActiveAt)}`}
                          </span>
                        </div>
                      </div>
                    </HoverLift>
                  </StaggerItem>
                );
              })}
          </Stagger>
        )}
      </Card>
    </>
  );
}
