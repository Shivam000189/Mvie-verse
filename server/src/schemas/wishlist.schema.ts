import { z } from "zod";

/**
 * Validates request body for POST /api/wishlist
 * Example: { "movieId": 550 }
 */
export const addWishlistSchema = z.object({
  movieId: z
    .coerce
    .number({ message: "Movie ID must be a valid number" })
    .int({ message: "Movie ID must be an integer" })
    .positive({ message: "Movie ID must be a positive integer" }),
});

export type AddWishlistSchemaInput = z.infer<typeof addWishlistSchema>;

/**
 * Validates route parameter :movieId for GET/DELETE /api/wishlist/:movieId
 */
export const wishlistParamSchema = z.object({
  movieId: z
    .string()
    .min(1, { message: "Movie ID is required" })
    .regex(/^[1-9]\d*$/, { message: "Movie ID must be a positive integer" })
    .transform((val) => parseInt(val, 10)),
});

export type WishlistParamInput = z.infer<typeof wishlistParamSchema>;
