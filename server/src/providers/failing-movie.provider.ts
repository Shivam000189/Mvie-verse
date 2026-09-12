import type { IMovieProvider } from "./movie-provider.interface";
import { AppError } from "../utils/app-error";
import type {
  MovieQuery,
  MovieListResponse,
  MovieDetailResponse,
  GenreListResponse,
} from "../types/movie.types";

export type FailureMode =
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "MALFORMED_PAYLOAD"
  | "DELAY";

export class FailingMovieProvider implements IMovieProvider {
  private mode: FailureMode;
  private delayMs: number;

  constructor(mode: FailureMode, delayMs = 50) {
    this.mode = mode;
    this.delayMs = delayMs;
  }

  public setMode(mode: FailureMode, delayMs = 50): void {
    this.mode = mode;
    this.delayMs = delayMs;
  }

  private async triggerFailure(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    switch (this.mode) {
      case "TIMEOUT":
        throw AppError.serviceUnavailable(
          "Movie service request timed out after 8000ms",
          "MOVIE_SERVICE_UNAVAILABLE"
        );
      case "SERVICE_UNAVAILABLE":
        throw AppError.serviceUnavailable(
          "Movie service is temporarily unavailable",
          "MOVIE_SERVICE_UNAVAILABLE"
        );
      case "RATE_LIMITED":
        throw new AppError(
          "Movie service is temporarily rate limited. Please try again later.",
          429,
          "MOVIE_SERVICE_RATE_LIMITED"
        );
      case "NOT_FOUND":
        throw AppError.notFound("Movie was not found.", "MOVIE_NOT_FOUND");
      case "MALFORMED_PAYLOAD":
        // Fall through to caller or throw corrupted data
        return;
      case "DELAY":
        return;
    }
  }

  public async getMovies(_query: MovieQuery): Promise<MovieListResponse> {
    await this.triggerFailure();

    if (this.mode === "MALFORMED_PAYLOAD") {
      // Return payload with corrupted structure for testing normalizer resilience
      return {
        movies: [
          {
            id: 999,
            title: null as unknown as string,
            overview: null as unknown as string,
            posterUrl: null,
            backdropUrl: null,
            rating: "NaN" as unknown as number,
            voteCount: 0,
            releaseDate: null,
            genres: "not-an-array" as unknown as [],
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 1,
          totalResults: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return {
      movies: [],
      pagination: {
        page: 1,
        limit: 20,
        totalPages: 0,
        totalResults: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  public async getMovieById(id: number): Promise<MovieDetailResponse> {
    await this.triggerFailure();

    if (this.mode === "MALFORMED_PAYLOAD") {
      return {
        movie: {
          id,
          title: null as unknown as string,
          overview: "",
          posterUrl: null,
          backdropUrl: null,
          rating: undefined as unknown as number,
          voteCount: 0,
          releaseDate: null,
          genres: null as unknown as [],
          tagline: null,
          runtime: null,
          status: "Unknown",
          budget: 0,
          revenue: 0,
          homepage: null,
          imdbId: null,
          originalLanguage: "en",
        },
      };
    }

    throw AppError.notFound(`Movie with ID ${id} was not found.`, "MOVIE_NOT_FOUND");
  }

  public async getGenres(): Promise<GenreListResponse> {
    await this.triggerFailure();
    return { genres: [] };
  }
}
