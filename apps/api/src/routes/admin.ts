import { Router } from "express";
import { z } from "zod";
import { inviteMemberSchema, ROLES } from "@wa/types";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);

/** Every permission the User and Permission Manager can grant. */
export const PERMISSIONS = [
  "inbox.view",
  "inbox.send",
  "inbox.assign",
  "contacts.view",
  "contacts.edit",
  "contacts.delete",
  "templates.view",
  "templates.edit",
  "campaigns.view",
  "campaigns.send",
  "chatbots.view",
  "chatbots.edit",
  "analytics.view",
  "billing.view",
  "billing.manage",
  "admin.users",
  "admin.agents",
  "settings.manage",
] as const;

adminRouter.get(
  "/permissions",
  asyncHandler(async (_req, res) => {
    res.json({ permissions: PERMISSIONS, roles: ROLES });
  }),
);

adminRouter.get(
  "/members",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("organization_members")
      .select("id, role, permissions, is_online, last_active_at, created_at, users(id, name, email, avatar_url)")
      .eq("organization_id", req.auth!.organizationId)
      .order("created_at");

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

/**
 * Invites a teammate. Supabase sends the invite email; the org membership is
 * created immediately so the seat shows up as pending in the UI.
 */
adminRouter.post(
  "/members",
  requireRole("admin"),
  validateBody(inviteMemberSchema),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const body = req.body as import("zod").infer<typeof inviteMemberSchema>;

    if (body.role === "owner") {
      throw badRequest("An organization can only have one owner");
    }

    const { data: invited, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(body.email);

    // An existing user can still be added to this org, so that is not fatal.
    let userId = invited?.user?.id;
    if (inviteError || !userId) {
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", body.email)
        .maybeSingle();

      if (!existing) throw badRequest(inviteError?.message ?? "Could not invite this user");
      userId = existing.id;
    }

    const { error } = await supabaseAdmin.from("organization_members").insert({
      organization_id: orgId,
      user_id: userId,
      role: body.role,
      permissions: body.permissions,
    });

    if (error?.code === "23505") throw conflict("This person is already a member");
    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      organization_id: orgId,
      actor_id: req.auth!.userId,
      action: "member.invited",
      resource_type: "organization_member",
      metadata: { email: body.email, role: body.role },
    });

    res.status(201).json({ userId });
  }),
);

adminRouter.patch(
  "/members/:id",
  requireRole("admin"),
  validateBody(
    z.object({
      role: z.enum(ROLES).optional(),
      permissions: z.array(z.string()).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;
    const body = req.body as { role?: string; permissions?: string[] };

    const { data: target } = await supabaseAdmin
      .from("organization_members")
      .select("role, user_id")
      .eq("organization_id", orgId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!target) throw notFound("Member");
    // The owner seat is fixed; transferring it is a separate, deliberate flow.
    if (target.role === "owner") throw forbidden("The owner's role cannot be changed here");
    if (body.role === "owner") throw badRequest("Ownership cannot be granted this way");

    const { error } = await supabaseAdmin
      .from("organization_members")
      .update({
        ...(body.role && { role: body.role }),
        ...(body.permissions && { permissions: body.permissions }),
      })
      .eq("organization_id", orgId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

adminRouter.delete(
  "/members/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.organizationId;

    const { data: target } = await supabaseAdmin
      .from("organization_members")
      .select("role, user_id")
      .eq("organization_id", orgId)
      .eq("id", req.params.id!)
      .maybeSingle();

    if (!target) throw notFound("Member");
    if (target.role === "owner") throw forbidden("The owner cannot be removed");
    if (target.user_id === req.auth!.userId) throw badRequest("You cannot remove yourself");

    const { error } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("id", req.params.id!);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

/** Agent roster and presence for the Agents Login page. */
adminRouter.get(
  "/agents",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("organization_members")
      .select("id, role, is_online, last_active_at, users(id, name, email)")
      .eq("organization_id", req.auth!.organizationId)
      .in("role", ["agent", "manager"])
      .order("is_online", { ascending: false });

    if (error) throw error;

    const memberIds = (data ?? [])
      .map((m) => toOne<{ id: string }>(m.users)?.id)
      .filter((id): id is string => !!id);

    // Open conversation counts drive assignment balance.
    const { data: assignments } = await supabaseAdmin
      .from("conversations")
      .select("assigned_to")
      .eq("organization_id", req.auth!.organizationId)
      .eq("status", "open")
      .in("assigned_to", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

    const load = new Map<string, number>();
    for (const row of assignments ?? []) {
      if (row.assigned_to) load.set(row.assigned_to, (load.get(row.assigned_to) ?? 0) + 1);
    }

    res.json({
      data: (data ?? []).map((member) => {
        const user = toOne<{ id: string; name: string | null; email: string }>(member.users);
        return {
          id: member.id,
          role: member.role,
          isOnline: member.is_online,
          lastActiveAt: member.last_active_at,
          user,
          openConversations: user ? (load.get(user.id) ?? 0) : 0,
        };
      }),
    });
  }),
);

/** Agents toggle their own availability. */
adminRouter.post(
  "/presence",
  validateBody(z.object({ isOnline: z.boolean() })),
  asyncHandler(async (req, res) => {
    const { isOnline } = req.body as { isOnline: boolean };

    const { error } = await supabaseAdmin
      .from("organization_members")
      .update({ is_online: isOnline, last_active_at: new Date().toISOString() })
      .eq("organization_id", req.auth!.organizationId)
      .eq("user_id", req.auth!.userId);

    if (error) throw error;
    res.sendStatus(204);
  }),
);

adminRouter.get(
  "/audit-logs",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at, users(name, email)")
      .eq("organization_id", req.auth!.organizationId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ data: data ?? [] });
  }),
);

function toOne<T>(relation: unknown): T | null {
  if (!relation) return null;
  return (Array.isArray(relation) ? (relation[0] ?? null) : relation) as T | null;
}
