import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

/**
 * Singleton instance of PrismaClient.
 * Centralized database connection pool for PostgreSQL.
 */
export const prisma = new PrismaClient({
  log: isProduction ? ["error", "warn"] : ["warn", "error"],
});

/**
 * Explicitly tests database connectivity.
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
};

/**
 * Cleanly disconnects the database connection pool.
 */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};

export default prisma;
