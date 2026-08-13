import { redirect } from "next/navigation";
import { AppShell, type ShellSession } from "@/components/layout/app-shell";
import { serverFetch } from "@/lib/server-api";

interface MeResponse {
  user: { id: string; email: string; name: string | null };
  organization: { id: string; name: string };
  membership: { role: string; permissions: string[] };
  isSuperAdmin?: boolean;
  waba: { displayPhone: string; status: string } | null;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await serverFetch<MeResponse>("/me");

  // No membership yet means signup completed but the org was never created.
  if (!me) redirect("/onboarding");

  const session: ShellSession = {
    userName: me.user.name ?? me.user.email,
    role: me.membership.role,
    permissions: me.membership.permissions,
    isSuperAdmin: me.isSuperAdmin ?? false,
    connectedPhone: me.waba?.displayPhone ?? null,
    isLive: me.waba?.status === "connected",
    unreadNotifications: 0,
  };

  return <AppShell session={session}>{children}</AppShell>;
}
