/**
 * Application Movie Domain Types
 * Represents the normalized, application-owned movie models consumed by our API and frontend.
 */

export interface Genre {
  id: number;
  name: string;
}

export type MovieSort = "popularity" | "rating" | "release_date" | "title";

export interface MovieQuery {
  search?: string;
  genre?: number;
  year?: number;
  sort: MovieSort;
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  releaseDate: string | null;
  genres: Genre[];
}

export interface MovieDetails extends Movie {
  tagline: string | null;
  runtime: number | null;
  status: string;
  budget: number;
  revenue: number;
  homepage: string | null;
  imdbId: string | null;
  originalLanguage: string;
}

export interface MovieListResponse {
  movies: Movie[];
  pagination: PaginationMeta;
}

export interface MovieDetailResponse {
  movie: MovieDetails;
}

export interface GenreListResponse {
  genres: Genre[];
}
