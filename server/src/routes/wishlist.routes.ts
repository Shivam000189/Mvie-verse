import { Router } from "express";
import { wishlistController } from "../controllers/wishlist.controller";

const router = Router();

/**
 * Wishlist Routes
 * Base Path: /api/wishlist
 */

// GET /api/wishlist - Get all wishlisted movies
router.get("/", (req, res, next) => wishlistController.getWishlist(req, res, next));

// POST /api/wishlist - Add a movie to wishlist
router.post("/", (req, res, next) => wishlistController.addToWishlist(req, res, next));

// GET /api/wishlist/:movieId - Check wishlist status for a movie
router.get("/:movieId", (req, res, next) =>
  wishlistController.checkWishlistStatus(req, res, next)
);

// DELETE /api/wishlist/:movieId - Remove a movie from wishlist
router.delete("/:movieId", (req, res, next) =>
  wishlistController.removeFromWishlist(req, res, next)
);

export default router;
