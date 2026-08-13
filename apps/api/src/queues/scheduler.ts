import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { enqueueCampaign } from "./campaign-queue.js";
import { resumeDelayedExecutions } from "../services/flow-engine.js";

const TICK_MS = 60_000;

/**
 * Polls for campaigns whose scheduled time has arrived and enqueues them.
 * A minute of granularity is enough, and polling keeps the dispatcher stateless
 * so several API instances can run it without coordination — the queue's
 * campaign-keyed jobId dedupes any overlap.
 */
export function startScheduler() {
  const tick = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from("campaigns")
        .select("id, organization_id")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString())
        .limit(50);

      if (error) throw error;

      for (const campaign of data ?? []) {
        const { error: claimError } = await supabaseAdmin
          .from("campaigns")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", campaign.id)
          // Only the instance that flips it out of `scheduled` proceeds.
          .eq("status", "scheduled");

        if (claimError) {
          logger.warn({ err: claimError, campaignId: campaign.id }, "Could not claim campaign");
          continue;
        }

        await enqueueCampaign(campaign.id, campaign.organization_id);
        logger.info({ campaignId: campaign.id }, "Scheduled campaign dispatched");
      }
    } catch (err) {
      logger.error({ err }, "Scheduler tick failed");
    }

    // Chatbot flows parked on a delay step resume on the same cadence.
    try {
      const resumed = await resumeDelayedExecutions();
      if (resumed > 0) logger.info({ resumed }, "Resumed delayed chatbot executions");
    } catch (err) {
      logger.error({ err }, "Chatbot resume tick failed");
    }
  };

  const interval = setInterval(() => void tick(), TICK_MS);
  void tick();

  return () => clearInterval(interval);
}
