import { tmdbClient } from "../config/tmdb";
import { env } from "../config/env";
import { handleTmdbError } from "../utils/tmdb-error";
import type {
  TmdbMovie,
  TmdbMovieDetails,
  TmdbPaginatedResponse,
  TmdbGenreListResponse,
  TmdbGenre,
} from "../types/tmdb.types";

export type TmdbPosterSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
export type TmdbBackdropSize = "w300" | "w780" | "w1280" | "original";

export interface TmdbDiscoverParams {
  page?: number;
  genre?: number;
  year?: number;
  sortBy?: string;
}

export interface TmdbSearchParams {
  query: string;
  page?: number;
  year?: number;
}

export class TmdbService {
  /**
   * Fetches a paginated list of popular movies from TMDB.
   * Endpoint: GET /movie/popular
   */
  public async getPopularMovies(page = 1): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    try {
      const response = await tmdbClient.get<TmdbPaginatedResponse<TmdbMovie>>("/movie/popular", {
        params: {
          page,
          language: "en-US",
        },
      });

      return response.data;
    } catch (error) {
      return handleTmdbError(error);
    }
  }

  /**
   * Discovers movies with criteria (genre, year, sorting).
   * Endpoint: GET /discover/movie
   */
  public async discoverMovies(params: TmdbDiscoverParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    try {
      const queryParams: Record<string, unknown> = {
        page: params.page ?? 1,
        language: "en-US",
        include_adult: false,
      };

      if (params.genre) {
        queryParams.with_genres = params.genre;
      }

      if (params.year) {
        queryParams.primary_release_year = params.year;
      }

      if (params.sortBy) {
        queryParams.sort_by = params.sortBy;

        // If sorting by rating, ensure enough votes for quality results
        if (params.sortBy.startsWith("vote_average")) {
          queryParams["vote_count.gte"] = 100;
        }
      }

      const response = await tmdbClient.get<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      return handleTmdbError(error);
    }
  }

  /**
   * Searches movies by text keyword.
   * Endpoint: GET /search/movie
   */
  public async searchMovies(params: TmdbSearchParams): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    try {
      const queryParams: Record<string, unknown> = {
        query: params.query,
        page: params.page ?? 1,
        language: "en-US",
        include_adult: false,
      };

      if (params.year) {
        queryParams.primary_release_year = params.year;
      }

      const response = await tmdbClient.get<TmdbPaginatedResponse<TmdbMovie>>("/search/movie", {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      return handleTmdbError(error);
    }
  }

  /**
   * Fetches official list of movie genres from TMDB.
   * Endpoint: GET /genre/movie/list
   */
  public async getGenres(): Promise<TmdbGenre[]> {
    try {
      const response = await tmdbClient.get<TmdbGenreListResponse>("/genre/movie/list", {
        params: {
          language: "en-US",
        },
      });

      return response.data.genres;
    } catch (error) {
      return handleTmdbError(error);
    }
  }

  /**
   * Fetches detailed information for a specific movie by its TMDB ID.
   * Endpoint: GET /movie/{movie_id}
   */
  public async getMovieDetails(movieId: number | string): Promise<TmdbMovieDetails> {
    try {
      const response = await tmdbClient.get<TmdbMovieDetails>(`/movie/${movieId}`, {
        params: {
          language: "en-US",
        },
      });

      return response.data;
    } catch (error) {
      return handleTmdbError(error);
    }
  }

  /**
   * Constructs a full image URL from a relative TMDB image path.
   */
  public buildImageUrl(
    path: string | null,
    size: TmdbPosterSize | TmdbBackdropSize = "w500"
  ): string | null {
    if (!path) return null;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${env.tmdb.imageBaseUrl}/${size}${cleanPath}`;
  }
}

export const tmdbService = new TmdbService();
