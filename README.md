# Reelmark Movie Discovery App

A full-stack movie discovery application built for the Full-Stack Intern Assignment. Reelmark lets users browse movies without knowing a title first, search and filter a growing catalogue, inspect movie details, save a persistent wishlist, and ask a wishlist-aware Gemini assistant for recommendations.

## Assignment Coverage

- Browse movies from a discovery catalogue without a required search.
- Search by title or overview.
- Filter by genre and release year.
- Sort by popularity, rating, release date, or title.
- Paginate large result sets.
- Open a movie detail view with metadata and artwork.
- Add and remove movies from a PostgreSQL-backed wishlist.
- Keep wishlist data after the application is closed and reopened.
- Show loading, empty, error, and unavailable-image states.
- Use a responsive interface for desktop and mobile screens.
- Route all movie data through the Node.js backend instead of calling TMDB from the browser.
- Ask a Gemini-powered assistant for recommendations using the current wishlist as taste context.

## Stack

### Client

- React 19 and TypeScript
- Vite
- Framer Motion
- Responsive CSS with a minimalist visual system

### Server

- Node.js, Express 5, and TypeScript
- PostgreSQL and Prisma ORM
- Zod request validation
- Axios TMDB adapter
- Gemini REST integration using the server-side `fetch` API
- Compression, CORS, security headers, logging, and rate limiting

## Architecture

```text
React client
   |
   | /api proxy in development or VITE_API_URL in production
   v
Express routes -> Zod schemas -> controllers -> services
                                      |
                    +-----------------+------------------+
                    |                                    |
              Movie provider                       Wishlist service
          Mock or TMDB adapter                  Prisma -> PostgreSQL
                    |
              Domain movie types
                                      |
                              Gemini chat service
                         Wishlist context -> Gemini API
```

The backend owns the external API boundary. TMDB responses are mapped into application-owned movie models before they reach the client. The mock provider implements the same provider interface as TMDB and is used for reliable local development and automated tests.

## Project Structure

```text
client/
  src/
    components/MovieCard.tsx  Reusable poster and movie card UI
    lib/api.ts                Typed API response helper
    lib/format.ts             Shared display formatters
    types/movie.ts            Client movie domain types
    App.tsx                   Screen state and page orchestration
    App.css                   Responsive application styling

server/
  prisma/schema.prisma        Wishlist persistence model
  src/config                 Environment, database, and TMDB setup
  src/controllers             HTTP request handlers
  src/middleware              Security, logging, errors, and limits
  src/providers               Mock and TMDB movie providers
  src/routes                  Movie, wishlist, and chat routes
  src/schemas                 Zod request schemas
  src/services                Movie, wishlist, and Gemini chat logic
  src/types                   Server domain and response types
  src/utils                   Mapping, caching, errors, and responses
```

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer, local or hosted
- A TMDB API key or access token for live movie data
- A Gemini API key for live assistant responses

The application can run with the deterministic mock movie provider, but wishlist persistence still requires PostgreSQL.

## Setup

### 1. Install dependencies

```powershell
cd server
npm install

cd ..\client
npm install
```

### 2. Configure the server

Copy the template and edit the new file:

```powershell
cd ..\server
Copy-Item .env.example .env
```

For local development, keep these values:

```env
NODE_ENV=development
PORT=5000
MOVIE_PROVIDER=mock
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/movie_discovery_db?schema=public
CORS_ORIGIN=http://localhost:5173
```

Optional Gemini configuration:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

For live TMDB data, change the provider and add credentials:

```env
MOVIE_PROVIDER=tmdb
TMDB_API_KEY=your_tmdb_api_key_here
```

Never commit `.env` or place private API keys in the client.

### 3. Prepare PostgreSQL

Create the database named in `DATABASE_URL`, then run:

```powershell
cd server
npm run db:generate
npm run db:migrate
```

To insert sample wishlist entries:

```powershell
npm run db:seed
```

### 4. Start the backend

```powershell
cd server
npm run dev
```

The API runs at `http://localhost:5000`.

### 5. Start the frontend

Open a second terminal:

```powershell
cd client
npm run dev
```

Open `http://localhost:5173`.

