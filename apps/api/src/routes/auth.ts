import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";
import { badRequest, unauthorized } from "../lib/errors.js";

export const authRouter = Router();

const bootstrapSchema = z.object({
  organizationName: z.string().min(2).max(120),
  phone: z.string().optional(),
  country: z.string().length(2).optional(),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Creates the organization for a freshly signed-up user and makes them its
 * owner. Idempotent: a user who already belongs to an org gets that one back,
 * so a retried or double-submitted signup cannot create duplicates.
 */
authRouter.post(
  "/bootstrap",
  validateBody(bootstrapSchema),
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized("Missing bearer token");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
      header.slice("Bearer ".length),
    );
    if (userError || !userData.user) throw unauthorized("Invalid or expired token");
    const user = userData.user;

    const { data: existing } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.json({ organizationId: existing.organization_id, created: false });
    }

    const body = req.body as z.infer<typeof bootstrapSchema>;

    // Normally a DB trigger mirrors new auth.users rows into public.users, but
    // that trigger only fires on insert — a user created directly via the
    // Admin API (or before the trigger existed) would otherwise have no row
    // here, which fails the organization_members foreign key below.
    await supabaseAdmin
      .from("users")
      .upsert(
        { id: user.id, email: user.email ?? "", name: (user.user_metadata?.name as string) ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      );

    // Append a short suffix so two businesses with the same name can coexist.
    const slug = `${slugify(body.organizationName)}-${Math.random().toString(36).slice(2, 7)}`;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: body.organizationName,
        slug,
        plan: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        is_demo: true,
      })
      .select("id")
      .single();

    if (orgError || !org) throw badRequest("Could not create organization", orgError);

    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: user.id, role: "owner" });

    if (memberError) {
      // Roll back so a failed membership does not strand an orphan org.
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      throw badRequest("Could not create membership", memberError);
    }

    if (body.phone || body.country) {
      await supabaseAdmin
        .from("users")
        .update({ phone: body.phone ?? null, country: body.country ?? null })
        .eq("id", user.id);
    }

    res.status(201).json({ organizationId: org.id, created: true });
  }),
);
