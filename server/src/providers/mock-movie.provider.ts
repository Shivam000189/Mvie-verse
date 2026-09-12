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
  {
    id: 497,
    title: "The Green Mile",
    overview: "A death row guard discovers that one of his prisoners has a mysterious gift that changes everything he believes about justice.",
    posterUrl: "https://image.tmdb.org/t/p/w500/o0lOeZfJj3MZqJ8f3Hq3a8rN8uY.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/3h1JZGDhZ8nzxdgvkxha0qBqi05.jpg",
    rating: 8.5,
    voteCount: 17500,
    releaseDate: "1999-12-10",
    genres: [{ id: 80, name: "Crime" }, { id: 18, name: "Drama" }, { id: 14, name: "Fantasy" }],
    tagline: "Miracles happen in places you least expect.",
    runtime: 189,
    status: "Released",
    budget: 60000000,
    revenue: 286801374,
    homepage: null,
    imdbId: "tt0120689",
    originalLanguage: "en",
  },
  {
    id: 603,
    title: "The Matrix",
    overview: "A computer hacker learns that the world he knows is a simulated reality and joins a rebellion against its creators.",
    posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
    rating: 8.2,
    voteCount: 26000,
    releaseDate: "1999-03-30",
    genres: [{ id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
    tagline: "What is the Matrix?",
    runtime: 136,
    status: "Released",
    budget: 63000000,
    revenue: 463517383,
    homepage: null,
    imdbId: "tt0133093",
    originalLanguage: "en",
  },
  {
    id: 424,
    title: "Schindler's List",
    overview: "A German industrialist gradually becomes concerned for his Jewish workforce after witnessing the persecution of the community during World War II.",
    posterUrl: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/zb6fM1CX41D9rF9hdg3G37O6G2H.jpg",
    rating: 8.6,
    voteCount: 15500,
    releaseDate: "1993-12-15",
    genres: [{ id: 18, name: "Drama" }, { id: 36, name: "History" }],
    tagline: "Whoever saves one life, saves the world entire.",
    runtime: 195,
    status: "Released",
    budget: 22000000,
    revenue: 321365567,
    homepage: null,
    imdbId: "tt0108052",
    originalLanguage: "en",
  },
  {
    id: 122,
    title: "The Lord of the Rings: The Return of the King",
    overview: "Gandalf and Aragorn lead the World of Men against Sauron's growing army while Frodo and Sam approach Mount Doom.",
    posterUrl: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/8BPZO0Bf8TeAy8znF43z8soK3ys.jpg",
    rating: 8.5,
    voteCount: 24000,
    releaseDate: "2003-12-01",
    genres: [{ id: 12, name: "Adventure" }, { id: 14, name: "Fantasy" }, { id: 28, name: "Action" }],
    tagline: "The eye of the enemy is moving.",
    runtime: 201,
    status: "Released",
    budget: 94000000,
    revenue: 1118888979,
    homepage: null,
    imdbId: "tt0167260",
    originalLanguage: "en",
  },
  {
    id: 11,
    title: "Star Wars",
    overview: "Luke Skywalker joins forces with a Jedi knight, a cocky pilot, a Wookiee and two droids to save the galaxy from a world-destroying battle station.",
    posterUrl: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/zqkmTXzjkAgXmEWLRsY4UpTWCeo.jpg",
    rating: 8.2,
    voteCount: 19500,
    releaseDate: "1977-05-25",
    genres: [{ id: 12, name: "Adventure" }, { id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
    tagline: "A long time ago in a galaxy far, far away...",
    runtime: 121,
    status: "Released",
    budget: 11000000,
    revenue: 775398007,
    homepage: null,
    imdbId: "tt0076759",
    originalLanguage: "en",
  },
  {
    id: 238,
    title: "The Godfather",
    overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    posterUrl: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
    rating: 8.7,
    voteCount: 20500,
    releaseDate: "1972-03-14",
    genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
    tagline: "An offer you can't refuse.",
    runtime: 175,
    status: "Released",
    budget: 6000000,
    revenue: 246120974,
    homepage: null,
    imdbId: "tt0068646",
    originalLanguage: "en",
  },
  {
    id: 346698,
    title: "John Wick: Chapter 2",
    overview: "Legendary hitman John Wick is forced back out of retirement by a former associate plotting to seize control of an international assassins' guild.",
    posterUrl: "https://image.tmdb.org/t/p/w500/hApaVZP3Q3R9m2uF5V7S9c8tG5.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/7dzngS8pL8E9x9q1C4g9D9a2g6H.jpg",
    rating: 7.4,
    voteCount: 9000,
    releaseDate: "2017-02-08",
    genres: [{ id: 28, name: "Action" }, { id: 53, name: "Thriller" }, { id: 80, name: "Crime" }],
    tagline: "Never stab the devil in the back.",
    runtime: 122,
    status: "Released",
    budget: 40000000,
    revenue: 171539887,
    homepage: null,
    imdbId: "tt4425200",
    originalLanguage: "en",
  },
  {
    id: 496243,
    title: "Parasite",
    overview: "A struggling family slowly insinuates itself into the home of a wealthy household, with consequences no one expects.",
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/ApiBzeaaXqtNZdygnj9N1Z9Y6uZ.jpg",
    rating: 8.5,
    voteCount: 17000,
    releaseDate: "2019-05-30",
    genres: [{ id: 35, name: "Comedy" }, { id: 53, name: "Thriller" }, { id: 18, name: "Drama" }],
    tagline: "Act like you own the place.",
    runtime: 133,
    status: "Released",
    budget: 11400000,
    revenue: 258908054,
    homepage: null,
    imdbId: "tt6751668",
    originalLanguage: "ko",
  },
  {
    id: 569094,
    title: "Spider-Man: Into the Spider-Verse",
    overview: "Teen Miles Morales becomes Spider-Man of his reality and crosses paths with versions of the hero from other dimensions.",
    posterUrl: "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/6ELJEzQJ3Y45HczvreCzYh3Z3q8.jpg",
    rating: 8.4,
    voteCount: 14500,
    releaseDate: "2018-12-06",
    genres: [{ id: 28, name: "Action" }, { id: 16, name: "Animation" }, { id: 878, name: "Sci-Fi" }],
    tagline: "Anyone can wear the mask.",
    runtime: 117,
    status: "Released",
    budget: 90000000,
    revenue: 375540831,
    homepage: null,
    imdbId: "tt4633694",
    originalLanguage: "en",
  },
  {
    id: 475557,
    title: "Joker",
    overview: "In a city that constantly pushes him aside, a failed comedian embarks on a downward spiral that brings about a shocking revolution.",
    posterUrl: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg",
    rating: 8.1,
    voteCount: 25000,
    releaseDate: "2019-10-02",
    genres: [{ id: 80, name: "Crime" }, { id: 53, name: "Thriller" }, { id: 18, name: "Drama" }],
    tagline: "Put on a happy face.",
    runtime: 122,
    status: "Released",
    budget: 55000000,
    revenue: 1078958629,
    homepage: null,
    imdbId: "tt7286456",
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
