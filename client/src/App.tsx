type ChatMessage = { role: 'assistant' | 'user'; text: string }
import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { MovieCard, Poster } from './components/MovieCard'
import { api } from './lib/api'
import { formatYear } from './lib/format'
import type { Genre, Movie, MovieDetails, Pagination } from './types/movie'
import './App.css'

function App() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [wishlistMovies, setWishlistMovies] = useState<Movie[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [savedIds, setSavedIds] = useState<number[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('popularity')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'discover' | 'saved'>('discover')
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Tell me what kind of movie night you want. I will use your list as a starting point.' },
  ])

  useEffect(() => {
    api<{ genres: Genre[] }>('/movies/genres').then((data) => setGenres(data.genres)).catch(() => undefined)
    api<{ items: Movie[] }>('/wishlist').then((data) => { setWishlistMovies(data.items); setSavedIds(data.items.map((movie) => movie.id)) }).catch(() => undefined)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (view === 'saved') {
      setLoading(false)
      return
    }
    const params = new URLSearchParams({ page: page.toString(), limit: '20', sort })
    if (query) params.set('search', query)
    if (genre) params.set('genre', genre)
    if (year) params.set('year', year)
    setLoading(true)
    setError('')
    api<{ movies: Movie[]; pagination: Pagination }>(`/movies?${params}`)
      .then((data) => { setMovies(data.movies); setPagination(data.pagination) })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [query, genre, year, sort, page, view])

  const savedMovies = wishlistMovies
  const visibleMovies = view === 'saved' ? savedMovies : movies
  const featuredMovie = movies[0]

  const openMovie = async (movie: Movie) => {
    setDetailLoading(true)
    setSelectedMovie(movie as MovieDetails)
    try { setSelectedMovie((await api<{ movie: MovieDetails }>(`/movies/${movie.id}`)).movie) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load movie details.') }
    finally { setDetailLoading(false) }
  }

  const toggleWishlist = async (movieId: number) => {
    setSavingId(movieId)
    const isSaved = savedIds.includes(movieId)
    try {
      if (isSaved) await api(`/wishlist/${movieId}`, { method: 'DELETE' })
      else await api('/wishlist', { method: 'POST', body: JSON.stringify({ movieId }) })
      setSavedIds((current) => isSaved ? current.filter((id) => id !== movieId) : [...current, movieId])
      if (isSaved) setWishlistMovies((current) => current.filter((movie) => movie.id !== movieId))
      else {
        const movie = movies.find((item) => item.id === movieId) ?? selectedMovie
        if (movie) setWishlistMovies((current) => current.some((item) => item.id === movieId) ? current : [...current, movie])
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Wishlist update failed.') }
    finally { setSavingId(null) }
  }

  const resetFilters = () => { setSearch(''); setGenre(''); setYear(''); setSort('popularity'); setPage(1) }
  const handleSearch = (event: FormEvent) => { event.preventDefault(); setQuery(search); setPage(1) }
  const askReelmark = async (event: FormEvent) => {
    event.preventDefault()
    const message = chatInput.trim()
    if (!message || chatLoading) return
    setChatInput('')
    setChatMessages((current) => [...current, { role: 'user', text: message }])
    setChatLoading(true)
    try {
      const response = await api<{ reply: string }>('/chat/recommendations', {
        method: 'POST',
        body: JSON.stringify({ message }),
      })
      setChatMessages((current) => [...current, { role: 'assistant', text: response.reply }])
    } catch (reason) {
      setChatMessages((current) => [...current, { role: 'assistant', text: reason instanceof Error ? reason.message : 'I could not answer right now.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Reelmark home"><span className="brand-mark">R</span><span>reelmark</span></a>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={view === 'discover' ? 'active' : ''} onClick={() => setView('discover')}>Discover</button>
          <button className={view === 'saved' ? 'active' : ''} onClick={() => setView('saved')}>My list <span className="nav-count">{savedIds.length}</span></button>
        </nav>
        <div className="profile-chip"><span className="profile-avatar">S</span><span className="profile-name">Screen time</span><span className="status-dot" /></div>
      </header>

      <main>
        {view === 'discover' && featuredMovie && !query && !genre && !year && page === 1 && (
          <motion.section className="feature" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, ease: 'easeOut' }} style={{ backgroundImage: `linear-gradient(90deg, rgba(19, 24, 34, .96) 0%, rgba(19, 24, 34, .78) 42%, rgba(19, 24, 34, .16) 100%), url(${featuredMovie.backdropUrl ?? featuredMovie.posterUrl ?? ''})` }}>
            <div className="feature-copy"><span className="eyebrow">Tonight's pick</span><h1>{featuredMovie.title}</h1><p className="feature-meta"><span className="rating-star">★</span> {featuredMovie.rating.toFixed(1)} <span>•</span> {formatYear(featuredMovie.releaseDate)} <span>•</span> {featuredMovie.genres.slice(0, 2).map((item) => item.name).join(' / ')}</p><p className="feature-overview">{featuredMovie.overview}</p><button className="primary-button" onClick={() => openMovie(featuredMovie)}>View film <span>↗</span></button></div>
            <span className="feature-index">01 <i /> 05</span>
          </motion.section>
        )}

        <section className="content-wrap">
          <div className="section-heading"><div><span className="eyebrow">The catalogue</span><h2>{view === 'saved' ? 'Your watchlist' : 'Find your next favourite'}</h2></div><span className="result-count">{view === 'saved' ? `${savedMovies.length} saved films` : pagination ? `${pagination.totalResults} films` : 'Curating now'}</span></div>
          {view === 'discover' && <div className="controls">
            <form className="search-box" onSubmit={handleSearch}><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search by title or mood" aria-label="Search movies" /><button type="submit">Search</button></form>
            <select value={genre} onChange={(event) => { setGenre(event.target.value); setPage(1) }} aria-label="Filter by genre"><option value="">All genres</option>{genres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input className="year-input" value={year} onChange={(event) => { setYear(event.target.value); setPage(1) }} placeholder="Year" aria-label="Filter by year" inputMode="numeric" maxLength={4} />
            <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }} aria-label="Sort movies"><option value="popularity">Most popular</option><option value="rating">Highest rated</option><option value="release_date">Newest first</option><option value="title">Title A–Z</option></select>
            {(search || genre || year || sort !== 'popularity') && <button className="clear-button" onClick={resetFilters}>Clear</button>}
          </div>}

          {error && <div className="error-banner" role="alert"><span>Could not reach the cinema desk.</span><button onClick={() => { setError(''); setPage((current) => current) }}>Dismiss</button></div>}
          {loading ? <div className="movie-grid">{Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-poster" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div> : visibleMovies.length > 0 ? <div className="movie-grid">{visibleMovies.map((movie) => <MovieCard key={movie.id} movie={movie} isSaved={savedIds.includes(movie.id)} saving={savingId === movie.id} onOpen={openMovie} onToggle={toggleWishlist} />)}</div> : <div className="empty-state"><span className="empty-mark">◎</span><h3>{view === 'saved' ? 'Your list is waiting' : 'No films found'}</h3><p>{view === 'saved' ? 'Save a film and it will appear here for later.' : 'Try a different title, genre, or year.'}</p>{view === 'discover' && <button className="secondary-button" onClick={resetFilters}>Reset filters</button>}</div>}
          {view === 'discover' && pagination && pagination.totalPages > 1 && <div className="pagination"><button disabled={!pagination.hasPrevPage} onClick={() => setPage((current) => current - 1)}>←</button><span>Page <strong>{pagination.page}</strong> of {pagination.totalPages}</span><button disabled={!pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>→</button></div>}
        </section>
      </main>

      <button className={`chat-launcher ${chatOpen ? 'is-open' : ''}`} onClick={() => setChatOpen((current) => !current)} aria-expanded={chatOpen}><span aria-hidden="true">✦</span><span>{chatOpen ? 'Close guide' : 'Ask Reelmark'}</span></button>
      {chatOpen && <motion.aside className="chat-panel" initial={{ opacity: 0, y: 14, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .2 }} aria-label="Reelmark movie assistant"><div className="chat-header"><div><span className="eyebrow">Your movie guide</span><h2>Ask Reelmark</h2></div><button onClick={() => setChatOpen(false)} aria-label="Close chat">×</button></div><div className="chat-messages">{chatMessages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>)}{chatLoading && <div className="chat-message assistant typing">Thinking<span>...</span></div>}</div><form className="chat-form" onSubmit={askReelmark}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask for a recommendation..." maxLength={500} aria-label="Ask for a recommendation" /><button type="submit" disabled={!chatInput.trim() || chatLoading} aria-label="Send message">↑</button></form></motion.aside>}

      {selectedMovie && <div className="drawer-backdrop" onClick={() => setSelectedMovie(null)}><aside className="detail-drawer" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setSelectedMovie(null)} aria-label="Close details">×</button><div className="detail-hero" style={{ backgroundImage: `linear-gradient(0deg, rgba(19, 24, 34, 1), transparent), url(${selectedMovie.backdropUrl ?? selectedMovie.posterUrl ?? ''})` }} /><div className="detail-content"><div className="detail-poster"><Poster movie={selectedMovie} /></div><div className="detail-main"><span className="eyebrow">Film details</span><h2>{selectedMovie.title}</h2><p className="tagline">{detailLoading ? 'Loading the full story…' : (selectedMovie.tagline || selectedMovie.overview)}</p><div className="detail-stats"><span><b className="rating-star">★</b> {selectedMovie.rating.toFixed(1)}</span><span>{formatYear(selectedMovie.releaseDate)}</span><span>{selectedMovie.runtime ? `${selectedMovie.runtime} min` : 'Feature film'}</span></div><div className="genre-list">{selectedMovie.genres.map((item) => <span key={item.id}>{item.name}</span>)}</div><button className={savedIds.includes(selectedMovie.id) ? 'saved-button' : 'primary-button'} onClick={() => toggleWishlist(selectedMovie.id)} disabled={savingId === selectedMovie.id}>{savedIds.includes(selectedMovie.id) ? '✓ In your list' : '+ Save to my list'}</button></div></div><p className="detail-overview">{selectedMovie.overview}</p></aside></div>}
    </div>
  )
}

export default App
