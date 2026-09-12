import type { Request, Response, NextFunction } from "express";
import { wishlistService } from "../services/wishlist.service";
import { addWishlistSchema, wishlistParamSchema } from "../schemas/wishlist.schema";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";

export class WishlistController {
  /**
   * GET /api/wishlist
   * Retrieves all movies saved in the user's wishlist.
   */
  public async getWishlist(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await wishlistService.getWishlist();
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wishlist
   * Adds a movie to the wishlist by its movieId.
   */
  public async addToWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = addWishlistSchema.safeParse(req.body);

      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw AppError.badRequest(
          firstIssue?.message || "Invalid movie ID",
          "INVALID_MOVIE_ID",
          validation.error.issues
        );
      }

      const result = await wishlistService.addToWishlist(validation.data.movieId);
      sendSuccess(res, result, 201, "Movie added to wishlist");
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/wishlist/:movieId
   * Removes a movie from the wishlist.
   */
  public async removeFromWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = wishlistParamSchema.safeParse(req.params);

      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw AppError.badRequest(
          firstIssue?.message || "Invalid movie ID",
          "INVALID_MOVIE_ID"
        );
      }

      const result = await wishlistService.removeFromWishlist(validation.data.movieId);
      sendSuccess(res, result, 200, "Movie removed from wishlist");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/wishlist/:movieId
   * Checks if a specific movie is currently in the wishlist.
   */
  public async checkWishlistStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = wishlistParamSchema.safeParse(req.params);

      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw AppError.badRequest(
          firstIssue?.message || "Invalid movie ID",
          "INVALID_MOVIE_ID"
        );
      }

      const result = await wishlistService.checkWishlistStatus(validation.data.movieId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const wishlistController = new WishlistController();
