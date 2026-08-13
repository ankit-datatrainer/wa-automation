import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

/** Replaces `req.body` with the parsed (and defaulted) value. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

/**
 * Validated query params land on `res.locals.query` because Express 5 makes
 * `req.query` a getter that cannot be reassigned.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    res.locals.query = result.data;
    next();
  };
}

export function getQuery<T>(res: Response): T {
  return res.locals.query as T;
}

/** Forwards rejected promises from async handlers into the error middleware. */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req as T, res, next).catch(next);
  };
}
