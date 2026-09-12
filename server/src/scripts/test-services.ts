import { MovieService } from "../services/movie.service";
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

export async function runServiceTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n=================================================");
  console.log("⚙️ Layer 3: Service & Business Logic Tests");
  console.log("=================================================");

  const mockProvider = new MockMovieProvider();
  const movieService = new MovieService(mockProvider);

  // ----------------------------------------------------
  // 1. MovieService Core Operations
  // ----------------------------------------------------
  console.log("\n[Group 1] MovieService Operations & Normalization");

  movieService.clearCache();
  const moviesRes = await movieService.getMovies({ page: 1, limit: 10 });
  assert(
    moviesRes.movies.length > 0 && moviesRes.pagination.page === 1,
    "MovieService.getMovies retrieves normalized movie list and pagination"
  );

  const searchRes = await movieService.getMovies({ search: "Inception" });
  assert(
    searchRes.movies.length === 1 && searchRes.movies[0].title === "Inception",
    "MovieService.getMovies routes search queries properly"
  );

  const detailsRes = await movieService.getMovieById(550);
  assert(
    detailsRes.movie.id === 550 && detailsRes.movie.title === "Fight Club",
    "MovieService.getMovieById returns full movie details"
  );

  let notFoundCaught = false;
  try {
    await movieService.getMovieById(999999);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404 && err.code === "MOVIE_NOT_FOUND") {
      notFoundCaught = true;
    }
  }
  assert(notFoundCaught, "MovieService.getMovieById cleanly propagates 404 MOVIE_NOT_FOUND");

  const genresRes = await movieService.getGenres();
  assert(
    genresRes.genres.length > 0 && genresRes.genres.some((g) => g.name === "Action"),
    "MovieService.getGenres returns cached taxonomy"
  );

  // ----------------------------------------------------
  // 2. MovieService Caching & Observability
  // ----------------------------------------------------
  console.log("\n[Group 2] MovieService Caching & Coalescing");

  movieService.clearCache();
  const initialStats = movieService.getCacheStats();

  // First fetch -> Cache Miss
  await movieService.getMovieById(155);
  const statsAfterMiss = movieService.getCacheStats();
  assert(
    statsAfterMiss.movieDetails.misses === initialStats.movieDetails.misses + 1,
    "MovieService registers cache miss on first request"
  );

  // Second fetch -> Cache Hit
  await movieService.getMovieById(155);
  const statsAfterHit = movieService.getCacheStats();
  assert(
    statsAfterHit.movieDetails.hits === initialStats.movieDetails.hits + 1,
    "MovieService serves subsequent identical requests directly from in-memory cache"
  );

  // Distinct queries do not collide
  await movieService.getMovies({ page: 1, limit: 5 });
  await movieService.getMovies({ page: 2, limit: 5 });
  const listStats = movieService.getCacheStats();
  assert(
    listStats.movieLists.size === 2,
    "MovieService maintains distinct cache entries for differing pagination query parameters"
  );

  // In-flight request coalescing test (5 concurrent callers for un-cached movie)
  let providerCalls = 0;
  const spyProvider = {
    async getMovies(q: any) {
      return mockProvider.getMovies(q);
    },
    async getGenres() {
      return mockProvider.getGenres();
    },
    async getMovieById(id: number) {
      providerCalls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return mockProvider.getMovieById(id);
    },
  };
  const coalescingService = new MovieService(spyProvider);

  const concurrentCalls = await Promise.all([
    coalescingService.getMovieById(27205),
    coalescingService.getMovieById(27205),
    coalescingService.getMovieById(27205),
    coalescingService.getMovieById(27205),
    coalescingService.getMovieById(27205),
  ]);

  assert(
    concurrentCalls.every((res) => res.movie.id === 27205) && providerCalls === 1,
    "MovieService coalesces concurrent in-flight requests into a single upstream provider execution"
  );

  // ----------------------------------------------------
  // 3. Error Non-Caching Policy
  // ----------------------------------------------------
  console.log("\n[Group 3] Provider Error Non-Caching Resilience");

  const failingProvider = new FailingMovieProvider("SERVICE_UNAVAILABLE", 5);
  const resilientService = new MovieService(failingProvider);

  let firstErrorCaught = false;
  try {
    await resilientService.getMovieById(550);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 503) {
      firstErrorCaught = true;
    }
  }
  assert(firstErrorCaught, "MovieService catches and translates upstream 503 error");

  // Verify that the error was NOT cached:
  // If we recover the provider to MockMovieProvider, the next request must immediately succeed!
  resilientService.setProvider(mockProvider);
  const recoveredResult = await resilientService.getMovieById(550);
  assert(
    recoveredResult.movie.id === 550,
    "MovieService error non-caching policy guarantees instant recovery upon provider restoration"
  );

  return { passed: passedCount, failed: failedCount };
}

if (require.main === module) {
  runServiceTests().then(({ passed, failed }) => {
    console.log(`\nLayer 3 Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  });
}
