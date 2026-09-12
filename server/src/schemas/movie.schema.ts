import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Validates query parameters for GET /api/movies
 * Supports search, genre, year, sorting, and pagination with robust defaults and boundaries.
 */
export const movieQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),

  genre: z
    .coerce
    .number({ message: "Genre must be a valid number" })
    .int({ message: "Genre ID must be an integer" })
    .positive({ message: "Genre ID must be a positive integer" })
    .optional(),

  year: z
    .coerce
    .number({ message: "Year must be a valid number" })
    .int({ message: "Year must be an integer" })
    .min(1888, { message: "Year must be 1888 (the birth of cinema) or later" })
    .max(CURRENT_YEAR + 5, { message: `Year cannot exceed ${CURRENT_YEAR + 5}` })
    .optional(),

  sort: z
    .enum(["popularity", "rating", "release_date", "title"], {
      message: "Invalid sort option. Allowed values: 'popularity', 'rating', 'release_date', 'title'",
    })
    .default("popularity"),

  page: z
    .coerce
    .number({ message: "Page must be a valid number" })
    .int({ message: "Page must be an integer" })
    .min(1, { message: "Page must be at least 1" })
    .default(1),

  limit: z
    .coerce
    .number({ message: "Limit must be a valid number" })
    .int({ message: "Limit must be an integer" })
    .min(1, { message: "Limit must be at least 1" })
    .max(100, { message: "Limit cannot exceed 100" })
    .default(20),
});

export type MovieQueryInput = z.infer<typeof movieQuerySchema>;

/**
 * Validates route parameter :id as a strictly positive integer.
 */
export const movieIdParamSchema = z.object({
  id: z
    .string()
    .min(1, { message: "Movie ID is required" })
    .regex(/^[1-9]\d*$/, { message: "Movie ID must be a positive integer" })
    .transform((val) => parseInt(val, 10)),
});

export type MovieIdParam = z.infer<typeof movieIdParamSchema>;
