import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { matchOptInKeyword, type OptInOutcome } from "./flow-logic.js";

export type { OptInOutcome };

/**
 * Applies STOP/START keywords to a contact's marketing consent.
 *
 * Returns which action was taken so the caller can skip chatbot automation —
 * replying to someone who just asked to be left alone would defeat the point.
 */
export async function applyOptInKeywords(
  organizationId: string,
  contactId: string,
  messageText: string,
): Promise<OptInOutcome> {
  const outcome = matchOptInKeyword(messageText);
  if (!outcome) return null;

  try {
    await supabaseAdmin
      .from("contacts")
      .update({ opt_in_status: outcome, opt_in_updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("id", contactId);

    await supabaseAdmin.from("opt_in_events").insert({
      organization_id: organizationId,
      contact_id: contactId,
      event: outcome,
      source: "keyword",
      keyword: messageText.trim().toLowerCase(),
    });

    logger.info({ organizationId, contactId, outcome }, "Opt-in status changed by keyword");
    return outcome;
  } catch (err) {
    logger.error({ err, organizationId, contactId }, "Failed to apply opt-in keyword");
    return null;
  }
}
