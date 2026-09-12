import { env } from "./config/env";
import app from "./app";
import { disconnectDatabase } from "./config/database";

const server = app.listen(env.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 Server running on port ${env.port}`);
  console.log(`🌍 Environment: ${env.nodeEnv}`);
  console.log(`🩺 Health check: http://localhost:${env.port}/api/health`);
  console.log(`=========================================`);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Gracefully closing HTTP server and database pool...`);

  server.close(async () => {
    try {
      await disconnectDatabase();
      console.log("Database connection pool closed.");
    } catch (err) {
      console.error("Error disconnecting database:", err);
    }
    console.log("HTTP server closed. Exiting process.");
    process.exit(0);
  });

  // Force close after 5 seconds if connections hang
  setTimeout(() => {
    console.error("Forcefully shutting down after timeout.");
    process.exit(1);
  }, 5000);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("🔥 [FATAL] Unhandled Promise Rejection:", reason);
  void shutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (error) => {
  console.error("🔥 [FATAL] Uncaught Exception:", error);
  void shutdown("UNCAUGHT_EXCEPTION");
});
