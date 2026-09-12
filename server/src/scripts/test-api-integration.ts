import type { Server } from "http";
import app from "../app";
import { movieService } from "../services/movie.service";
import { MockMovieProvider } from "../providers/mock-movie.provider";

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

export async function runApiIntegrationTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n=================================================");
  console.log("🌐 Layer 4: Express HTTP API Integration Tests");
  console.log("=================================================");

  // Ensure deterministic offline responses
  movieService.setProvider(new MockMovieProvider());

  // Start ephemeral HTTP server
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind ephemeral test server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // ----------------------------------------------------
    // 1. Health & Root Endpoints
    // ----------------------------------------------------
    console.log("\n[Group 1] Health & System Endpoints");

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(
      healthRes.status === 200 && healthJson.success === true && healthJson.data?.status === "ok",
      "GET /api/health returns 200 OK with system status"
    );

    const rootRes = await fetch(`${baseUrl}/`);
    const rootJson = await rootRes.json();
    assert(
      rootRes.status === 200 && rootJson.success === true,
      "GET / returns 200 OK root greeting"
    );

    // ----------------------------------------------------
    // 2. Movie Listing & Query Parameters
    // ----------------------------------------------------
    console.log("\n[Group 2] Movie Discovery & Query Endpoints");

    const moviesRes = await fetch(`${baseUrl}/api/movies`);
    const moviesJson = await moviesRes.json();
    assert(
      moviesRes.status === 200 &&
        moviesJson.success === true &&
        Array.isArray(moviesJson.data?.movies) &&
        moviesJson.data.movies.length > 0 &&
        moviesJson.data?.pagination?.page === 1,
      "GET /api/movies returns 200 with standard envelope and pagination metadata"
    );

    const searchRes = await fetch(`${baseUrl}/api/movies?search=Inception`);
    const searchJson = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchJson.data?.movies?.length === 1 &&
        searchJson.data.movies[0].title === "Inception",
      "GET /api/movies?search=Inception filters movies by search term"
    );

    const genreRes = await fetch(`${baseUrl}/api/movies?genre=28`);
    const genreJson = await genreRes.json();
    assert(
      genreRes.status === 200 &&
        genreJson.data?.movies?.every((m: { genres: Array<{ id: number }> }) =>
          m.genres.some((g) => g.id === 28)
        ),
      "GET /api/movies?genre=28 filters movies by genre ID"
    );

    const sortRes = await fetch(`${baseUrl}/api/movies?sort=rating`);
    const sortJson = await sortRes.json();
    const isSorted = sortJson.data?.movies?.every(
      (m: { rating: number }, idx: number, arr: Array<{ rating: number }>) =>
        idx === 0 || arr[idx - 1].rating >= m.rating
    );
    assert(sortRes.status === 200 && isSorted, "GET /api/movies?sort=rating sorts movies by rating descending");

    const paginationRes = await fetch(`${baseUrl}/api/movies?page=2&limit=2`);
    const paginationJson = await paginationRes.json();
    assert(
      paginationRes.status === 200 &&
        paginationJson.data?.movies?.length === 2 &&
        paginationJson.data?.pagination?.page === 2 &&
        paginationJson.data?.pagination?.limit === 2,
      "GET /api/movies?page=2&limit=2 applies pagination bounds accurately"
    );

    // ----------------------------------------------------
    // 3. Movie Details & Taxonomy
    // ----------------------------------------------------
    console.log("\n[Group 3] Movie Details & Genres Endpoints");

    const detailRes = await fetch(`${baseUrl}/api/movies/550`);
    const detailJson = await detailRes.json();
    assert(
      detailRes.status === 200 &&
        detailJson.success === true &&
        detailJson.data?.movie?.id === 550 &&
        detailJson.data.movie.title === "Fight Club",
      "GET /api/movies/:id returns 200 with full movie details"
    );

    const genresRes = await fetch(`${baseUrl}/api/movies/genres`);
    const genresJson = await genresRes.json();
    assert(
      genresRes.status === 200 &&
        genresJson.success === true &&
        Array.isArray(genresJson.data?.genres) &&
        genresJson.data.genres.length > 0,
      "GET /api/movies/genres returns 200 with genre taxonomy"
    );

    // ----------------------------------------------------
    // 4. Error Responses & Edge Cases
    // ----------------------------------------------------
    console.log("\n[Group 4] Error Handling & Validation Integration");

    const notFoundRes = await fetch(`${baseUrl}/api/movies/999999`);
    const notFoundJson = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 &&
        notFoundJson.success === false &&
        notFoundJson.error?.code === "MOVIE_NOT_FOUND",
      "GET /api/movies/999999 returns 404 with MOVIE_NOT_FOUND envelope"
    );

    const invalidIdRes = await fetch(`${baseUrl}/api/movies/abc`);
    const invalidIdJson = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 &&
        invalidIdJson.success === false &&
        invalidIdJson.error?.code === "INVALID_MOVIE_ID",
      "GET /api/movies/abc returns 400 with INVALID_MOVIE_ID envelope"
    );

    const invalidSortRes = await fetch(`${baseUrl}/api/movies?sort=DROP%20TABLE`);
    const invalidSortJson = await invalidSortRes.json();
    assert(
      invalidSortRes.status === 400 &&
        invalidSortJson.success === false &&
        invalidSortJson.error?.code === "INVALID_REQUEST",
      "GET /api/movies?sort=DROP TABLE rejects unwhitelisted sort with 400 INVALID_REQUEST"
    );

    const invalidWishlistBodyRes = await fetch(`${baseUrl}/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const invalidWishlistBodyJson = await invalidWishlistBodyRes.json();
    assert(
      invalidWishlistBodyRes.status === 400 &&
        invalidWishlistBodyJson.success === false &&
        invalidWishlistBodyJson.error?.code === "INVALID_REQUEST",
      "POST /api/wishlist with empty body returns 400 INVALID_REQUEST"
    );

    const unknownRouteRes = await fetch(`${baseUrl}/api/non-existent-route`);
    const unknownRouteJson = await unknownRouteRes.json();
    assert(
      unknownRouteRes.status === 404 &&
        unknownRouteJson.success === false &&
        unknownRouteJson.error?.code === "ROUTE_NOT_FOUND",
      "GET /api/non-existent-route returns 404 ROUTE_NOT_FOUND"
    );
  } finally {
    server.close();
  }

  return { passed: passedCount, failed: failedCount };
}

if (require.main === module) {
  runApiIntegrationTests().then(({ passed, failed }) => {
    console.log(`\nLayer 4 Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  });
}
