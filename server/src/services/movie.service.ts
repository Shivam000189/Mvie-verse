import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { TmdbError } from "../utils/tmdb-error";
import { InMemoryCache } from "../utils/cache";
import type { IMovieProvider } from "../providers/movie-provider.interface";
import { MockMovieProvider } from "../providers/mock-movie.provider";
import { TmdbMovieProvider } from "../providers/tmdb-movie.provider";
import type {
  MovieQuery,
  MovieListResponse,
  MovieDetailResponse,
  GenreListResponse,
} from "../types/movie.types";

export class MovieService {
  private provider: IMovieProvider;

  // Caches with domain-specific TTLs and bounded capacities
  private readonly genreCache = new InMemoryCache<GenreListResponse>({
    name: "GenreCache",
    defaultTtlMs: 60 * 60 * 1000, // 1 hour (static taxonomy)
    maxSize: 10,
  });

  private readonly movieDetailCache = new InMemoryCache<MovieDetailResponse>({
    name: "MovieDetailCache",
    defaultTtlMs: 10 * 60 * 1000, // 10 minutes (movie metadata)
    maxSize: 500,
  });

  private readonly movieListCache = new InMemoryCache<MovieListResponse>({
    name: "MovieListCache",
    defaultTtlMs: 2 * 60 * 1000, // 2 minutes (discovery & search listings)
    maxSize: 200,
  });

  constructor(customProvider?: IMovieProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else if (env.movieProvider === "tmdb" && (env.tmdb.apiKey || env.tmdb.accessToken)) {
      this.provider = new TmdbMovieProvider();
    } else {
      this.provider = new MockMovieProvider();
    }
  }

  /**
   * Sets or updates the active movie provider (useful for testing and runtime switching).
   */
  public setProvider(newProvider: IMovieProvider): void {
    this.provider = newProvider;
    this.clearCache();
  }

  /**
   * Gets current active provider instance.
   */
  public getProvider(): IMovieProvider {
    return this.provider;
  }

  /**
   * Generates a deterministic, normalized cache key from query parameters.
   */
  private generateMovieListCacheKey(query: MovieQuery): string {
    const parts = [
      `search=${query.search ? query.search.trim().toLowerCase() : ""}`,
      `genre=${query.genre ?? ""}`,
      `year=${query.year ?? ""}`,
      `sort=${query.sort ?? "popularity"}`,
      `page=${query.page ?? 1}`,
      `limit=${query.limit ?? 20}`,
    ];
    return `movies:${parts.join(":")}`;
  }

  /**
   * Retrieves a paginated list of movies supporting search, filters, sorting, and pagination.
   * Utilizes in-memory caching with a 2-minute TTL.
   */
  public async getMovies(query: Partial<MovieQuery> = {}): Promise<MovieListResponse> {
    const safeQuery: MovieQuery = {
      search: query.search,
      genre: query.genre,
      year: query.year,
      sort: query.sort ?? "popularity",
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };

    const cacheKey = this.generateMovieListCacheKey(safeQuery);

    try {
      return await this.movieListCache.getOrSet(cacheKey, async () => {
        return await this.provider.getMovies(safeQuery);
      });
    } catch (error) {
      this.handleServiceError(error);
    }
  }

  /**
   * Retrieves all movie genres with a 1-hour in-memory cache.
   */
  public async getGenres(): Promise<GenreListResponse> {
    const cacheKey = "genres:en-US";

    try {
      return await this.genreCache.getOrSet(cacheKey, async () => {
        return await this.provider.getGenres();
      });
    } catch (error) {
      this.handleServiceError(error);
    }
  }

  /**
   * Retrieves full details for a specific movie by ID with a 10-minute in-memory cache
   * and in-flight request coalescing.
   */
  public async getMovieById(id: number): Promise<MovieDetailResponse> {
    const cacheKey = `movie:${id}`;

    try {
      return await this.movieDetailCache.getOrSet(cacheKey, async () => {
        return await this.provider.getMovieById(id);
      });
    } catch (error) {
      this.handleServiceError(error);
    }
  }

  /**
   * Clears all internal caches (useful for testing and admin resets).
   */
  public clearCache(): void {
    this.genreCache.clear();
    this.movieDetailCache.clear();
    this.movieListCache.clear();
  }

  /**
   * Exposes cache observability statistics.
   */
  public getCacheStats() {
    return {
      genres: this.genreCache.getStats(),
      movieDetails: this.movieDetailCache.getStats(),
      movieLists: this.movieListCache.getStats(),
    };
  }

  /**
   * Translates internal TMDB or Provider errors into domain-level Application errors.
   */
  private handleServiceError(error: unknown): never {
    if (error instanceof TmdbError) {
      if (error.code === "TMDB_NOT_FOUND") {
        throw AppError.notFound("Movie not found", "MOVIE_NOT_FOUND");
      }

      if (
        error.code === "TMDB_TIMEOUT" ||
        error.code === "TMDB_UNAVAILABLE" ||
        error.code === "TMDB_NETWORK_ERROR" ||
        error.code === "TMDB_RATE_LIMITED"
      ) {
        throw AppError.serviceUnavailable(
          "Movie service is temporarily unavailable",
          "MOVIE_SERVICE_UNAVAILABLE"
        );
      }
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Failed to process movie request", 500, "INTERNAL_SERVER_ERROR");
  }
}

export const movieService = new MovieService();
