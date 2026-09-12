import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { movieService } from "./movie.service";
import { AppError } from "../utils/app-error";
import type {
  WishlistMovieResponse,
  WishlistStatusResponse,
  WishlistActionResponse,
  WishlistRemoveResponse,
} from "../types/wishlist.types";
import type { Movie } from "../types/movie.types";

export class WishlistService {
  /**
   * Retrieves all movies saved in the user's wishlist, ordered by newest first (createdAt DESC).
   * Resolves movie details through the MovieService layer with partial-failure resilience.
   */
  public async getWishlist(): Promise<WishlistMovieResponse> {
    try {
      // 1. Fetch saved movie IDs from PostgreSQL ordered by newest first
      const savedItems = await prisma.wishlist.findMany({
        orderBy: { createdAt: "desc" },
      });

      if (savedItems.length === 0) {
        return { items: [], total: 0 };
      }

      // 2. Fetch full movie metadata with bounded concurrency (max 5 simultaneous requests) via MovieService
      const CONCURRENCY_LIMIT = 5;
      const results: PromiseSettledResult<{ movie: Movie }>[] = [];

      for (let i = 0; i < savedItems.length; i += CONCURRENCY_LIMIT) {
        const batch = savedItems.slice(i, i + CONCURRENCY_LIMIT);
        const batchPromises = batch.map((item) =>
          movieService.getMovieById(item.movieId)
        );
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }

      // 3. Normalize responses with graceful fallback for unavailable provider items
      const items: Movie[] = [];

      results.forEach((result, index) => {
        const savedItem = savedItems[index]!;

        if (result.status === "fulfilled") {
          items.push(result.value.movie);
        } else {
          console.warn(
            `⚠️ [Wishlist Notice]: Provider metadata could not be fetched for movie ID ${savedItem.movieId}:`,
            result.reason?.message || result.reason
          );

          // Graceful fallback representation (do not delete or crash)
          items.push({
            id: savedItem.movieId,
            title: `Movie #${savedItem.movieId}`,
            overview: "Metadata temporarily unavailable from provider",
            posterUrl: null,
            backdropUrl: null,
            rating: 0,
            voteCount: 0,
            releaseDate: savedItem.createdAt.toISOString().split("T")[0] ?? null,
            genres: [],
          });
        }
      });

      return {
        items,
        total: items.length,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("🔥 [Wishlist Service Error]:", error);
      throw new AppError("Failed to retrieve wishlist", 500, "INTERNAL_SERVER_ERROR");
    }
  }

  /**
   * Adds a movie to the wishlist.
   * Verifies movie existence through MovieService and relies on the PostgreSQL unique constraint to prevent duplicates.
   */
  public async addToWishlist(movieId: number): Promise<WishlistActionResponse> {
    try {
      // 1. Verify that the movie exists in the provider before saving
      try {
        await movieService.getMovieById(movieId);
      } catch (err) {
        if (err instanceof AppError && err.code === "MOVIE_NOT_FOUND") {
          throw AppError.notFound("Cannot wishlist non-existent movie", "MOVIE_NOT_FOUND");
        }
        // If external service is slow or times out, proceed to save user intent
      }

      // 2. Insert into PostgreSQL with unique constraint protection
      const entry = await prisma.wishlist.create({
        data: { movieId },
      });

      return {
        success: true,
        message: "Movie added to wishlist",
        movieId: entry.movieId,
        addedAt: entry.createdAt.toISOString(),
      };
    } catch (error) {
      // Handle PostgreSQL Unique Constraint Violation (P2002)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw AppError.conflict(
          "Movie is already in the wishlist.",
          "MOVIE_ALREADY_IN_WISHLIST"
        );
      }

      if (error instanceof AppError) throw error;

      console.error("🔥 [Add Wishlist Error]:", error);
      throw new AppError("Failed to add movie to wishlist", 500, "INTERNAL_SERVER_ERROR");
    }
  }

  /**
   * Removes a movie from the wishlist by movieId.
   */
  public async removeFromWishlist(movieId: number): Promise<WishlistRemoveResponse> {
    try {
      // 1. Check if the movie exists in the wishlist
      const existing = await prisma.wishlist.findUnique({
        where: { movieId },
      });

      if (!existing) {
        throw AppError.notFound(
          "Wishlist item not found",
          "WISHLIST_ITEM_NOT_FOUND"
        );
      }

      // 2. Delete from PostgreSQL
      await prisma.wishlist.delete({
        where: { movieId },
      });

      return {
        movieId,
        removed: true,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error("🔥 [Remove Wishlist Error]:", error);
      throw new AppError("Failed to remove movie from wishlist", 500, "INTERNAL_SERVER_ERROR");
    }
  }

  /**
   * Checks whether a movie is currently in the wishlist.
   */
  public async checkWishlistStatus(movieId: number): Promise<WishlistStatusResponse> {
    try {
      const item = await prisma.wishlist.findUnique({
        where: { movieId },
      });

      return {
        movieId,
        isInWishlist: Boolean(item),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error("🔥 [Check Wishlist Status Error]:", error);
      throw new AppError("Failed to check wishlist status", 500, "INTERNAL_SERVER_ERROR");
    }
  }
}

export const wishlistService = new WishlistService();
