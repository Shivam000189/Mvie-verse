import { tmdbService } from "../services/tmdb.service";
import type { TmdbMovie, TmdbMovieDetails } from "../types/tmdb.types";
import type { Movie, MovieDetails, Genre } from "../types/movie.types";

/**
 * Standard TMDB Genre ID to Name mapping for movie list responses.
 */
const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export class MovieMapper {
  /**
   * Resolves genre IDs into Genre objects { id, name }.
   */
  private static resolveGenresFromIds(genreIds?: number[]): Genre[] {
    if (!Array.isArray(genreIds)) return [];

    return genreIds.map((id) => ({
      id,
      name: TMDB_GENRE_MAP[id] ?? "Unknown",
    }));
  }

  /**
   * Normalizes a raw TMDB movie item from list/discovery endpoints.
   */
  public static toMovie(tmdbMovie: TmdbMovie): Movie {
    const rawRating = typeof tmdbMovie.vote_average === "number" ? tmdbMovie.vote_average : 0;
    const roundedRating = Math.round(rawRating * 10) / 10;

    return {
      id: tmdbMovie.id,
      title: tmdbMovie.title?.trim() || tmdbMovie.original_title?.trim() || "Untitled",
      overview: tmdbMovie.overview?.trim() || "",
      posterUrl: tmdbService.buildImageUrl(tmdbMovie.poster_path, "w500"),
      backdropUrl: tmdbService.buildImageUrl(tmdbMovie.backdrop_path, "w780"),
      rating: roundedRating,
      voteCount: typeof tmdbMovie.vote_count === "number" ? tmdbMovie.vote_count : 0,
      releaseDate: tmdbMovie.release_date?.trim() || null,
      genres: this.resolveGenresFromIds(tmdbMovie.genre_ids),
    };
  }

  /**
   * Normalizes an array of raw TMDB movie items.
   */
  public static toMovieList(tmdbMovies: TmdbMovie[]): Movie[] {
    if (!Array.isArray(tmdbMovies)) return [];
    return tmdbMovies.map((movie) => this.toMovie(movie));
  }

  /**
   * Normalizes a raw TMDB movie details response.
   */
  public static toMovieDetails(tmdbDetails: TmdbMovieDetails): MovieDetails {
    const baseMovie = this.toMovie({
      ...tmdbDetails,
      genre_ids: [], // Handled explicitly below via tmdbDetails.genres
    });

    const genres: Genre[] = Array.isArray(tmdbDetails.genres)
      ? tmdbDetails.genres.map((g) => ({
          id: g.id,
          name: g.name,
        }))
      : [];

    return {
      ...baseMovie,
      genres,
      tagline: tmdbDetails.tagline?.trim() || null,
      runtime: typeof tmdbDetails.runtime === "number" ? tmdbDetails.runtime : null,
      status: tmdbDetails.status || "Released",
      budget: typeof tmdbDetails.budget === "number" ? tmdbDetails.budget : 0,
      revenue: typeof tmdbDetails.revenue === "number" ? tmdbDetails.revenue : 0,
      homepage: tmdbDetails.homepage?.trim() || null,
      imdbId: tmdbDetails.imdb_id?.trim() || null,
      originalLanguage: tmdbDetails.original_language || "en",
    };
  }
}
