import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error instanceof ZodError
        ? result.error.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
        : [{ path: "", message: "Invalid request body" }];
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}
