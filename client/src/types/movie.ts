export type Genre = {
  id: number
  name: string
}

export type Movie = {
  id: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  rating: number
  voteCount: number
  releaseDate: string | null
  genres: Genre[]
}

export type MovieDetails = Movie & {
  tagline: string | null
  runtime: number | null
  status: string
  budget: number
  revenue: number
  homepage: string | null
  imdbId: string | null
  originalLanguage: string
}

export type Pagination = {
  page: number
  totalPages: number
  totalResults: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
