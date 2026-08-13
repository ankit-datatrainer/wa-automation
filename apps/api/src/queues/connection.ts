import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export const QUEUE_NAMES = {
  campaign: "campaign-send",
  scheduler: "campaign-scheduler",
} as const;

/**
 * BullMQ needs `maxRetriesPerRequest: null` so its blocking commands are not
 * aborted mid-wait. `lazyConnect` lets us probe availability explicitly rather
 * than having ioredis retry a dead socket forever at boot.
 */
function createClient() {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (attempts) => (attempts > 10 ? null : Math.min(attempts * 200, 3000)),
  });
}

export const redisConnection = createClient();

// Attached before any connection attempt: ioredis emits an unhandled 'error'
// event (and would crash the process) if nothing is listening when the first
// connect fails. probeRedis replaces this with real reporting once it runs.
redisConnection.on("error", () => undefined);

let redisAvailable = false;

/** Whether the queue is backed by a real Redis, decided once at startup. */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Probes Redis once at boot.
 *
 * Returning false rather than throwing is deliberate: a missing Redis should
 * degrade campaign delivery to the in-process fallback, not stop the API from
 * serving the other ninety per cent of the product.
 */
export async function probeRedis(): Promise<boolean> {
  try {
    await redisConnection.connect();
    await redisConnection.ping();
    redisAvailable = true;

    redisConnection.on("error", (err) => {
      // Only log the first error after a healthy period; ioredis is chatty.
      if (redisAvailable) {
        redisAvailable = false;
        logger.error({ err }, "Redis connection lost — falling back to in-process execution");
      }
    });

    redisConnection.on("ready", () => {
      if (!redisAvailable) {
        redisAvailable = true;
        logger.info("Redis connection restored");
      }
    });

    logger.info("Redis connected — campaigns will run through BullMQ");
    return true;
  } catch (err) {
    redisAvailable = false;
    // Stop ioredis from retrying in the background and flooding the logs.
    redisConnection.disconnect();
    logger.warn(
      { url: env.REDIS_URL, err: (err as Error).message },
      "Redis unavailable — campaigns will run in-process. Start Redis for production-grade queueing.",
    );
    return false;
  }
}
