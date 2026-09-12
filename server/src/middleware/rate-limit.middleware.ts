import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
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

/**
 * Advanced Rate Limiter with Exponential Backoff for Sensitive / Auth Routes.
 * Combines per-IP and per-account limits with progressive backoff delays
 * rather than hard permanent lockouts.
 */
export interface ExponentialBackoffOptions {
  windowMs: number;
  maxAttempts: number;
  backoffBaseMs: number; // Base delay in ms (e.g. 1000ms = 1s, doubles per failed attempt)
  maxBackoffMs?: number; // Cap maximum backoff delay (e.g. 15 minutes)
  accountKeyExtractor?: (req: Request) => string | undefined;
}

interface AuthAttemptRecord {
  attempts: number;
  lastAttemptTime: number;
  blockedUntil: number;
  windowResetTime: number;
}

export class ExponentialBackoffRateLimiter {
  private readonly windowMs: number;
  private readonly maxAttempts: number;
  private readonly backoffBaseMs: number;
  private readonly maxBackoffMs: number;
  private readonly accountKeyExtractor?: (req: Request) => string | undefined;
  private readonly records: Map<string, AuthAttemptRecord> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: ExponentialBackoffOptions) {
    this.windowMs = options.windowMs;
    this.maxAttempts = options.maxAttempts;
    this.backoffBaseMs = options.backoffBaseMs;
    this.maxBackoffMs = options.maxBackoffMs ?? 15 * 60 * 1000;
    this.accountKeyExtractor = options.accountKeyExtractor;

    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.windowResetTime && now > record.blockedUntil) {
        this.records.delete(key);
      }
    }
  }

  public recordFailure(key: string): number {
    const now = Date.now();
    const record = this.records.get(key) || {
      attempts: 0,
      lastAttemptTime: now,
      blockedUntil: 0,
      windowResetTime: now + this.windowMs,
    };

    if (now > record.windowResetTime) {
      record.attempts = 1;
      record.windowResetTime = now + this.windowMs;
    } else {
      record.attempts++;
    }

    record.lastAttemptTime = now;

    if (record.attempts >= this.maxAttempts) {
      // Exponential backoff: backoffBase * 2^(attempts - maxAttempts)
      const exponent = record.attempts - this.maxAttempts;
      const backoffDuration = Math.min(
        this.backoffBaseMs * Math.pow(2, exponent),
        this.maxBackoffMs
      );
      record.blockedUntil = now + backoffDuration;
    }

    this.records.set(key, record);
    return record.blockedUntil > now ? Math.ceil((record.blockedUntil - now) / 1000) : 0;
  }

  public resetKey(key: string): void {
    this.records.delete(key);
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
      const accountId = this.accountKeyExtractor ? this.accountKeyExtractor(req) : undefined;

      // Check both IP key and Account key
      const keysToCheck = [`ip:${ip}`];
      if (accountId) {
        keysToCheck.push(`acc:${accountId}`);
      }

      for (const key of keysToCheck) {
        const record = this.records.get(key);
        if (record && record.blockedUntil > now) {
          const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
          res.setHeader("Retry-After", remainingSeconds);
          return next(
            new AppError(
              `Too many authentication attempts. Please try again in ${remainingSeconds} second(s).`,
              429,
              "AUTH_RATE_LIMITED",
              { retryAfterSeconds: remainingSeconds }
            )
          );
        }
      }

      return next();
    };
  }
}

// 1. General API Rate Limiter: Configurable (Default: 100 requests per 15 minutes per IP)
export const generalApiLimiter = new InMemoryRateLimiter({
  windowMs: env.rateLimit.general.windowMs,
  maxRequests: env.rateLimit.general.maxRequests,
  message: "API rate limit exceeded. Please try again later.",
});

// 2. Wishlist Mutation Limiter: Configurable (Default: 30 mutation requests per minute per IP)
export const wishlistMutationLimiter = new InMemoryRateLimiter({
  windowMs: env.rateLimit.wishlist.windowMs,
  maxRequests: env.rateLimit.wishlist.maxRequests,
  message: "Wishlist modification rate limit exceeded. Please slow down.",
});

// 3. Auth Route Limiter with Exponential Backoff (Per-IP & Per-Account)
export const authRateLimiter = new ExponentialBackoffRateLimiter({
  windowMs: env.rateLimit.auth.windowMs,
  maxAttempts: env.rateLimit.auth.maxRequests,
  backoffBaseMs: env.rateLimit.auth.backoffBaseMs,
  accountKeyExtractor: (req: Request) => {
    if (req.body && typeof req.body === "object") {
      const body = req.body as Record<string, unknown>;
      return (body.email as string) || (body.username as string) || undefined;
    }
    return undefined;
  },
});
