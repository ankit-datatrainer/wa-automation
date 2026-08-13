import { Queue } from "bullmq";
import { isRedisAvailable, QUEUE_NAMES, redisConnection } from "./connection.js";
import { logger } from "../lib/logger.js";

export interface CampaignJob {
  campaignId: string;
  organizationId: string;
}

let queue: Queue<CampaignJob> | null = null;

/** Created lazily so no connection is attempted when Redis is absent. */
function getQueue(): Queue<CampaignJob> {
  queue ??= new Queue<CampaignJob>(QUEUE_NAMES.campaign, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800 },
    },
  });
  return queue;
}

/** Guards against the same campaign being run twice concurrently in-process. */
const inFlight = new Set<string>();

/**
 * Queues a campaign for delivery.
 *
 * With Redis present this goes through BullMQ, gaining retries and durability.
 * Without it the campaign is run in the background of this process instead, so
 * local development still works — at the cost of losing in-flight work if the
 * process restarts, which is why a warning is emitted.
 */
export async function enqueueCampaign(campaignId: string, organizationId: string) {
  if (isRedisAvailable()) {
    // jobId keyed on the campaign so a double-click cannot enqueue it twice.
    return getQueue().add(
      "send",
      { campaignId, organizationId },
      { jobId: `campaign:${campaignId}` },
    );
  }

  if (inFlight.has(campaignId)) {
    logger.warn({ campaignId }, "Campaign already running in-process; ignoring duplicate");
    return null;
  }

  logger.warn(
    { campaignId },
    "Running campaign in-process (no Redis) — progress is lost if the API restarts",
  );

  inFlight.add(campaignId);

  // Imported lazily to avoid a circular import at module load.
  const { runCampaign } = await import("./campaign-worker.js");

  void runCampaign(campaignId, organizationId)
    .catch((err) => logger.error({ err, campaignId }, "In-process campaign failed"))
    .finally(() => inFlight.delete(campaignId));

  return null;
}
