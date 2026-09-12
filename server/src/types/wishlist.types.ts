import type { Movie } from "./movie.types";

/**
 * Application Wishlist Domain Types
 */

export interface WishlistMovieResponse {
  items: Movie[];
  total: number;
}

export interface WishlistStatusResponse {
  movieId: number;
  isInWishlist: boolean;
}

export interface WishlistActionResponse {
  movieId: number;
  message: string;
  success: boolean;
  addedAt?: string;
}

export interface WishlistRemoveResponse {
  movieId: number;
  removed: boolean;
}

export interface AddWishlistInput {
  movieId: number;
}