The Vite development proxy forwards `/api` requests to `http://localhost:5000`. For a deployed frontend, create `client/.env` from `client/.env.example` and set `VITE_API_URL` to the deployed API base URL.

## Production Configuration

Use explicit production values rather than relying on defaults:

```env
NODE_ENV=production
PORT=5000
MOVIE_PROVIDER=tmdb
DATABASE_URL=your_production_postgresql_url
CORS_ORIGIN=https://your-frontend-domain.com
TMDB_API_KEY=your_tmdb_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Production startup requires a database URL and stops if the database connection fails. Configure TLS at the hosting platform or reverse proxy, restrict `CORS_ORIGIN` to trusted frontend origins, and store secrets in the deployment secret manager.

Build and run the server:

```powershell
cd server
npm run build
npm start
```

Build the client:

```powershell
cd client
npm run build
npm run preview
```

## API Reference

All successful responses use:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-09-12T00:00:00.000Z"
}
```

All errors use a consistent error envelope with a machine-readable code.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/movies` | Search, filter, sort, and paginate movies |
| `GET` | `/api/movies/genres` | List available genres |
| `GET` | `/api/movies/:id` | Retrieve full movie details |
| `GET` | `/api/wishlist` | Retrieve persistent wishlist movies |
| `POST` | `/api/wishlist` | Add `{ "movieId": 550 }` to the wishlist |
| `GET` | `/api/wishlist/:movieId` | Check wishlist membership |
| `DELETE` | `/api/wishlist/:movieId` | Remove a movie from the wishlist |
| `POST` | `/api/chat/recommendations` | Ask for a wishlist-aware recommendation |

Movie query parameters include `search`, `genre`, `year`, `sort`, `page`, and `limit`. The server validates and bounds these values before service execution.

## Data Flow and Technical Decisions

### Provider abstraction

`IMovieProvider` keeps movie services independent of TMDB. The mock provider is deterministic and offline; the TMDB provider handles live requests, timeouts, API errors, and image URLs. Switching providers does not change the frontend contract.

### Normalized domain models

The server maps TMDB payloads into application-owned `Movie` and `MovieDetails` types. Missing titles, descriptions, images, dates, ratings, and genres receive safe fallbacks instead of leaking provider-specific shapes to the client.

### Caching and request volume

Movie listings, details, and genres use bounded in-memory caches with different TTLs. Identical in-flight requests are coalesced so concurrent callers do not create duplicate upstream requests. Provider errors are not cached, allowing recovery after a temporary outage.

### Wishlist persistence

Only the movie ID and creation timestamp are stored in PostgreSQL. Movie metadata is fetched through the movie service when the wishlist is read, which avoids duplicating external catalogue data. A unique database constraint prevents duplicate wishlist entries during concurrent requests.

### Resilience

The API validates input with Zod, applies request limits and security middleware, translates provider errors into domain errors, and returns consistent response envelopes. The client renders loading skeletons, empty states, unavailable posters, API errors, and retry-safe interactions.

### Gemini assistant

The chat request is handled by the backend so the Gemini key never reaches the browser. The service builds a concise wishlist context and sends it to Gemini. If Gemini is not configured or temporarily unavailable, the endpoint returns a deterministic fallback response so the UI remains usable.

## Testing and Quality Checks

Run the backend typecheck:

```powershell
cd server
npm run typecheck
```

Run the backend test suite:

```powershell
npm test
```

The server includes unit, provider, service, API integration, database, security, performance, error, and wishlist test scripts.

Run the client checks:

```powershell
cd client
npm run build
npm run lint
```

## Known Limitations

- The wishlist is currently shared rather than authenticated per user.
- In-memory caches and rate limits are process-local. A multi-instance deployment should use a shared cache and distributed rate limiter.
- TMDB and Gemini availability depends on their external quotas and network health.
- The mock provider is intended for development and test environments, not production catalogue data.
- The app does not yet include user accounts, personalized profiles, or a background synchronization job.

## AI Transparency

AI-assisted development was used to understand third-party API integration, generate initial implementation ideas, troubleshoot request handling, improve documentation, and review code structure. The application architecture, provider abstraction, normalized data model, persistence approach, resilience behavior, and final feature decisions were reviewed and integrated for this assignment.
