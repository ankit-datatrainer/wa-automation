import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { routes } from "./routes/index.js";
import { webhookRouter } from "./routes/webhooks.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(pinoHttp({ logger }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
    }),
  );

  // Meta signature verification needs the exact bytes, so webhooks mount before
  // the global JSON parser and keep their own raw-body parser.
  app.use("/webhooks", webhookRouter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), env: env.NODE_ENV });
  });

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
    }),
    routes,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
