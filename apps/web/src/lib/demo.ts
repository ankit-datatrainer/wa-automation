/**
 * Development-only click-through mode. With NEXT_PUBLIC_DEMO_MODE=1 the web app
 * skips Supabase auth and sends the API's "demo" bearer token, so every page
 * can be exercised against an API running in its own demo mode (placeholder
 * Supabase URL). Never active in production builds.
 */
export const isWebDemo =
  process.env.NEXT_PUBLIC_DEMO_MODE === "1" && process.env.NODE_ENV !== "production";

export const DEMO_TOKEN = "demo";
