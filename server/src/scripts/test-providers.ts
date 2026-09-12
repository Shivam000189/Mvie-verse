import { MockMovieProvider } from "../providers/mock-movie.provider";
import { FailingMovieProvider } from "../providers/failing-movie.provider";
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

export async function runProviderTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n=================================================");
  console.log("🔌 Layer 2: Movie Provider Contract & Failure Tests");
  console.log("=================================================");

  const provider = new MockMovieProvider();

  // ----------------------------------------------------
  // 1. MockMovieProvider Contract Tests
  // ----------------------------------------------------
  console.log("\n[Group 1] MockMovieProvider Contract Verification");

  const defaultList = await provider.getMovies({ sort: "popularity", page: 1, limit: 20 });
  assert(
    defaultList.movies.length > 0 &&
      defaultList.pagination.page === 1 &&
      defaultList.pagination.totalResults === defaultList.movies.length &&
      defaultList.pagination.hasNextPage === false,
    "MockMovieProvider.getMovies returns default movie list and valid pagination metadata"
  );

  const searchResult = await provider.getMovies({
    search: "dark knight",
    sort: "popularity",
    page: 1,
    limit: 20,
  });
  assert(
    searchResult.movies.length === 1 && searchResult.movies[0].title === "The Dark Knight",
    "MockMovieProvider searches movies by text query accurately"
  );

  const genreResult = await provider.getMovies({
    genre: 28, // Action
    sort: "popularity",
    page: 1,
    limit: 20,
  });
  assert(
    genreResult.movies.length > 0 &&
      genreResult.movies.every((m) => m.genres.some((g) => g.id === 28)),
    "MockMovieProvider filters movies strictly by genre ID"
  );

  const yearResult = await provider.getMovies({
    year: 1994,
    sort: "popularity",
    page: 1,
    limit: 20,
  });
  assert(
    yearResult.movies.length === 2 &&
      yearResult.movies.every((m) => m.releaseDate?.startsWith("1994")),
    "MockMovieProvider filters movies by release year accurately"
  );

  const sortRatingResult = await provider.getMovies({
    sort: "rating",
    page: 1,
    limit: 20,
  });
  const ratings = sortRatingResult.movies.map((m) => m.rating);
  const isSortedByRating = ratings.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
  assert(isSortedByRating, "MockMovieProvider sorts movies by rating descending");

  const paginatedResult = await provider.getMovies({
    sort: "popularity",
    page: 2,
    limit: 3,
  });
  assert(
    paginatedResult.movies.length === 3 &&
      paginatedResult.pagination.page === 2 &&
      paginatedResult.pagination.limit === 3 &&
      paginatedResult.pagination.hasPrevPage === true,
    "MockMovieProvider supports custom pagination offsets and limits"
  );

  const movieDetails = await provider.getMovieById(550);
  assert(
    movieDetails.movie.id === 550 && movieDetails.movie.title === "Fight Club",
    "MockMovieProvider.getMovieById returns full details for valid ID"
  );

  let notFoundCaught = false;
  try {
    await provider.getMovieById(999999);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404 && err.code === "MOVIE_NOT_FOUND") {
      notFoundCaught = true;
    }
  }
  assert(notFoundCaught, "MockMovieProvider.getMovieById throws 404 MOVIE_NOT_FOUND for non-existent ID");

  const genresList = await provider.getGenres();
  const genreIds = genresList.genres.map((g) => g.id);
  const hasNoDuplicateGenres = new Set(genreIds).size === genreIds.length;
  assert(
    genresList.genres.length > 0 && hasNoDuplicateGenres,
    "MockMovieProvider.getGenres returns unique genre list"
  );

  // ----------------------------------------------------
  // 2. FailingMovieProvider Error Simulations
  // ----------------------------------------------------
  console.log("\n[Group 2] Provider Failure Simulation Tests");

  const failingProvider = new FailingMovieProvider("SERVICE_UNAVAILABLE", 5);

  let serviceUnavailCaught = false;
  try {
    await failingProvider.getMovies({ sort: "popularity", page: 1, limit: 20 });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 503 && err.code === "MOVIE_SERVICE_UNAVAILABLE") {
      serviceUnavailCaught = true;
    }
  }
  assert(serviceUnavailCaught, "FailingMovieProvider simulates 503 MOVIE_SERVICE_UNAVAILABLE");

  failingProvider.setMode("TIMEOUT", 5);
  let timeoutCaught = false;
  try {
    await failingProvider.getMovies({ sort: "popularity", page: 1, limit: 20 });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 503 && err.code === "MOVIE_SERVICE_UNAVAILABLE") {
      timeoutCaught = true;
    }
  }
  assert(timeoutCaught, "FailingMovieProvider simulates upstream network timeout");

  failingProvider.setMode("RATE_LIMITED", 5);
  let rateLimitCaught = false;
  try {
    await failingProvider.getMovies({ sort: "popularity", page: 1, limit: 20 });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 429 && err.code === "MOVIE_SERVICE_RATE_LIMITED") {
      rateLimitCaught = true;
    }
  }
  assert(rateLimitCaught, "FailingMovieProvider simulates 429 MOVIE_SERVICE_RATE_LIMITED");

  failingProvider.setMode("MALFORMED_PAYLOAD", 5);
  const malformedRes = await failingProvider.getMovies({ sort: "popularity", page: 1, limit: 20 });
  assert(
    malformedRes.movies.length === 1 && malformedRes.movies[0].id === 999,
    "FailingMovieProvider safely delivers malformed payload test case without uncaught process crashes"
  );

  return { passed: passedCount, failed: failedCount };
}

if (require.main === module) {
  runProviderTests().then(({ passed, failed }) => {
    console.log(`\nLayer 2 Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  });
}
