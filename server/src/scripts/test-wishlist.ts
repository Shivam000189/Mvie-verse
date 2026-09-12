import { addWishlistSchema, wishlistParamSchema } from "../schemas/wishlist.schema";
import { wishlistService } from "../services/wishlist.service";
import { prisma, connectDatabase, disconnectDatabase } from "../config/database";
import { AppError } from "../utils/app-error";

async function runWishlistTests() {
  console.log("=========================================");
  console.log("🎬 Step 8: Wishlist Persistence & API Lifecycle Test");
  console.log("=========================================");

  // ----------------------------------------------------
  // Test 1: Schema Input Validation
  // ----------------------------------------------------
  console.log("\n[Test 1] Testing Wishlist Zod Input Validation...");
  const validBody = addWishlistSchema.safeParse({ movieId: 550 });
  const validStringBody = addWishlistSchema.safeParse({ movieId: "550" });
  const invalidNegativeBody = addWishlistSchema.safeParse({ movieId: -50 });
  const invalidZeroBody = addWishlistSchema.safeParse({ movieId: 0 });
  const invalidTextBody = addWishlistSchema.safeParse({ movieId: "abc" });

  if (
    validBody.success &&
    validBody.data.movieId === 550 &&
    validStringBody.success &&
    validStringBody.data.movieId === 550 &&
    !invalidNegativeBody.success &&
    !invalidZeroBody.success &&
    !invalidTextBody.success
  ) {
    console.log("✅ Wishlist schema validation PASSED (Accepted positive numbers, rejected -50, 0, 'abc')");
  } else {
    console.error("❌ Wishlist schema validation FAILED!");
  }

  // ----------------------------------------------------
  // Test 2: Route Param Validation (:movieId)
  // ----------------------------------------------------
  console.log("\n[Test 2] Testing Route Parameter Validation (:movieId)...");
  const validParam = wishlistParamSchema.safeParse({ movieId: "550" });
  const invalidParam = wishlistParamSchema.safeParse({ movieId: "batman" });

  if (validParam.success && validParam.data.movieId === 550 && !invalidParam.success) {
    console.log("✅ Route param validation PASSED");
  } else {
    console.error("❌ Route param validation FAILED!");
  }

  // ----------------------------------------------------
  // Test 3: Live End-to-End Wishlist Lifecycle Test
  // ----------------------------------------------------
  console.log("\n[Test 3] Testing Wishlist Lifecycle against PostgreSQL & TMDB...");
  const MOVIE_1 = 550; // Fight Club
  const MOVIE_2 = 680; // Pulp Fiction

  try {
    await connectDatabase();

    // Step A: Reset test movies
    await prisma.wishlist.deleteMany({
      where: { movieId: { in: [MOVIE_1, MOVIE_2] } },
    });

    // Step B: Add Movie 1 (550)
    console.log(`- Adding Movie ${MOVIE_1} to wishlist...`);
    const addResult1 = await wishlistService.addToWishlist(MOVIE_1);
    console.log(`✅ Add success: ${addResult1.message} (ID: ${addResult1.movieId})`);

    // Step C: Check status for Movie 1
    console.log(`- Checking wishlist status for Movie ${MOVIE_1}...`);
    const status1 = await wishlistService.checkWishlistStatus(MOVIE_1);
    if (status1.isInWishlist === true) {
      console.log(`✅ Status check PASSED (isInWishlist: true)`);
    } else {
      console.error(`❌ Status check FAILED: expected true, got ${status1.isInWishlist}`);
    }

    // Step D: Add Movie 2 (680)
    console.log(`- Adding Movie ${MOVIE_2} to wishlist...`);
    const addResult2 = await wishlistService.addToWishlist(MOVIE_2);
    console.log(`✅ Add success: ${addResult2.message} (ID: ${addResult2.movieId})`);

    // Step E: Retrieve complete Wishlist
    console.log("- Retrieving full wishlist with TMDB metadata...");
    const wishlist = await wishlistService.getWishlist();
    console.log(`✅ Retrieved ${wishlist.total} wishlisted movies.`);

    const foundMovie1 = wishlist.items.find((m) => m.id === MOVIE_1);
    const foundMovie2 = wishlist.items.find((m) => m.id === MOVIE_2);

    if (foundMovie1 && foundMovie2) {
      console.log(`✅ Movie 1 Details: "${foundMovie1.title}" (Rating: ${foundMovie1.rating}, Poster: ${foundMovie1.posterUrl})`);
      console.log(`✅ Movie 2 Details: "${foundMovie2.title}" (Rating: ${foundMovie2.rating}, Poster: ${foundMovie2.posterUrl})`);
    } else {
      console.error("❌ Missing expected movies in wishlist list!");
    }

    // Step F: Test Duplicate Insertion Guard
    console.log(`- Testing duplicate addition of Movie ${MOVIE_1}...`);
    try {
      await wishlistService.addToWishlist(MOVIE_1);
      console.error("❌ Duplicate insertion test FAILED: No error was thrown!");
    } catch (err) {
      if (err instanceof AppError && err.code === "MOVIE_ALREADY_IN_WISHLIST" && err.statusCode === 409) {
        console.log(`✅ Duplicate guard PASSED! Caught expected 409 Conflict: "${err.message}"`);
      } else {
        console.error("❌ Unexpected error on duplicate insert:", err);
      }
    }

    // Step G: Remove Movie 1
    console.log(`- Removing Movie ${MOVIE_1} from wishlist...`);
    const removeResult = await wishlistService.removeFromWishlist(MOVIE_1);
    console.log(`✅ Remove success: removed=${removeResult.removed} (ID: ${removeResult.movieId})`);

    // Step H: Check status for Movie 1 after removal
    const statusAfterRemove = await wishlistService.checkWishlistStatus(MOVIE_1);
    if (statusAfterRemove.isInWishlist === false) {
      console.log(`✅ Status check after removal PASSED (isInWishlist: false)`);
    } else {
      console.error(`❌ Status check after removal FAILED: expected false, got ${statusAfterRemove.isInWishlist}`);
    }

    // Step I: Attempt to remove non-wishlisted movie
    console.log(`- Attempting to remove non-existent wishlist item (${MOVIE_1})...`);
    try {
      await wishlistService.removeFromWishlist(MOVIE_1);
      console.error("❌ Remove non-existent test FAILED: No error thrown!");
    } catch (err) {
      if (err instanceof AppError && err.code === "WISHLIST_ITEM_NOT_FOUND" && err.statusCode === 404) {
        console.log(`✅ Remove non-existent item guard PASSED! Caught expected 404 Not Found: "${err.message}"`);
      } else {
        console.error("❌ Unexpected error on non-existent delete:", err);
      }
    }

    // Step J: Cleanup Movie 2
    await wishlistService.removeFromWishlist(MOVIE_2);
    console.log(`✅ Cleaned up Movie ${MOVIE_2}`);

    console.log("\n=========================================");
    console.log("🎉 All Step 8 Wishlist Tests Completed Successfully!");
    console.log("=========================================");
  } catch (error) {
    console.error("❌ Live Wishlist test error:", error);
  } finally {
    await disconnectDatabase();
  }
}

runWishlistTests();
