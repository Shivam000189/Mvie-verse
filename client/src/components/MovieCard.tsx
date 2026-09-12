import { motion } from 'framer-motion'
import type { Movie } from '../types/movie'
import { formatCount, formatYear } from '../lib/format'

type MovieCardProps = {
  movie: Movie
  isSaved: boolean
  saving: boolean
  onOpen: (movie: Movie) => void
  onToggle: (id: number) => void
}

export function Poster({ movie }: { movie: Movie }) {
  return movie.posterUrl ? (
    <img src={movie.posterUrl} alt={`${movie.title} poster`} loading="lazy" />
  ) : (
    <div className="poster-fallback"><span>R</span><small>{movie.title}</small></div>
  )
}

export function MovieCard({ movie, isSaved, saving, onOpen, onToggle }: MovieCardProps) {
  return (
    <motion.article
      className="movie-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35, ease: 'easeOut' }}
      whileHover={{ y: -5 }}
    >
      <button className="poster-button" onClick={() => onOpen(movie)} aria-label={`View ${movie.title}`}>
        <Poster movie={movie} />
        <span className="quick-view">View</span>
      </button>
      <button
        className={`save-button ${isSaved ? 'is-saved' : ''}`}
        onClick={() => onToggle(movie.id)}
        disabled={saving}
        aria-label={isSaved ? `Remove ${movie.title} from list` : `Save ${movie.title}`}
      >
        {isSaved ? '♥' : '♡'}
      </button>
      <div className="movie-info">
        <div className="movie-title-row">
          <h3>{movie.title}</h3>
          <span className="card-rating">★ {movie.rating.toFixed(1)}</span>
        </div>
        <p>{formatYear(movie.releaseDate)} <span>•</span> {movie.genres[0]?.name ?? 'Film'}</p>
        <div className="movie-progress"><span style={{ width: `${Math.min(movie.rating * 10, 100)}%` }} /></div>
        <small>{formatCount(movie.voteCount)} ratings</small>
      </div>
    </motion.article>
  )
}
