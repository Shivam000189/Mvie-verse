import type {
  MovieQuery,
  MovieListResponse,
  MovieDetailResponse,
  GenreListResponse,
} from "../types/movie.types";

/**
 * Common abstraction contract for Movie Providers.
 * Both MockMovieProvider and TmdbMovieProvider implement this interface.
 */
export interface IMovieProvider {
  /**
   * Retrieves a paginated list of movies based on search, filter, sort, and pagination criteria.
   */
  getMovies(query: MovieQuery): Promise<MovieListResponse>;

  /**
   * Retrieves full details for a specific movie by numeric ID.
   */
  getMovieById(id: number): Promise<MovieDetailResponse>;

  /**
   * Retrieves all available movie genres.
   */
  getGenres(): Promise<GenreListResponse>;
}
