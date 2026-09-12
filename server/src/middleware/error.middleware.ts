import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { TmdbError } from "../utils/tmdb-error";
import { sendError } from "../utils/api-response";

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

  // 2. Prisma Database Errors (Prevents leaking SQL / database connection details)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`🔥 [Prisma Known Error ${err.code}]:`, err.message);

    if (err.code === "P2002") {
      sendError(res, "Movie is already in the wishlist.", 409, "MOVIE_ALREADY_IN_WISHLIST");
      return;
    }

    if (err.code === "P2025") {
      sendError(res, "Wishlist item not found", 404, "WISHLIST_ITEM_NOT_FOUND");
      return;
    }

    sendError(res, "Unable to complete the database request.", 500, "DATABASE_ERROR");
    return;
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    console.error("🔥 [Prisma Initialization/Fatal Error]:", (err as Error).message);
    sendError(res, "Database service is temporarily unavailable.", 503, "DATABASE_ERROR");
    return;
  }

  // 3. Direct TMDB Errors (if uncaught in service layer)
  if (err instanceof TmdbError) {
    if (err.code === "TMDB_NOT_FOUND") {
      sendError(res, "Movie not found", 404, "MOVIE_NOT_FOUND");
      return;
    }

    if (err.code === "TMDB_RATE_LIMITED") {
      sendError(
        res,
        "Movie service is temporarily rate limited. Please try again later.",
        429,
        "MOVIE_SERVICE_RATE_LIMITED"
      );
      return;
    }

    sendError(res, "Movie service is temporarily unavailable", 503, "MOVIE_SERVICE_UNAVAILABLE");
    return;
  }

  // 4. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue?.message || "Invalid request parameters";
    sendError(res, message, 400, "INVALID_REQUEST", err.issues);
    return;
  }

  // 5. Payload Too Large (Body-parser size limit exceeded)
  if (
    typeof err === "object" &&
    err !== null &&
    (("type" in err && (err as { type: string }).type === "entity.too.large") ||
      ("status" in err && (err as { status: number }).status === 413))
  ) {
    sendError(res, "Request payload exceeds maximum allowed size (10kb)", 413, "PAYLOAD_TOO_LARGE");
    return;
  }

  // 6. Unexpected / Unhandled Server Errors (Safe generic fallback)
  console.error("🔥 [Unhandled Server Error]:", err);
  sendError(res, "An unexpected error occurred.", 500, "INTERNAL_SERVER_ERROR");
};
