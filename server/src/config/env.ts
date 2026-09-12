import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const parseOrigins = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
};

const corsOriginEnv =
  process.env.CORS_ORIGINS ??
  process.env.CORS_ORIGIN ??
  process.env.FRONTEND_URL ??
  process.env.CLIENT_URL;

/**
 * Environment configuration schema with startup validation.
 * Conditionally enforces TMDB credentials only when MOVIE_PROVIDER is 'tmdb'.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().default(""),
    MOVIE_PROVIDER: z.enum(["mock", "tmdb"]).default("tmdb"),
    TMDB_API_KEY: z.string().optional().default(""),
    TMDB_ACCESS_TOKEN: z.string().optional().default(""),
    TMDB_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
    TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p"),
    TMDB_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

    // Rate Limiting Configuration (Configurable thresholds)
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
    WISHLIST_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000), // 1 minute
    WISHLIST_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(30),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000), // 15 minutes
    AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(5),
    AUTH_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(1000), // 1 second base delay
  })
  .superRefine((data, ctx) => {
    // Only require TMDB credentials if TMDB provider is explicitly chosen
    if (data.MOVIE_PROVIDER === "tmdb" && !data.TMDB_API_KEY && !data.TMDB_ACCESS_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "TMDB_API_KEY or TMDB_ACCESS_TOKEN is required when MOVIE_PROVIDER is 'tmdb'",
        path: ["TMDB_API_KEY"],
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.warn("⚠️ [Environment Notice]:");
  parsedEnv.error.issues.forEach((issue) => {
    console.warn(`  - ${issue.path.join(".") || "ENV"}: ${issue.message}`);
  });
}

const safeData = parsedEnv.success
  ? parsedEnv.data
  : {
      NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") ?? "development",
      PORT: Number(process.env.PORT ?? 5000),
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      MOVIE_PROVIDER: (process.env.MOVIE_PROVIDER as "mock" | "tmdb") ?? "mock",
      TMDB_API_KEY: process.env.TMDB_API_KEY ?? "",
      TMDB_ACCESS_TOKEN: process.env.TMDB_ACCESS_TOKEN ?? "",
      TMDB_BASE_URL: process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3",
      TMDB_IMAGE_BASE_URL: process.env.TMDB_IMAGE_BASE_URL ?? "https://image.tmdb.org/t/p",
      TMDB_TIMEOUT_MS: Number(process.env.TMDB_TIMEOUT_MS ?? 8000),
      RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
      RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
      WISHLIST_RATE_LIMIT_WINDOW_MS: Number(process.env.WISHLIST_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
      WISHLIST_RATE_LIMIT_MAX_REQUESTS: Number(process.env.WISHLIST_RATE_LIMIT_MAX_REQUESTS ?? 30),
      AUTH_RATE_LIMIT_WINDOW_MS: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
      AUTH_RATE_LIMIT_MAX_REQUESTS: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ?? 5),
      AUTH_BACKOFF_BASE_MS: Number(process.env.AUTH_BACKOFF_BASE_MS ?? 1000),
    };

export const env = {
  nodeEnv: safeData.NODE_ENV,
  port: safeData.PORT,
  corsOrigins: parseOrigins(corsOriginEnv),
  databaseUrl: safeData.DATABASE_URL,
  movieProvider: safeData.MOVIE_PROVIDER,
  tmdb: {
    apiKey: safeData.TMDB_API_KEY,
    accessToken: safeData.TMDB_ACCESS_TOKEN,
    baseUrl: safeData.TMDB_BASE_URL,
    imageBaseUrl: safeData.TMDB_IMAGE_BASE_URL,
    timeoutMs: safeData.TMDB_TIMEOUT_MS,
  },
  rateLimit: {
    general: {
      windowMs: safeData.RATE_LIMIT_WINDOW_MS,
      maxRequests: safeData.RATE_LIMIT_MAX_REQUESTS,
    },
    wishlist: {
      windowMs: safeData.WISHLIST_RATE_LIMIT_WINDOW_MS,
      maxRequests: safeData.WISHLIST_RATE_LIMIT_MAX_REQUESTS,
    },
    auth: {
      windowMs: safeData.AUTH_RATE_LIMIT_WINDOW_MS,
      maxRequests: safeData.AUTH_RATE_LIMIT_MAX_REQUESTS,
      backoffBaseMs: safeData.AUTH_BACKOFF_BASE_MS,
    },
  },
};

export const isProduction = env.nodeEnv === "production";
