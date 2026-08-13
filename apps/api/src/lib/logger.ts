import pino from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.accessToken",
      "*.access_token",
      "*.permanent_token",
      "*.password",
    ],
    censor: "[redacted]",
  },
  base: { env: env.NODE_ENV },
});
