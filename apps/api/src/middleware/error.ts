import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { isProd } from "../config/env.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express identifies error handlers by arity, so `next` must stay.
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProd ? "Something went wrong" : describeError(err),
    },
  });
}

/**
 * Supabase rejects with a plain object rather than an Error, so String(err)
 * yields a useless "[object Object]". Pull out the fields it actually carries.
 */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    if (e.message) {
      return [e.message, e.details, e.hint].filter(Boolean).join(" — ") +
        (e.code ? ` (${e.code})` : "");
    }
    try {
      return JSON.stringify(err);
    } catch {
      return "Unserializable error";
    }
  }

  return String(err);
}
