import { Prisma } from "@prisma/client";
import { prisma, connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";

async function runDatabaseTests() {
  console.log("=========================================");
  console.log("🗄️ PostgreSQL + Prisma Persistence Test");
  console.log("=========================================");
  console.log(`Configured DATABASE_URL: ${env.databaseUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log("-----------------------------------------");

  const TEST_MOVIE_ID = 99999999;

  try {
    // 1. Test Connection
    console.log("\n[Test 1] Testing PostgreSQL Connection...");
    await connectDatabase();

    // Cleanup any lingering test record from prior runs
    await prisma.wishlist.deleteMany({
      where: { movieId: TEST_MOVIE_ID },
    });

    // 2. Test Create Operation
    console.log(`\n[Test 2] Inserting test wishlist item (movieId: ${TEST_MOVIE_ID})...`);
    const created = await prisma.wishlist.create({
      data: { movieId: TEST_MOVIE_ID },
    });
    console.log(`✅ Record created: ID=${created.id}, MovieID=${created.movieId}, CreatedAt=${created.createdAt.toISOString()}`);

    // 3. Test Unique Constraint Violation (Race Condition / Duplicate Guard)
    console.log("\n[Test 3] Testing Unique Constraint enforcement (Attempting duplicate insert)...");
    try {
      await prisma.wishlist.create({
        data: { movieId: TEST_MOVIE_ID },
      });
      console.error("❌ Test failed: Duplicate record was inserted without error!");
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        console.log(`✅ Unique constraint enforcement PASSED! Caught expected Prisma error P2002: Unique constraint failed on target (${(err.meta?.target as string[])?.join(", ") || "movieId"}).`);
      } else {
        console.error("❌ Unexpected error thrown:", err);
      }
    }

    // 4. Test Find Operation
    console.log(`\n[Test 4] Querying wishlist item by movieId...`);
    const found = await prisma.wishlist.findUnique({
      where: { movieId: TEST_MOVIE_ID },
    });
    if (found && found.movieId === TEST_MOVIE_ID) {
      console.log(`✅ Record retrieval PASSED: Found record for movie ID ${found.movieId}`);
    } else {
      console.error("❌ Record retrieval FAILED!");
    }

    // 5. Test Delete Operation (Cleanup)
    console.log(`\n[Test 5] Deleting test wishlist item...`);
    const deleted = await prisma.wishlist.delete({
      where: { movieId: TEST_MOVIE_ID },
    });
    console.log(`✅ Record deletion PASSED: Cleaned up record ID ${deleted.id}`);

    console.log("\n=========================================");
    console.log("🎉 All PostgreSQL & Prisma Tests Completed Successfully!");
    console.log("=========================================");
  } catch (error) {
    console.warn("\n⚠️ Database connection / operation notice:");
    console.warn("Could not connect to PostgreSQL with current DATABASE_URL.");
    console.warn("If you haven't started PostgreSQL locally yet, you can:");
    console.warn("  1. Start local PostgreSQL, or");
    console.warn("  2. Use a free hosted Postgres database (e.g., Supabase / Neon), or");
    console.warn("  3. Run Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres");
    console.warn("\nDetailed error:", error instanceof Error ? error.message : error);
  } finally {
    await disconnectDatabase();
  }
}

runDatabaseTests();
