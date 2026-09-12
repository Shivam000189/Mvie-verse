import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { env } from "./config/env";
import { sendSuccess } from "./utils/api-response";
import movieRoutes from "./routes/movie.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

// 1. CORS Configuration
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);

      if (env.corsOrigins.length === 0) {
        return callback(null, true);
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

// 2. Request Body Parsing
app.use(express.json({ limit: "1mb" }));

// 3. Root Endpoint
app.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Movie Discovery API is running" });
});

// 4. Health Check Endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 5. Application Feature Routes
app.use("/api/movies", movieRoutes);
app.use("/api/wishlist", wishlistRoutes);

// 6. 404 Not Found Middleware (catches unhandled routes)
app.use(notFoundMiddleware);

// 7. Global Error Handler Middleware
app.use(errorMiddleware);

export default app;
