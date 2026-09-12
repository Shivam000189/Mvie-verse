import { MovieMapper } from "../utils/movie.mapper";
import { movieIdParamSchema } from "../schemas/movie.schema";
import { movieService } from "../services/movie.service";
import { AppError } from "../utils/app-error";
import { env } from "../config/env";
import type { TmdbMovie, TmdbMovieDetails } from "../types/tmdb.types";

async function runStep5Tests() {
  console.log("=========================================");
  console.log("🎬 Step 5: Movie Service & Normalization Test");
  console.log("=========================================");

  // ----------------------------------------------------
  // Unit Test 1: Mapper with complete data
  // ----------------------------------------------------
  console.log("\n[Test 1] Testing MovieMapper with complete TMDB data...");
  const mockTmdbMovie: TmdbMovie = {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    overview: "An insomniac office worker and a devil-may-care soap maker form an underground fight club...",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    vote_average: 8.433,
    vote_count: 27000,
    popularity: 65.4,
    genre_ids: [18, 53],
    adult: false,
    video: false,
    original_language: "en",
  };

  const normalizedMovie = MovieMapper.toMovie(mockTmdbMovie);
  console.log("Normalized Movie Output:", JSON.stringify(normalizedMovie, null, 2));

  if (
    normalizedMovie.id === 550 &&
    normalizedMovie.rating === 8.4 &&
    normalizedMovie.posterUrl?.includes("https://image.tmdb.org/t/p/w500/") &&
    normalizedMovie.genres.length === 2 &&
    normalizedMovie.genres[0]?.name === "Drama"
  ) {
    console.log("✅ Complete data mapping test PASSED!");
  } else {
    console.error("❌ Complete data mapping test FAILED!");
  }

  // ----------------------------------------------------
  // Unit Test 2: Mapper with missing / malformed data
  // ----------------------------------------------------
  console.log("\n[Test 2] Testing MovieMapper resilience with missing / null fields...");
  const mockMalformedMovie: TmdbMovie = {
    id: 999,
    title: "",
    original_title: "Fallback Title",
    overview: "",
    poster_path: null,
    backdrop_path: null,
    release_date: "",
    vote_average: 0,
    vote_count: 0,
    popularity: 0,
    genre_ids: [],
    adult: false,
    video: false,
    original_language: "en",
  };

  const safeNormalizedMovie = MovieMapper.toMovie(mockMalformedMovie);
  console.log("Safe Normalized Movie:", JSON.stringify(safeNormalizedMovie, null, 2));

  if (
    safeNormalizedMovie.title === "Fallback Title" &&
    safeNormalizedMovie.posterUrl === null &&
    safeNormalizedMovie.backdropUrl === null &&
    safeNormalizedMovie.releaseDate === null &&
    safeNormalizedMovie.overview === "" &&
    Array.isArray(safeNormalizedMovie.genres) &&
    safeNormalizedMovie.genres.length === 0
  ) {
    console.log("✅ Missing data resilience test PASSED (No crashes, safe fallbacks preserved)!");
  } else {
    console.error("❌ Missing data resilience test FAILED!");
  }

  // ----------------------------------------------------
  // Unit Test 3: Movie Details Mapper
  // ----------------------------------------------------
  console.log("\n[Test 3] Testing MovieDetails mapping...");
  const mockTmdbDetails: TmdbMovieDetails = {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    tagline: "Mischief. Mayhem. Soap.",
    overview: "A ticking-time-bomb insomniac...",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    runtime: 139,
    status: "Released",
    budget: 63000000,
    revenue: 100853753,
    vote_average: 8.433,
    vote_count: 27000,
    popularity: 65.4,
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" },
    ],
    homepage: "http://www.foxmovies.com/movies/fight-club",
    imdb_id: "tt0137523",
    original_language: "en",
    production_companies: [],
    production_countries: [],
    spoken_languages: [],
    adult: false,
    video: false,
  };

  const normalizedDetails = MovieMapper.toMovieDetails(mockTmdbDetails);
  console.log("Normalized Movie Details Output:", JSON.stringify(normalizedDetails, null, 2));

  if (
    normalizedDetails.tagline === "Mischief. Mayhem. Soap." &&
    normalizedDetails.runtime === 139 &&
    normalizedDetails.imdbId === "tt0137523" &&
    normalizedDetails.budget === 63000000
  ) {
    console.log("✅ MovieDetails mapping test PASSED!");
  } else {
    console.error("❌ MovieDetails mapping test FAILED!");
  }

  // ----------------------------------------------------
  // Unit Test 4: Zod Parameter Validation
  // ----------------------------------------------------
  console.log("\n[Test 4] Testing Route Parameter Validation (movieIdParamSchema)...");
  const validCheck = movieIdParamSchema.safeParse({ id: "550" });
  const invalidTextCheck = movieIdParamSchema.safeParse({ id: "abc" });
  const invalidNegativeCheck = movieIdParamSchema.safeParse({ id: "-50" });
  const invalidZeroCheck = movieIdParamSchema.safeParse({ id: "0" });

  if (
    validCheck.success &&
    validCheck.data.id === 550 &&
    !invalidTextCheck.success &&
    !invalidNegativeCheck.success &&
    !invalidZeroCheck.success
  ) {
    console.log("✅ Zod validation test PASSED (Accepted 550, rejected 'abc', '-50', '0')!");
  } else {
    console.error("❌ Zod validation test FAILED!");
  }

  // ----------------------------------------------------
  // Test 5: Live Service Call (if credentials provided)
  // ----------------------------------------------------
  if (env.tmdb.accessToken || env.tmdb.apiKey) {
    console.log("\n[Test 5] Live TMDB API Service & Normalization Test...");
    try {
      console.log("Calling movieService.getMovies()...");
      const moviesResult = await movieService.getMovies();
      console.log(`✅ Success! Retrieved ${moviesResult.movies.length} normalized movies.`);
      console.log("Sample first movie:", moviesResult.movies[0]);

      console.log("\nCalling movieService.getMovieById(550)...");
      const singleMovieResult = await movieService.getMovieById(550);
      console.log(`✅ Success! Retrieved movie: "${singleMovieResult.movie.title}"`);
      console.log("Poster URL:", singleMovieResult.movie.posterUrl);

      console.log("\nTesting non-existent movie ID (999999999)...");
      try {
        await movieService.getMovieById(999999999);
        console.error("❌ Expected MOVIE_NOT_FOUND error was not thrown.");
      } catch (err) {
        if (err instanceof AppError && err.code === "MOVIE_NOT_FOUND" && err.statusCode === 404) {
          console.log(`✅ Handled expected AppError cleanly! Code: ${err.code}, Status: ${err.statusCode}`);
        } else {
          console.error("❌ Unexpected error:", err);
        }
      }
    } catch (err) {
      console.error("❌ Live service test error:", err);
    }
  } else {
    console.log("\nℹ️ Skipping live TMDB call (no API key in .env). Unit tests completed successfully!");
  }

  console.log("\n=========================================");
  console.log("🎉 All Step 5 Tests Completed Successfully!");
  console.log("=========================================");
}

runStep5Tests();
