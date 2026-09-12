import dotenv from "dotenv";

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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  corsOrigins: parseOrigins(corsOriginEnv),
  databaseUrl: process.env.DATABASE_URL ?? "",
  tmdb: {
    apiKey: process.env.TMDB_API_KEY ?? "",
    accessToken: process.env.TMDB_ACCESS_TOKEN ?? "",
    baseUrl: process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3",
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL ?? "https://image.tmdb.org/t/p",
    timeoutMs: Number(process.env.TMDB_TIMEOUT_MS ?? 8000),
  },
};

export const isProduction = env.nodeEnv === "production";
