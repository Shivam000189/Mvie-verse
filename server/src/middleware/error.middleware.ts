import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { TmdbError } from "../utils/tmdb-error";
import { sendError } from "../utils/api-response";
import { isProduction } from "../config/env";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Handled Application Errors
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // 2. Direct TMDB Errors (if unhandled in service layer)
  if (err instanceof TmdbError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  // 3. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const firstMessage = err.issues[0]?.message || "Invalid input data";
    sendError(res, firstMessage, 400, "VALIDATION_ERROR", err.issues);
    return;
  }

  // 4. Unexpected / Unknown Server Errors
  console.error("🔥 [Unhandled Server Error]:", err);

  const message =
    !isProduction && err instanceof Error
      ? err.message
      : "Internal Server Error";

  sendError(res, message, 500, "INTERNAL_SERVER_ERROR");
};
