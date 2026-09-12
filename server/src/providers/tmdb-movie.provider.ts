import type { IMovieProvider } from "./movie-provider.interface";
import { tmdbService } from "../services/tmdb.service";
import { MovieMapper } from "../utils/movie.mapper";
import type {
  MovieQuery,
  MovieListResponse,
  MovieDetailResponse,
  GenreListResponse,
  PaginationMeta,
  MovieSort,
} from "../types/movie.types";
import type { TmdbPaginatedResponse, TmdbMovie } from "../types/tmdb.types";

export class TmdbMovieProvider implements IMovieProvider {
  /**
   * Maps application-level sort options to TMDB sort_by parameters.
   */
  private mapSortOption(sort: MovieSort): string {
    switch (sort) {
      case "rating":
        return "vote_average.desc";
      case "release_date":
        return "primary_release_date.desc";
      case "title":
        return "original_title.asc";
      case "popularity":
      default:
        return "popularity.desc";
    }
  }

  public async getMovies(query: MovieQuery): Promise<MovieListResponse> {
    let tmdbData: TmdbPaginatedResponse<TmdbMovie>;

    if (query.search && query.search.trim().length > 0) {
      // Search Mode
      tmdbData = await tmdbService.searchMovies({
        query: query.search.trim(),
        page: query.page,
        year: query.year,
      });

      // Filter by genre in search results if genre is provided
      if (query.genre) {
        const targetGenre = query.genre;
        tmdbData.results = tmdbData.results.filter((movie) =>
          movie.genre_ids.includes(targetGenre)
        );
      }
    } else {
      // Discovery Mode
      const sortBy = this.mapSortOption(query.sort);
      tmdbData = await tmdbService.discoverMovies({
        page: query.page,
        genre: query.genre,
        year: query.year,
        sortBy,
      });
    }

    let movies = MovieMapper.toMovieList(tmdbData.results);

    // Apply limit if client requested fewer items than TMDB page size (20)
    if (query.limit < movies.length) {
      movies = movies.slice(0, query.limit);
    }

    const totalPages = tmdbData.total_pages;
    const totalResults = tmdbData.total_results;

    const pagination: PaginationMeta = {
      page: query.page,
      limit: query.limit,
      totalPages,
      totalResults,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    };

    return {
      movies,
      pagination,
    };
  }

  public async getMovieById(id: number): Promise<MovieDetailResponse> {
    const tmdbDetails = await tmdbService.getMovieDetails(id);
    const movie = MovieMapper.toMovieDetails(tmdbDetails);
    return { movie };
  }

  public async getGenres(): Promise<GenreListResponse> {
    const tmdbGenres = await tmdbService.getGenres();
    return {
      genres: tmdbGenres.map((g) => ({ id: g.id, name: g.name })),
    };
  }
}
