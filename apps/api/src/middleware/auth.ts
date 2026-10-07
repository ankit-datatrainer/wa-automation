import type { NextFunction, Request, Response } from "express";
import type { Role } from "@wa/types";
import { forbidden, unauthorized } from "../lib/errors.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { demoAuth, isDemoMode } from "../lib/demo.js";

export interface AuthContext {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  permissions: string[];
  accessToken: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/** Roles ranked so `requireRole("manager")` also admits admins and owners. */
const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  agent: 1,
};

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (isDemoMode) {
    req.auth = { ...demoAuth };
    return next();
  }

  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw unauthorized("Missing bearer token");
    }
    const accessToken = header.slice("Bearer ".length);

    // The fake "demo" session is a development convenience only; in
    // production it would be an unauthenticated owner login.
    if (accessToken === "demo" && process.env.NODE_ENV !== "production") {
      req.auth = { ...demoAuth };
      return next();
    }

    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) {
      throw unauthorized("Invalid or expired token");
    }

    // An organization may be selected explicitly when a user belongs to several.
    const requestedOrg = req.headers["x-organization-id"];
    let query = supabaseAdmin
      .from("organization_members")
      .select("organization_id, role, permissions")
      .eq("user_id", data.user.id);

    if (typeof requestedOrg === "string" && requestedOrg) {
      query = query.eq("organization_id", requestedOrg);
    }

    const { data: membership, error: memberError } = await query
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!membership) {
      throw forbidden("You are not a member of this organization");
    }

    // A suspended tenant is locked out entirely, except for super admins, who
    // still need access in order to investigate and lift the suspension.
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("is_suspended, suspended_reason")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (org?.is_suspended) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("is_super_admin")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile?.is_super_admin) {
        throw forbidden(
          org.suspended_reason
            ? `This account is suspended: ${org.suspended_reason}`
            : "This account is suspended. Please contact support.",
        );
      }
    }

    req.auth = {
      userId: data.user.id,
      email: data.user.email ?? "",
      organizationId: membership.organization_id,
      role: membership.role as Role,
      permissions: (membership.permissions as string[]) ?? [],
      accessToken,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(minimum: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (ROLE_RANK[req.auth.role] < ROLE_RANK[minimum]) {
      return next(forbidden(`Requires ${minimum} role or higher`));
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    // Owners and admins hold every permission implicitly.
    if (req.auth.role === "owner" || req.auth.role === "admin") return next();
    if (!req.auth.permissions.includes(permission)) {
      return next(forbidden(`Missing permission: ${permission}`));
    }
    next();
  };
}
