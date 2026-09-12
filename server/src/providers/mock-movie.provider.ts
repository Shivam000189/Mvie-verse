import type { IMovieProvider } from "./movie-provider.interface";
import { AppError } from "../utils/app-error";
import type {
  Movie,
  MovieDetails,
  MovieQuery,
  MovieListResponse,
  MovieDetailResponse,
  GenreListResponse,
  Genre,
  PaginationMeta,
} from "../types/movie.types";

/**
 * Standard Genre Taxonomy used by MockMovieProvider
 */
export const MOCK_GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
];

/**
 * Seed dataset of representative mock movies for deterministic offline testing.
 */
export const MOCK_MOVIES: MovieDetails[] = [
  {
    id: 550,
    title: "Fight Club",
    overview: "An insomniac office worker and a devil-may-care soap maker form an underground fight club.",
    posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    rating: 8.4,
    voteCount: 27500,
    releaseDate: "1999-10-15",
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" },
    ],
    tagline: "Mischief. Mayhem. Soap.",
    runtime: 139,
    status: "Released",
    budget: 63000000,
    revenue: 100853753,
    homepage: "http://www.foxmovies.com/movies/fight-club",
    imdbId: "tt0137523",
    originalLanguage: "en",
  },
  {
    id: 155,
    title: "The Dark Knight",
    overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1r5vsIRqqXubm.jpg",
    rating: 8.5,
    voteCount: 31000,
    releaseDate: "2008-07-16",
    genres: [
      { id: 18, name: "Drama" },
      { id: 28, name: "Action" },
      { id: 80, name: "Crime" },
      { id: 53, name: "Thriller" },
    ],
    tagline: "Why So Serious?",
    runtime: 152,
    status: "Released",
    budget: 185000000,
    revenue: 1004558444,
    homepage: "https://www.warnerbros.com/movies/dark-knight",
    imdbId: "tt0468569",
    originalLanguage: "en",
  },
  {
    id: 27205,
    title: "Inception",
    overview: "Cobb, a skilled thief who steals corporate secrets through dream-sharing technology, is given the inverse task of planting an idea.",
    posterUrl: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    rating: 8.3,
    voteCount: 35000,
    releaseDate: "2010-07-15",
    genres: [
      { id: 28, name: "Action" },
      { id: 878, name: "Sci-Fi" },
      { id: 12, name: "Adventure" },
    ],
    tagline: "Your mind is the scene of the crime.",
    runtime: 148,
    status: "Released",
    budget: 160000000,
    revenue: 825532764,
    homepage: "http://inceptionmovie.warnerbros.com/",
    imdbId: "tt1375666",
    originalLanguage: "en",
  },
  {
    id: 157336,
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    rating: 8.4,
    voteCount: 33000,
    releaseDate: "2014-11-05",
    genres: [
      { id: 12, name: "Adventure" },
      { id: 18, name: "Drama" },
      { id: 878, name: "Sci-Fi" },
    ],
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    runtime: 169,
    status: "Released",
    budget: 165000000,
    revenue: 675120017,
    homepage: "http://www.interstellar-movie.com/",
    imdbId: "tt0816692",
    originalLanguage: "en",
  },
  {
    id: 680,
    title: "Pulp Fiction",
    overview: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in four tales of violence and redemption.",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    rating: 8.5,
    voteCount: 26000,
    releaseDate: "1994-09-10",
    genres: [
      { id: 53, name: "Thriller" },
      { id: 80, name: "Crime" },
    ],
    tagline: "Just because you are a character doesn't mean you have character.",
    runtime: 154,
    status: "Released",
    budget: 8000000,
    revenue: 213928762,
    homepage: null,
    imdbId: "tt0110912",
    originalLanguage: "en",
  },
  {
    id: 13,
    title: "Forrest Gump",
    overview: "A man with a low IQ has accomplished great things in his life and been present during significant historic events.",
    posterUrl: "https://image.tmdb.org/t/p/w500/arw2VCBveWOVZr6pxd9XTd1TdQa.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/qdIMLhoqQgHpApuw4yP8zknSDTe.jpg",
    rating: 8.5,
    voteCount: 26500,
    releaseDate: "1994-06-23",
    genres: [
      { id: 35, name: "Comedy" },
      { id: 18, name: "Drama" },
    ],
    tagline: "The world will never be the same once you've seen it through the eyes of Forrest Gump.",
    runtime: 142,
    status: "Released",
    budget: 55000000,
    revenue: 677387716,
    homepage: null,
    imdbId: "tt0109830",
    originalLanguage: "en",
  },
  {
    id: 299536,
    title: "Avengers: Infinity War",
    overview: "As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos.",
    posterUrl: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/bOGkgRGdhrBYJSLpXaxhXVstNsV.jpg",
    rating: 8.2,
    voteCount: 28000,
    releaseDate: "2018-04-25",
    genres: [
      { id: 12, name: "Adventure" },
      { id: 28, name: "Action" },
      { id: 878, name: "Sci-Fi" },
    ],
    tagline: "An entire universe. Once and for all.",
    runtime: 149,
    status: "Released",
    budget: 300000000,
    revenue: 2046239637,
    homepage: "https://www.marvel.com/movies/avengers-infinity-war",
    imdbId: "tt4154756",
    originalLanguage: "en",
  },
  {
    id: 24428,
    title: "The Avengers",
    overview: "When an unexpected enemy emerges and threatens global safety and security, Nick Fury, director of the international peacekeeping agency known as S.H.I.E.L.D., finds himself in need of a team.",
    posterUrl: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg",
    rating: 7.7,
    voteCount: 29000,
    releaseDate: "2012-04-25",
    genres: [
      { id: 878, name: "Sci-Fi" },
      { id: 28, name: "Action" },
      { id: 12, name: "Adventure" },
    ],
    tagline: "Some assembly required.",
    runtime: 143,
    status: "Released",
    budget: 220000000,
    revenue: 1519557910,
    homepage: "http://marvel.com/avengers_movie",
    imdbId: "tt0848228",
    originalLanguage: "en",
  },
];

