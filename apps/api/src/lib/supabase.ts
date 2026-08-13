import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

/**
 * Service-role client — bypasses RLS. Every query made through it MUST scope by
 * `organization_id` explicitly; tenancy is not enforced for us here.
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** Client bound to an end-user's JWT, so RLS applies as a second line of defence. */
export function supabaseForUser(accessToken: string) {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}
