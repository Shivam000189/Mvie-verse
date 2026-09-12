import { tmdbService } from "./tmdb.service";
import { MovieMapper } from "../utils/movie.mapper";
import { AppError } from "../utils/app-error";
import { TmdbError } from "../utils/tmdb-error";
import type {
  MovieQuery,
  MovieListResponse,
  MovieDetailResponse,
  GenreListResponse,
  MovieSort,
  PaginationMeta,
} from "../types/movie.types";
import type { TmdbPaginatedResponse, TmdbMovie } from "../types/tmdb.types";

export class MovieService {
  /**
   * Maps application-level sort options to TMDB sort_by parameters.
   */
  private mapSortOption(sort: MovieSort): string {
    switch (sort) {
      case "rating":
        return "vote_average.desc";
      case "release_date":
        return "primary_release_date.desc";
      case "title":
        return "original_title.asc";
      case "popularity":
      default:
        return "popularity.desc";
    }
  }

  /**
   * Retrieves a paginated list of movies supporting search, filters, sorting, and pagination.
   */
  public async getMovies(query: Partial<MovieQuery> = {}): Promise<MovieListResponse> {
    try {
      const safeQuery: MovieQuery = {
        search: query.search,
        genre: query.genre,
        year: query.year,
        sort: query.sort ?? "popularity",
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      };

      let tmdbData: TmdbPaginatedResponse<TmdbMovie>;

      if (safeQuery.search) {
        // Strategy A: Search Mode
        tmdbData = await tmdbService.searchMovies({
          query: safeQuery.search,
          page: safeQuery.page,
          year: safeQuery.year,
        });

        // Filter by genre in search results if genre is also provided
        if (safeQuery.genre) {
          const targetGenre = safeQuery.genre;
          tmdbData.results = tmdbData.results.filter((movie) =>
            movie.genre_ids.includes(targetGenre)
          );
        }
      } else {
        // Strategy B: Discovery & Filter Mode
        const sortBy = this.mapSortOption(safeQuery.sort);
        tmdbData = await tmdbService.discoverMovies({
          page: safeQuery.page,
          genre: safeQuery.genre,
          year: safeQuery.year,
          sortBy,
        });
      }

      let movies = MovieMapper.toMovieList(tmdbData.results);

      // Apply limit if client requested fewer items than TMDB page size (20)
      if (safeQuery.limit < movies.length) {
        movies = movies.slice(0, safeQuery.limit);
      }

      const totalPages = tmdbData.total_pages;
      const totalResults = tmdbData.total_results;

      const pagination: PaginationMeta = {
        page: safeQuery.page,
        limit: safeQuery.limit,
        totalPages,
        totalResults,
        hasNextPage: safeQuery.page < totalPages,
        hasPrevPage: safeQuery.page > 1,
      };

      return {
        movies,
        pagination,
      };
    } catch (error) {
      this.handleServiceError(error);
    }
  }

  /**
   * Retrieves all movie genres directly from TMDB.
   */
  public async getGenres(): Promise<GenreListResponse> {
    try {
      const tmdbGenres = await tmdbService.getGenres();
      return {
        genres: tmdbGenres.map((g) => ({ id: g.id, name: g.name })),
      };
    } catch (error) {
      this.handleServiceError(error);
    }
  }

  /**
   * Retrieves full details for a specific movie by ID.
   */
  public async getMovieById(id: number): Promise<MovieDetailResponse> {
    try {
      const tmdbDetails = await tmdbService.getMovieDetails(id);
      const movie = MovieMapper.toMovieDetails(tmdbDetails);

      return { movie };
    } catch (error) {
      this.handleServiceError(error);
    }
  }

  /**
   * Translates internal TMDB errors into domain-level Application errors.
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