export class MockMovieProvider implements IMovieProvider {
  private movies: MovieDetails[];
  private genres: Genre[];

  constructor(customMovies: MovieDetails[] = MOCK_MOVIES, customGenres: Genre[] = MOCK_GENRES) {
    this.movies = [...customMovies];
    this.genres = [...customGenres];
  }

  public async getMovies(query: MovieQuery): Promise<MovieListResponse> {
    let filtered = [...this.movies];

    // 1. Text Search Filter (title or overview)
    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(term) ||
          m.overview.toLowerCase().includes(term)
      );
    }

    // 2. Genre Filter
    if (query.genre !== undefined && query.genre > 0) {
      const targetGenre = query.genre;
      filtered = filtered.filter((m) =>
        m.genres.some((g) => g.id === targetGenre)
      );
    }

    // 3. Year Filter
    if (query.year !== undefined && query.year > 0) {
      const targetYear = query.year.toString();
      filtered = filtered.filter(
        (m) => m.releaseDate && m.releaseDate.startsWith(targetYear)
      );
    }

    // 4. Sorting
    filtered.sort((a, b) => {
      switch (query.sort) {
        case "rating":
          return b.rating - a.rating;
        case "release_date":
          return (
            new Date(b.releaseDate || 0).getTime() -
            new Date(a.releaseDate || 0).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title);
        case "popularity":
        default:
          return b.voteCount - a.voteCount;
      }
    });

    // 5. Pagination
    const totalResults = filtered.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(20, query.limit || 20));
    const totalPages = Math.ceil(totalResults / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    // Convert MovieDetails to Movie domain summary
    const domainMovies: Movie[] = paginatedItems.map((m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      posterUrl: m.posterUrl,
      backdropUrl: m.backdropUrl,
      rating: m.rating,
      voteCount: m.voteCount,
      releaseDate: m.releaseDate,
      genres: m.genres,
    }));

    const pagination: PaginationMeta = {
      page,
      limit,
      totalPages,
      totalResults,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      movies: domainMovies,
      pagination,
    };
  }

  public async getMovieById(id: number): Promise<MovieDetailResponse> {
    // Simulated realistic async I/O delay
    await new Promise((resolve) => setTimeout(resolve, 5));

    const movie = this.movies.find((m) => m.id === id);
    if (!movie) {
      throw AppError.notFound(`Movie with ID ${id} was not found.`, "MOVIE_NOT_FOUND");
    }

    return { movie };
  }

  public async getGenres(): Promise<GenreListResponse> {
    return {
      genres: [...this.genres],
    };
  }
}
