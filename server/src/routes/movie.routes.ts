import { Router } from "express";
import { movieController } from "../controllers/movie.controller";

const router = Router();

/**
 * Movie Routes
 * Base Path: /api/movies
 */

// GET /api/movies - Retrieve paginated movies with search, filter, and sorting
router.get("/", (req, res, next) => movieController.getMovies(req, res, next));

// GET /api/movies/genres - Retrieve list of available genres (MUST precede /:id)
router.get("/genres", (req, res, next) => movieController.getGenres(req, res, next));

// GET /api/movies/:id - Retrieve movie details by ID
router.get("/:id", (req, res, next) => movieController.getMovieById(req, res, next));

export default router;
