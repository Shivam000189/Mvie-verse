import { prisma } from "../config/database";
import { wishlistService } from "../services/wishlist.service";
import { movieService } from "../services/movie.service";
import { MockMovieProvider } from "../providers/mock-movie.provider";
import { AppError } from "../utils/app-error";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: unknown): void {
  if (condition) {
    passedCount++;
    console.log(`  ✅ ${testName}`);
  } else {
    failedCount++;
    console.error(`  ❌ ${testName}`, failureDetails ? failureDetails : "");
  }
}

export async function runDatabaseIntegrationTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n=================================================");
  console.log("🗄️ Layer 5: PostgreSQL & Prisma Database Integration Tests");
  console.log("=================================================");

  // Use mock provider for metadata enrichment during wishlist tests
  movieService.setProvider(new MockMovieProvider());

  const TEST_MOVIE_ID_1 = 550;
  const TEST_MOVIE_ID_2 = 155;

  // Cleanup before starting to ensure isolation
  await prisma.wishlist.deleteMany({
    where: { movieId: { in: [TEST_MOVIE_ID_1, TEST_MOVIE_ID_2] } },
  });

  try {
    // ----------------------------------------------------
    // 1. Connection & Schema Verification
    // ----------------------------------------------------
    console.log("\n[Group 1] PostgreSQL Connection & Schema");

    const count = await prisma.wishlist.count();
    assert(typeof count === "number", "Prisma client successfully queries PostgreSQL database");

    // ----------------------------------------------------
    // 2. Wishlist CRUD Lifecycle
    // ----------------------------------------------------
    console.log("\n[Group 2] Wishlist CRUD Persistence Lifecycle");

    // Add item
    const addResult = await wishlistService.addToWishlist(TEST_MOVIE_ID_1);
    assert(
      addResult.movieId === TEST_MOVIE_ID_1 && addResult.success === true,
      "wishlistService.addToWishlist creates persistent database record"
    );

    // Status check
    const statusBefore = await wishlistService.checkWishlistStatus(TEST_MOVIE_ID_1);
    assert(statusBefore.isInWishlist === true, "wishlistService.checkWishlistStatus accurately detects existing record");

    // Duplicate addition guard
    let duplicateErrorCaught = false;
    try {
      await wishlistService.addToWishlist(TEST_MOVIE_ID_1);
    } catch (err) {
      if (
        err instanceof AppError &&
        err.statusCode === 409 &&
        err.code === "MOVIE_ALREADY_IN_WISHLIST"
      ) {
        duplicateErrorCaught = true;
      }
    }
    assert(
      duplicateErrorCaught,
      "wishlistService.addToWishlist prevents duplicates with 409 MOVIE_ALREADY_IN_WISHLIST"
    );

    // Retrieve full wishlist
    const fullWishlist = await wishlistService.getWishlist();
    const itemFound = fullWishlist.items.some((item) => item.id === TEST_MOVIE_ID_1);
    assert(
      itemFound && fullWishlist.total >= 1,
      "wishlistService.getWishlist retrieves enriched wishlist items"
    );

    // Remove item
    const removeResult = await wishlistService.removeFromWishlist(TEST_MOVIE_ID_1);
    assert(
      removeResult.removed === true && removeResult.movieId === TEST_MOVIE_ID_1,
      "wishlistService.removeFromWishlist deletes record from database"
    );

    // Verify deletion
    const statusAfter = await wishlistService.checkWishlistStatus(TEST_MOVIE_ID_1);
    assert(statusAfter.isInWishlist === false, "wishlistService.checkWishlistStatus confirms item removal");

    // Attempting to delete non-existent item
    let removeNonExistentCaught = false;
    try {
      await wishlistService.removeFromWishlist(TEST_MOVIE_ID_1);
    } catch (err) {
      if (
        err instanceof AppError &&
        err.statusCode === 404 &&
        err.code === "WISHLIST_ITEM_NOT_FOUND"
      ) {
        removeNonExistentCaught = true;
      }
    }
    assert(
      removeNonExistentCaught,
      "wishlistService.removeFromWishlist throws 404 WISHLIST_ITEM_NOT_FOUND when removing non-existent record"
    );

    // ----------------------------------------------------
    // 3. Concurrency & Unique Constraint Race Condition
    // ----------------------------------------------------
    console.log("\n[Group 3] Concurrency & Unique Constraint Protection");

    // Launch two simultaneous insertions for the same movie ID
    const results = await Promise.allSettled([
      wishlistService.addToWishlist(TEST_MOVIE_ID_2),
      wishlistService.addToWishlist(TEST_MOVIE_ID_2),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    const singleSuccess = fulfilled.length === 1;
    const singleConflict =
      rejected.length === 1 &&
      rejected[0].status === "rejected" &&
      rejected[0].reason instanceof AppError &&
      rejected[0].reason.statusCode === 409;

    assert(
      singleSuccess && singleConflict,
      "PostgreSQL unique constraint invariant holds under concurrent simultaneous additions (1 fulfilled, 1 conflict)"
    );

    // Final verification of total records
    const finalDbRecords = await prisma.wishlist.findMany({
      where: { movieId: TEST_MOVIE_ID_2 },
    });
    assert(
      finalDbRecords.length === 1,
      "PostgreSQL contains exactly one record for movie after concurrent race condition"
    );
  } finally {
    // ----------------------------------------------------
    // 4. Test Cleanup & Isolation Guarantee
    // ----------------------------------------------------
    await prisma.wishlist.deleteMany({
      where: { movieId: { in: [TEST_MOVIE_ID_1, TEST_MOVIE_ID_2] } },
    });
    await prisma.$disconnect();
  }

  return { passed: passedCount, failed: failedCount };
}

if (require.main === module) {
  runDatabaseIntegrationTests().then(({ passed, failed }) => {
    console.log(`\nLayer 5 Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  });
}
