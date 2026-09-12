import { env } from "./config/env";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    console.log("Database connected");
  } catch (err) {
    console.error("Database connection failed:", err);
    if (env.nodeEnv === "production") {
      process.exitCode = 1;
      return;
    }
  }

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    console.log(`Health route: http://localhost:${env.port}/api/health`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Closing server...`);

    server.close(async () => {
      try {
        await disconnectDatabase();
        console.log("Database disconnected.");
      } catch (err) {
        console.error("Error disconnecting database:", err);
      }
      console.log("Server closed.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forcefully shutting down after timeout.");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] Unhandled Promise Rejection:", reason);
    void shutdown("UNHANDLED_REJECTION");
  });

  process.on("uncaughtException", (error) => {
    console.error("[FATAL] Uncaught Exception:", error);
    void shutdown("UNCAUGHT_EXCEPTION");
  });
};

void startServer();
