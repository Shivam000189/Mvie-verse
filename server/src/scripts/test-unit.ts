import { MovieMapper } from "../utils/movie.mapper";
import { movieQuerySchema, movieIdParamSchema } from "../schemas/movie.schema";
import { addWishlistSchema } from "../schemas/wishlist.schema";
import { AppError } from "../utils/app-error";
import { InMemoryCache } from "../utils/cache";
import type { TmdbMovie, TmdbMovieDetails } from "../types/tmdb.types";

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

export async function runUnitTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n=================================================");
  console.log("🧪 Layer 1: Pure Unit Tests (Utilities & Validators)");
  console.log("=================================================");

  // ----------------------------------------------------
  // 1. MovieMapper Tests
  // ----------------------------------------------------
  console.log("\n[Group 1] MovieMapper Unit Tests");

  const sampleTmdbMovie: TmdbMovie = {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    overview: "An insomniac office worker...",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    vote_average: 8.433,
    vote_count: 27000,
    popularity: 65.4,
    genre_ids: [18, 53],
    adult: false,
    video: false,
    original_language: "en",
  };

  const mappedMovie = MovieMapper.toMovie(sampleTmdbMovie);
  assert(
    mappedMovie.id === 550 &&
      mappedMovie.title === "Fight Club" &&
      mappedMovie.rating === 8.4 &&
      mappedMovie.posterUrl?.includes("https://image.tmdb.org/t/p/w500/") === true &&
      mappedMovie.genres.length === 2 &&
      mappedMovie.genres[0].name === "Drama",
    "MovieMapper.toMovie maps complete valid TMDB movie correctly"
  );

  const corruptTmdbMovie = {
    id: 999,
    title: null,
    original_title: "Fallback Title",
    overview: null,
    poster_path: null,
    backdrop_path: null,
    release_date: null,
    vote_average: "corrupt_rating",
    vote_count: null,
    popularity: null,
    genre_ids: "not-an-array",
  } as unknown as TmdbMovie;

  const safeMapped = MovieMapper.toMovie(corruptTmdbMovie);
  assert(
    safeMapped.title === "Fallback Title" &&
      safeMapped.overview === "" &&
      safeMapped.posterUrl === null &&
      safeMapped.rating === 0 &&
      Array.isArray(safeMapped.genres) &&
      safeMapped.genres.length === 0,
    "MovieMapper.toMovie defensively handles nullish/corrupt fields with safe fallbacks"
  );

  const sampleDetails: TmdbMovieDetails = {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    tagline: "Mischief. Mayhem. Soap.",
    overview: "A ticking-time-bomb insomniac...",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    runtime: 139,
    status: "Released",
    budget: 63000000,
    revenue: 100853753,
    vote_average: 8.433,
    vote_count: 27000,
    popularity: 65.4,
    genres: [{ id: 18, name: "Drama" }],
    homepage: "http://www.foxmovies.com/movies/fight-club",
    imdb_id: "tt0137523",
    original_language: "en",
    production_companies: [],
    production_countries: [],
    spoken_languages: [],
    adult: false,
    video: false,
  };

  const mappedDetails = MovieMapper.toMovieDetails(sampleDetails);
  assert(
    mappedDetails.tagline === "Mischief. Mayhem. Soap." &&
      mappedDetails.runtime === 139 &&
      mappedDetails.imdbId === "tt0137523" &&
      mappedDetails.budget === 63000000,
    "MovieMapper.toMovieDetails maps extended movie metadata accurately"
  );

  // ----------------------------------------------------
  // 2. Query & Parameter Validation Schemas
  // ----------------------------------------------------
  console.log("\n[Group 2] Zod Validation Schemas");

  const defaultQuery = movieQuerySchema.safeParse({});
  assert(
    defaultQuery.success &&
      defaultQuery.data.page === 1 &&
      defaultQuery.data.limit === 20 &&
      defaultQuery.data.sort === "popularity",
    "movieQuerySchema applies default pagination and sorting (page=1, limit=20, sort=popularity)"
  );

  const whitespaceSearch = movieQuerySchema.safeParse({ search: "   Inception   " });
  assert(
    whitespaceSearch.success && whitespaceSearch.data.search === "Inception",
    "movieQuerySchema trims search whitespace correctly"
  );

  const emptySearch = movieQuerySchema.safeParse({ search: "   " });
  assert(
    emptySearch.success && emptySearch.data.search === undefined,
    "movieQuerySchema converts empty/whitespace search to undefined"
  );

  const validYear = movieQuerySchema.safeParse({ year: "2024" });
  const invalidPastYear = movieQuerySchema.safeParse({ year: "1800" });
  const invalidFutureYear = movieQuerySchema.safeParse({ year: "2099" });
  assert(
    validYear.success &&
      validYear.data.year === 2024 &&
      !invalidPastYear.success &&
      !invalidFutureYear.success,
    "movieQuerySchema accepts valid years (1888–current+5) and rejects out-of-range years"
  );

  const validSort = movieQuerySchema.safeParse({ sort: "rating" });
  const invalidSort = movieQuerySchema.safeParse({ sort: "DROP TABLE" });
  assert(
    validSort.success && validSort.data.sort === "rating" && !invalidSort.success,
    "movieQuerySchema strictly enforces sorting allowlist ('popularity' | 'rating' | 'release_date' | 'title')"
  );

  const invalidPage = movieQuerySchema.safeParse({ page: "0" });
  const negativePage = movieQuerySchema.safeParse({ page: "-5" });
  const excessiveLimit = movieQuerySchema.safeParse({ limit: "1000" });
  assert(
    !invalidPage.success && !negativePage.success && !excessiveLimit.success,
    "movieQuerySchema rejects page <= 0 and limit > 20"
  );

  const validMovieId = movieIdParamSchema.safeParse({ id: "550" });
  const invalidMovieIdStr = movieIdParamSchema.safeParse({ id: "batman" });
  const invalidMovieIdZero = movieIdParamSchema.safeParse({ id: "0" });
  assert(
    validMovieId.success &&
      validMovieId.data.id === 550 &&
      !invalidMovieIdStr.success &&
      !invalidMovieIdZero.success,
    "movieIdParamSchema validates numeric route IDs and rejects non-numeric or non-positive values"
  );

  const validWishlistBody = addWishlistSchema.safeParse({ movieId: 550 });
  const validWishlistStrBody = addWishlistSchema.safeParse({ movieId: "550" });
  const invalidWishlistEmpty = addWishlistSchema.safeParse({});
  const invalidWishlistNeg = addWishlistSchema.safeParse({ movieId: -5 });
  assert(
    validWishlistBody.success &&
      validWishlistStrBody.success &&
      !invalidWishlistEmpty.success &&
      !invalidWishlistNeg.success,
    "addWishlistSchema validates positive integer IDs and rejects empty/negative payloads"
  );

  // ----------------------------------------------------
  // 3. AppError Hierarchy & Factory Methods
  // ----------------------------------------------------
  console.log("\n[Group 3] AppError Factory Methods");

  const badReq = AppError.badRequest("Invalid input");
  const notFound = AppError.notFound("Resource not found", "MOVIE_NOT_FOUND");
  const conflict = AppError.conflict("Already exists", "MOVIE_ALREADY_IN_WISHLIST");
  const unavail = AppError.serviceUnavailable("Down", "MOVIE_SERVICE_UNAVAILABLE");

  assert(
    badReq.statusCode === 400 &&
      badReq.code === "INVALID_REQUEST" &&
      notFound.statusCode === 404 &&
      notFound.code === "MOVIE_NOT_FOUND" &&
      conflict.statusCode === 409 &&
      conflict.code === "MOVIE_ALREADY_IN_WISHLIST" &&
      unavail.statusCode === 503 &&
      unavail.code === "MOVIE_SERVICE_UNAVAILABLE",
    "AppError factory helpers construct accurate status codes and standardized error codes"
  );

  // ----------------------------------------------------
  // 4. In-Memory Cache Engine
  // ----------------------------------------------------
  console.log("\n[Group 4] InMemoryCache Engine");

  const cache = new InMemoryCache<string>({ name: "UnitCache", defaultTtlMs: 50, maxSize: 3 });
  cache.set("a", "1");
  cache.set("b", "2");
  cache.set("c", "3");

  const hitA = cache.get("a");
  const missZ = cache.get("z");
  assert(hitA === "1" && missZ === undefined, "InMemoryCache accurately registers hits and misses");

  // LRU Eviction: Accessing 'a' makes 'b' the oldest
  cache.set("d", "4"); // triggers eviction of 'b'
  assert(
    cache.get("b") === undefined && cache.get("a") === "1" && cache.get("d") === "4",
    "InMemoryCache evicts least-recently-used items when exceeding maxSize"
  );

  // TTL expiration test
  await new Promise((r) => setTimeout(r, 60));
  assert(cache.get("a") === undefined, "InMemoryCache automatically expires entries past TTL");

  return { passed: passedCount, failed: failedCount };
}

if (require.main === module) {
  runUnitTests().then(({ passed, failed }) => {
    console.log(`\nLayer 1 Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  });
}
