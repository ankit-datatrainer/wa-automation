import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthorized } from "../lib/errors.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

/**
 * Gate for platform-level routes that cross tenant boundaries.
 *
 * Deliberately re-reads the flag from the database on every request rather than
 * trusting anything on the token, so revoking super-admin access takes effect
 * immediately instead of at the next token refresh.
 */
export async function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.auth) throw unauthorized();

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("is_super_admin")
      .eq("id", req.auth.userId)
      .maybeSingle();

    // Fail closed: if the flag cannot be read (missing column, transient DB
    // error) treat the caller as unprivileged rather than erroring out.
    if (error) {
      logger.error({ err: error, userId: req.auth.userId }, "Super-admin lookup failed");
      throw forbidden("Platform administrator access could not be verified");
    }

    if (!data?.is_super_admin) {
      logger.warn(
        { userId: req.auth.userId, path: req.path },
        "Blocked non-super-admin from platform route",
      );
      throw forbidden("Platform administrator access required");
    }

    next();
  } catch (err) {
    next(err);
  }
}

/** Records an action taken across tenants, for the platform audit trail. */
export async function recordPlatformAction(
  actorId: string,
  action: string,
  target?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin.from("platform_audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    metadata,
  });

  if (error) logger.error({ err: error, action }, "Failed to record platform action");
}
