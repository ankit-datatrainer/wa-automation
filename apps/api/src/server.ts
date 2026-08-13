import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startCampaignWorker } from "./queues/campaign-worker.js";
import { startScheduler } from "./queues/scheduler.js";
import { probeRedis } from "./queues/connection.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`WA Automations API listening on http://localhost:${env.PORT}`);
});

// Decide the queue driver once, before anything tries to enqueue work.
const redisReady = await probeRedis();
const worker = redisReady ? startCampaignWorker() : null;
const stopScheduler = startScheduler();

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  stopScheduler();
  // Let the worker finish the message it is mid-send on before exiting.
  await worker?.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
