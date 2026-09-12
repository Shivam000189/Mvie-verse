import type { Request, Response, NextFunction } from "express";
import { movieService } from "../services/movie.service";
import { movieQuerySchema, movieIdParamSchema } from "../schemas/movie.schema";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";

export class MovieController {
  /**
   * GET /api/movies
   * Supports search, genre, year, sort, and pagination.
   */
  public async getMovies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = movieQuerySchema.safeParse(req.query);

      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw AppError.badRequest(
          firstIssue?.message || "Invalid query parameters",
          "INVALID_REQUEST",
          validation.error.issues
        );
      }

      const result = await movieService.getMovies(validation.data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/movies/genres
   * Returns list of all movie genres available on TMDB.
   */
  public async getGenres(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await movieService.getGenres();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/movies/:id
   * Validates movie ID parameter and returns normalized movie details.
   */
  public async getMovieById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = movieIdParamSchema.safeParse(req.params);

      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw AppError.badRequest(
          firstIssue?.message || "Invalid movie ID",
          "INVALID_MOVIE_ID"
        );
      }

      const movieId = validation.data.id;
      const result = await movieService.getMovieById(movieId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const movieController = new MovieController();
