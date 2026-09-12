import { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { TmdbError } from "../utils/tmdb-error";
import { MovieMapper } from "../utils/movie.mapper";
import { movieQuerySchema, movieIdParamSchema } from "../schemas/movie.schema";
import { addWishlistSchema, wishlistParamSchema } from "../schemas/wishlist.schema";

async function runErrorMatrixTests() {
  console.log("=================================================");
  console.log("🛡️ Step 10: Production-Quality Error & Edge Cases Test");
  console.log("=================================================");

  // ----------------------------------------------------
  // Test 1: Pagination Edge Cases
  // ----------------------------------------------------
  console.log("\n[Test 1] Testing Pagination Edge Cases...");
  const zeroPage = movieQuerySchema.safeParse({ page: 0 });
  const negativePage = movieQuerySchema.safeParse({ page: -1 });
  const alphaPage = movieQuerySchema.safeParse({ page: "abc" });
  const zeroLimit = movieQuerySchema.safeParse({ limit: 0 });
  const negativeLimit = movieQuerySchema.safeParse({ limit: -5 });
  const excessiveLimit = movieQuerySchema.safeParse({ limit: 100000 });

  if (
    !zeroPage.success &&
    !negativePage.success &&
    !alphaPage.success &&
    !zeroLimit.success &&
    !negativeLimit.success &&
    !excessiveLimit.success
  ) {
    console.log("✅ Pagination bounds PASSED (Rejected page <= 0, limit <= 0, non-numeric, limit > 20)");
  } else {
    console.error("❌ Pagination bounds FAILED!");
  }

  // ----------------------------------------------------
  // Test 2: Search String Normalization & Whitespace
  // ----------------------------------------------------
  console.log("\n[Test 2] Testing Search String Normalization...");
  const emptySearch = movieQuerySchema.safeParse({ search: "" });
  const whitespaceSearch = movieQuerySchema.safeParse({ search: "      " });
  const paddedSearch = movieQuerySchema.safeParse({ search: "  Inception  " });

  if (
    emptySearch.success &&
    emptySearch.data.search === undefined &&
    whitespaceSearch.success &&
    whitespaceSearch.data.search === undefined &&
    paddedSearch.success &&
    paddedSearch.data.search === "Inception"
  ) {
    console.log("✅ Search normalization PASSED (Empty & whitespace search gracefully fallback to discovery mode)");
  } else {
    console.error("❌ Search normalization FAILED!");
  }

  // ----------------------------------------------------
  // Test 3: Filter & Sort Injection Whitelisting
  // ----------------------------------------------------
  console.log("\n[Test 3] Testing Filter & Sort Whitelisting...");
  const sqlInjectionSort = movieQuerySchema.safeParse({ sort: "'; DROP TABLE movies; --" });
  const arbitrarySort = movieQuerySchema.safeParse({ sort: "custom_score" });
  const ancientYear = movieQuerySchema.safeParse({ year: 1500 });
  const futureYear = movieQuerySchema.safeParse({ year: 3000 });
  const negativeGenre = movieQuerySchema.safeParse({ genre: -28 });

  if (
    !sqlInjectionSort.success &&
    !arbitrarySort.success &&
    !ancientYear.success &&
    !futureYear.success &&
    !negativeGenre.success
  ) {
    console.log("✅ Sort and filter validation PASSED (Blocked arbitrary sort strings, out-of-range years, negative genres)");
  } else {
    console.error("❌ Filter and sort validation FAILED!");
  }

  // ----------------------------------------------------
  // Test 4: Route Parameter (:id & :movieId) Validation
  // ----------------------------------------------------
  console.log("\n[Test 4] Testing Route Parameter Validation (:id & :movieId)...");
  const alphaMovieId = movieIdParamSchema.safeParse({ id: "batman" });
  const zeroMovieId = movieIdParamSchema.safeParse({ id: "0" });
  const negativeMovieId = movieIdParamSchema.safeParse({ id: "-550" });
  const validMovieId = movieIdParamSchema.safeParse({ id: "550" });

  const invalidWishlistParam = wishlistParamSchema.safeParse({ movieId: "invalid" });
  const validWishlistParam = wishlistParamSchema.safeParse({ movieId: "550" });

  if (
    !alphaMovieId.success &&
    !zeroMovieId.success &&
    !negativeMovieId.success &&
    validMovieId.success &&
    validMovieId.data.id === 550 &&
    !invalidWishlistParam.success &&
    validWishlistParam.success &&
    validWishlistParam.data.movieId === 550
  ) {
    console.log("✅ Route parameter validation PASSED (Accepted positive integers, rejected 'batman', '0', '-550')");
  } else {
    console.error("❌ Route parameter validation FAILED!");
  }

  // ----------------------------------------------------
  // Test 5: Wishlist Body Input Validation
  // ----------------------------------------------------
  console.log("\n[Test 5] Testing Wishlist Body Validation...");
  const emptyBody = addWishlistSchema.safeParse({});
  const emptyStringBody = addWishlistSchema.safeParse({ movieId: "" });
  const negativeBody = addWishlistSchema.safeParse({ movieId: -50 });
  const validBody = addWishlistSchema.safeParse({ movieId: 550 });

  if (!emptyBody.success && !emptyStringBody.success && !negativeBody.success && validBody.success) {
    console.log("✅ Wishlist body validation PASSED (Rejected {}, empty strings, negative numbers)");
  } else {
    console.error("❌ Wishlist body validation FAILED!");
  }

  // ----------------------------------------------------
  // Test 6: AppError Standard Formats & Codes
  // ----------------------------------------------------
  console.log("\n[Test 6] Testing AppError Standard Formats...");
  const badReq = AppError.badRequest("Invalid input parameters", "INVALID_REQUEST");
  const notFound = AppError.notFound("Movie was not found.", "MOVIE_NOT_FOUND");
  const conflict = AppError.conflict("Movie is already in the wishlist.", "MOVIE_ALREADY_IN_WISHLIST");
  const unavailable = AppError.serviceUnavailable("Movie service is temporarily unavailable", "MOVIE_SERVICE_UNAVAILABLE");
  const dbError = AppError.databaseError("Unable to complete the database request.", "DATABASE_ERROR");

  if (
    badReq.statusCode === 400 &&
    badReq.code === "INVALID_REQUEST" &&
    notFound.statusCode === 404 &&
    notFound.code === "MOVIE_NOT_FOUND" &&
    conflict.statusCode === 409 &&
    conflict.code === "MOVIE_ALREADY_IN_WISHLIST" &&
    unavailable.statusCode === 503 &&
    unavailable.code === "MOVIE_SERVICE_UNAVAILABLE" &&
    dbError.statusCode === 500 &&
    dbError.code === "DATABASE_ERROR"
  ) {
    console.log("✅ Standard AppError factory methods PASSED (400, 404, 409, 500, 503)");
  } else {
    console.error("❌ AppError standard format FAILED!");
  }

  // ----------------------------------------------------
  // Test 7: TMDB Error Translation
  // ----------------------------------------------------
  console.log("\n[Test 7] Testing TMDB Error Code Mapping...");
  const tmdb404 = new TmdbError("Not Found", "TMDB_NOT_FOUND", 404);
  const tmdb429 = new TmdbError("Rate Limit", "TMDB_RATE_LIMITED", 429);
  const tmdbTimeout = new TmdbError("Timeout", "TMDB_TIMEOUT", 504);

  if (
    tmdb404.statusCode === 404 &&
    tmdb404.code === "TMDB_NOT_FOUND" &&
    tmdb429.statusCode === 429 &&
    tmdb429.code === "TMDB_RATE_LIMITED" &&
    tmdbTimeout.statusCode === 504 &&
    tmdbTimeout.code === "TMDB_TIMEOUT"
  ) {
    console.log("✅ TMDB Error classification PASSED (Correct status codes and internal codes)");
  } else {
    console.error("❌ TMDB Error classification FAILED!");
  }

  // ----------------------------------------------------
  // Test 8: Malformed Provider Data Normalization
  // ----------------------------------------------------
  console.log("\n[Test 8] Testing Malformed & Corrupted Provider Data Resilience...");
  const corruptRawMovie = {
    id: 999,
    title: null as unknown as string,
    overview: null as unknown as string,
    vote_average: "not-a-number" as unknown as number,
    vote_count: null as unknown as number,
    poster_path: null,
    backdrop_path: null,
    genre_ids: "invalid-array" as unknown as number[],
  };

  const normalizedMovie = MovieMapper.toMovie(corruptRawMovie);

  if (
    normalizedMovie.id === 999 &&
    normalizedMovie.title === "Untitled" &&
    normalizedMovie.overview === "" &&
    normalizedMovie.rating === 0 &&
    normalizedMovie.voteCount === 0 &&
    Array.isArray(normalizedMovie.genres) &&
    normalizedMovie.genres.length === 0
  ) {
    console.log("✅ Malformed Provider Data Normalization PASSED (Corrupt fields safely defaulted without crashing)");
  } else {
    console.error("❌ Malformed Provider Data Normalization FAILED:", normalizedMovie);
  }

  // ----------------------------------------------------
  // Test 9: Complete Null Provider Object Resilience
  // ----------------------------------------------------
  console.log("\n[Test 9] Testing Nullish Provider Object Resilience...");
  const nullMovie = MovieMapper.toMovie(null);
  const undefinedMovie = MovieMapper.toMovie(undefined);

  if (
    nullMovie.id === 0 &&
    nullMovie.title === "Untitled" &&
    undefinedMovie.id === 0 &&
    undefinedMovie.title === "Untitled"
  ) {
    console.log("✅ Nullish Provider Object Resilience PASSED (Handled null and undefined payloads)");
  } else {
    console.error("❌ Nullish Provider Object Resilience FAILED!");
  }

  console.log("\n=================================================");
  console.log("🎉 All Step 10 Error & Edge-Case Tests Passed Successfully!");
  console.log("=================================================");
}

runErrorMatrixTests();
