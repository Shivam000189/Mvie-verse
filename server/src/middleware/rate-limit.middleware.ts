import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";

export interface RateLimiterOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max allowed requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly message: string;
  private readonly keyGenerator: (req: Request) => string;
  private readonly clients: Map<string, ClientRecord> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message =
      options.message ?? "Too many requests from this IP, please try again later.";
    this.keyGenerator =
      options.keyGenerator ??
      ((req: Request) => req.ip || req.socket.remoteAddress || "unknown-ip");

    // Periodic cleanup every 1 minute to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref(); // Do not block process exit
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.clients.entries()) {
      if (now > record.resetTime) {
        this.clients.delete(key);
      }
    }
  }

  public reset(): void {
    this.clients.clear();
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const clientKey = this.keyGenerator(req);
      const record = this.clients.get(clientKey);

      if (!record || now > record.resetTime) {
        // First request in a new window
        const resetTime = now + this.windowMs;
        this.clients.set(clientKey, { count: 1, resetTime });

        res.setHeader("RateLimit-Limit", this.maxRequests);
        res.setHeader("RateLimit-Remaining", this.maxRequests - 1);
        res.setHeader("RateLimit-Reset", Math.ceil(resetTime / 1000));
        return next();
      }

      if (record.count >= this.maxRequests) {
        const remainingSeconds = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader("RateLimit-Limit", this.maxRequests);
        res.setHeader("RateLimit-Remaining", 0);
        res.setHeader("RateLimit-Reset", Math.ceil(record.resetTime / 1000));
        res.setHeader("Retry-After", remainingSeconds);

        return next(
          new AppError(this.message, 429, "RATE_LIMITED", {
            retryAfterSeconds: remainingSeconds,
          })
        );
      }

      // Increment count
      record.count++;
      res.setHeader("RateLimit-Limit", this.maxRequests);
      res.setHeader("RateLimit-Remaining", this.maxRequests - record.count);
      res.setHeader("RateLimit-Reset", Math.ceil(record.resetTime / 1000));
      return next();
    };
  }
}

// 1. General API Rate Limiter: 100 requests per 15 minutes per IP
export const generalApiLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  message: "API rate limit exceeded. Please try again later.",
});

// 2. Wishlist Mutation Limiter: 30 mutation requests per minute per IP
export const wishlistMutationLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Wishlist modification rate limit exceeded. Please slow down.",
});
