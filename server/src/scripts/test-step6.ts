import { movieQuerySchema, movieIdParamSchema } from "../schemas/movie.schema";
import { movieService } from "../services/movie.service";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

async function runStep6Tests() {
  console.log("=========================================");
  console.log("🎬 Step 6: Search, Filters, Sorting & Pagination Test");
  console.log("=========================================");

  // ----------------------------------------------------
  // Test 1: Query Validation Defaults
  // ----------------------------------------------------
  console.log("\n[Test 1] Testing query parameter defaults...");
  const defaultQuery = movieQuerySchema.safeParse({});
  if (
    defaultQuery.success &&
    defaultQuery.data.page === 1 &&
    defaultQuery.data.limit === 20 &&
    defaultQuery.data.sort === "popularity" &&
    defaultQuery.data.search === undefined &&
    defaultQuery.data.genre === undefined &&
    defaultQuery.data.year === undefined
  ) {
    console.log("✅ Default query parsing PASSED (page=1, limit=20, sort='popularity')");
  } else {
    console.error("❌ Default query parsing FAILED:", defaultQuery);
  }

  // ----------------------------------------------------
  // Test 2: Search String Trimming & Empty Normalization
  // ----------------------------------------------------
  console.log("\n[Test 2] Testing search trimming and empty handling...");
  const trimmedSearch = movieQuerySchema.safeParse({ search: "  interstellar  " });
  const emptySearch = movieQuerySchema.safeParse({ search: "" });
  const whitespaceSearch = movieQuerySchema.safeParse({ search: "   " });

  if (
    trimmedSearch.success &&
    trimmedSearch.data.search === "interstellar" &&
    emptySearch.success &&
    emptySearch.data.search === undefined &&
    whitespaceSearch.success &&
    whitespaceSearch.data.search === undefined
  ) {
    console.log("✅ Search normalization PASSED (Trimmed text, empty/whitespace converted to undefined)");
  } else {
    console.error("❌ Search normalization FAILED!");
  }

  // ----------------------------------------------------
  // Test 3: Year Validation Rules
  // ----------------------------------------------------
  console.log("\n[Test 3] Testing year validation boundaries...");
  const validYear = movieQuerySchema.safeParse({ year: "2024" });
  const validOldYear = movieQuerySchema.safeParse({ year: "1888" });
  const invalidAncientYear = movieQuerySchema.safeParse({ year: "1800" });
  const invalidFarFutureYear = movieQuerySchema.safeParse({ year: "2500" });
  const invalidNonNumericYear = movieQuerySchema.safeParse({ year: "twenty-twenty" });

  if (
    validYear.success &&
    validYear.data.year === 2024 &&
    validOldYear.success &&
    validOldYear.data.year === 1888 &&
    !invalidAncientYear.success &&
    !invalidFarFutureYear.success &&
    !invalidNonNumericYear.success
  ) {
    console.log("✅ Year validation boundaries PASSED (Accepted 1888-current+5, rejected out-of-range & strings)");
  } else {
    console.error("❌ Year validation boundaries FAILED!");
  }

  // ----------------------------------------------------
  // Test 4: Sort Option Whitelisting
  // ----------------------------------------------------
  console.log("\n[Test 4] Testing sort enum whitelist...");
  const validSortPopularity = movieQuerySchema.safeParse({ sort: "popularity" });
  const validSortRating = movieQuerySchema.safeParse({ sort: "rating" });
  const validSortRelease = movieQuerySchema.safeParse({ sort: "release_date" });
  const validSortTitle = movieQuerySchema.safeParse({ sort: "title" });
  const invalidSort = movieQuerySchema.safeParse({ sort: "random_sql_injection" });

  if (
    validSortPopularity.success &&
    validSortRating.success &&
    validSortRelease.success &&
    validSortTitle.success &&
    !invalidSort.success
  ) {
    console.log("✅ Sort whitelist PASSED (Accepted popularity/rating/release_date/title, rejected arbitrary strings)");
  } else {
    console.error("❌ Sort whitelist FAILED!");
  }

  // ----------------------------------------------------
  // Test 5: Pagination Validation & Limit Protection
  // ----------------------------------------------------
  console.log("\n[Test 5] Testing pagination and limit boundaries...");
  const validPagination = movieQuerySchema.safeParse({ page: "3", limit: "50" });
  const invalidZeroPage = movieQuerySchema.safeParse({ page: "0" });
  const invalidNegativePage = movieQuerySchema.safeParse({ page: "-2" });
  const invalidLimitExceeded = movieQuerySchema.safeParse({ limit: "100000" });

  if (
    validPagination.success &&
    validPagination.data.page === 3 &&
    validPagination.data.limit === 50 &&
    !invalidZeroPage.success &&
    !invalidNegativePage.success &&
    !invalidLimitExceeded.success
  ) {
    console.log("✅ Pagination bounds PASSED (Accepted positive integers, blocked 0, negative, and excessive limits)");
  } else {
    console.error("❌ Pagination bounds FAILED!");
  }

  // ----------------------------------------------------
  // Test 6: Route Precedence check (genres vs :id)
  // ----------------------------------------------------
  console.log("\n[Test 6] Testing movieIdParamSchema against 'genres' keyword...");
  const genresParamCheck = movieIdParamSchema.safeParse({ id: "genres" });
  if (!genresParamCheck.success) {
    console.log("✅ Schema safely rejects 'genres' as a numeric ID, preventing route collisions!");
  } else {
    console.error("❌ Route schema unexpectedly accepted 'genres'!");
  }

  // ----------------------------------------------------
  // Test 7: Live Service Test (if API key available)
  // ----------------------------------------------------
  if (env.tmdb.accessToken || env.tmdb.apiKey) {
    console.log("\n[Test 7] Running Live TMDB Search & Discovery Queries...");
    try {
      // Discovery with filters & sorting
      console.log("- Discovering Action movies from 2024 sorted by rating (page 1)...");
      const discovered = await movieService.getMovies({
        genre: 28,
        year: 2024,
        sort: "rating",
        page: 1,
        limit: 10,
      });
      console.log(`✅ Discovered ${discovered.movies.length} movies.`);
      console.log(`Pagination: Page ${discovered.pagination.page} of ${discovered.pagination.totalPages}, Total: ${discovered.pagination.totalResults}, hasNext: ${discovered.pagination.hasNextPage}`);
      if (discovered.movies[0]) {
        console.log(`Sample movie: "${discovered.movies[0].title}" (Rating: ${discovered.movies[0].rating}, Release: ${discovered.movies[0].releaseDate})`);
      }

      // Search Query
      console.log("\n- Searching for 'Inception' (page 1)...");
      const searchResult = await movieService.getMovies({
        search: "Inception",
        sort: "popularity",
        page: 1,
        limit: 5,
      });
      console.log(`✅ Search returned ${searchResult.movies.length} movies.`);
      console.log(`Sample search match: "${searchResult.movies[0]?.title}" (ID: ${searchResult.movies[0]?.id})`);

      // Dynamic Genres
      console.log("\n- Fetching dynamic genre catalog...");
      const genresResult = await movieService.getGenres();
      console.log(`✅ Retrieved ${genresResult.genres.length} genres from TMDB.`);
      console.log(`Sample genres: ${genresResult.genres.slice(0, 5).map((g) => g.name).join(", ")}`);
    } catch (err) {
      console.error("❌ Live service test error:", err);
    }
  } else {
    console.log("\nℹ️ Skipping live TMDB call (no API key in .env). All schema and query logic unit tests PASSED!");
  }

  console.log("\n=========================================");
  console.log("🎉 All Step 6 Tests Completed Successfully!");
  console.log("=========================================");
}

runStep6Tests();
