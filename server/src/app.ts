import express from "express";
import cors from "cors";
import compression from "compression";
import type { Request, Response } from "express";
import { env, isProduction } from "./config/env";
import { sendSuccess } from "./utils/api-response";
import movieRoutes from "./routes/movie.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import chatRoutes from "./routes/chat.routes";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { requestLoggerMiddleware } from "./middleware/logger.middleware";
import { securityHeadersMiddleware } from "./middleware/security.middleware";
import { generalApiLimiter } from "./middleware/rate-limit.middleware";

const app = express();

// 1. Disable fingerprinting header
app.disable("x-powered-by");

// 2. HTTP Security Headers (OWASP-recommended headers)
app.use(securityHeadersMiddleware);

// 3. Performance & Compression Middleware (gzip/deflate for JSON responses)
app.use(compression());

// 4. HTTP Request Performance & Duration Logger
app.use(requestLoggerMiddleware);

// 5. CORS Configuration
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // In development, permit localhost ports
      if (!isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      if (env.corsOrigins.length === 0) {
        return callback(null, !isProduction);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (env.corsOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// 6. Request Body Parsing (Strictly bounded to 10kb to prevent payload memory exhaustion)
app.use(express.json({ limit: "10kb" }));

// 7. Root & Health Check Endpoints (Lightweight, excluded from strict rate limiting)
app.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Movie Discovery API is running" });
});

app.get("/api/health", (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 8. Application Rate Limiting (Protects API discovery and wishlist endpoints)
app.use("/api", generalApiLimiter.middleware());

// 9. Application Feature Routes
app.use("/api/movies", movieRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/chat", chatRoutes);

// 10. 404 Not Found Middleware (catches unhandled routes)
app.use(notFoundMiddleware);

// 11. Global Centralized Error Handler Middleware
app.use(errorMiddleware);

export default app;
