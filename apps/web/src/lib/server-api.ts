import { createClient } from "./supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Server-side API fetch that forwards the caller's Supabase access token.
 * Returns null instead of throwing so layouts can degrade to a signed-out or
 * not-yet-bootstrapped state rather than crashing the whole route.
 */
export async function serverFetch<T>(path: string): Promise<T | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return null;

  try {
    const response = await fetch(`${BASE_URL}/api${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // API unreachable — the shell still renders, individual panels show errors.
    return null;
  }
}
