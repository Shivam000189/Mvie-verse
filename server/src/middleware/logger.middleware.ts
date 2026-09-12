import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight HTTP request duration and performance logger middleware.
 * Logs method, route path, status code, and execution time in milliseconds.
 * Safe for production (never logs sensitive headers, query params, or body payloads).
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const formattedDuration = durationMs.toFixed(2);

    const status = res.statusCode;
    const statusEmoji = status < 400 ? "⚡" : status < 500 ? "⚠️" : "🔥";

    // Only log in non-test environments or for slow/error requests
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `${statusEmoji} [HTTP] ${req.method} ${req.originalUrl || req.url} -> ${status} (${formattedDuration}ms)`
      );
    }
  });

  next();
};
