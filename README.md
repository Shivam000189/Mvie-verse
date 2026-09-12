# 🎬 Movie Discovery App — Backend

A production-ready Full-Stack Intern Assignment backend built with **Node.js**, **Express**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and the **TMDB API**.

---

## 🏛️ System Architecture

```text
React Client (Future Frontend)
     │
     ▼
[Express Routes]        (/api/movies, /api/wishlist, /api/health)
     │
     ▼
[Zod Schemas]           (Runtime type validation & input coercion)
     │
     ▼
[Controllers]           (Thin HTTP handlers, status codes, response wrappers)
     │
     ├── Movie Queries  ──► [Movie Service]    ──► [TMDB Service] ──► TMDB API
     │                                                     │
     │                                                     ▼
     │                                              [Movie Mapper]
     │
     └── Wishlist Ops   ──► [Wishlist Service] ──► [Prisma Client] ──► PostgreSQL
                                  │
                                  └── (Hydrate movie metadata via Movie Service)
```

---

## 💾 Wishlist Architecture & Data Ownership

### 1. Why only `movieId` is stored in PostgreSQL
Movie metadata (titles, overviews, ratings, poster paths, backdrops) is owned and constantly updated upstream by TMDB. Storing only the foreign reference `movieId` (and `createdAt`) in PostgreSQL provides:
* **Zero Data Staleness**: The user always sees the latest ratings, posters, and details without background sync jobs.
* **Storage Efficiency**: Keeps database size minimal and scalable.
* **Separation of Concerns**: PostgreSQL manages user state; TMDB manages the movie catalog.

### 2. Why `movieId` is `@unique` (Race Condition Prevention)
Relying only on application-level checks (`if (!exists) { create() }`) is vulnerable to Time-Of-Check to Time-Of-Use (TOCTOU) race conditions when concurrent requests hit the server at the exact same millisecond. 
A database-level `@unique` constraint guarantees atomic uniqueness at the storage engine level. If a duplicate insert occurs, PostgreSQL rejects it, and Prisma returns error `P2002`, which our service maps to HTTP `409 Conflict` (`MOVIE_ALREADY_IN_WISHLIST`).

### 3. Why Controllers never access Prisma directly
Controllers only handle HTTP-specific concerns (reading params, validating inputs, selecting HTTP status codes `201`/`200`/`404`/`409`, and sending standard JSON envelopes). Business logic, database operations, error translation, and external API cross-referencing belong exclusively in the service layer (`WishlistService`).

### 4. Why external provider downtime does not mutate user state
If TMDB is temporarily slow or a movie is removed upstream, our `WishlistService.getWishlist()` uses `Promise.allSettled()` to provide a graceful fallback representation (`Movie #550 (Metadata temporarily unavailable)`). The user's persistent record in PostgreSQL is **never deleted or corrupted** due to external API failures.

---

## 📡 Wishlist API Reference

### 1. Get User Wishlist
```http
GET /api/wishlist
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 550,
        "title": "Fight Club",
        "overview": "An insomniac office worker and a devil-may-care soap maker...",
        "posterUrl": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/w780/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
        "rating": 8.4,
        "voteCount": 27000,
        "releaseDate": "1999-10-15",
        "genres": [
          { "id": 18, "name": "Drama" },
          { "id": 53, "name": "Thriller" }
        ]
      }
    ],
    "total": 1
  },
  "timestamp": "2026-09-12T05:00:00.000Z"
}
```

### 2. Add Movie to Wishlist
```http
POST /api/wishlist
Content-Type: application/json

{
  "movieId": 550
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Movie added to wishlist",
    "movieId": 550,
    "addedAt": "2026-09-12T05:00:10.000Z"
  },
  "message": "Movie added to wishlist",
  "timestamp": "2026-09-12T05:00:10.000Z"
}
```

### 3. Check Movie Wishlist Status
```http
GET /api/wishlist/550
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "movieId": 550,
    "isInWishlist": true
  },
  "timestamp": "2026-09-12T05:00:15.000Z"
}
```

### 4. Remove Movie from Wishlist
```http
DELETE /api/wishlist/550
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "movieId": 550,
    "removed": true
  },
  "message": "Movie removed from wishlist",
  "timestamp": "2026-09-12T05:00:20.000Z"
}
```

---

## ⚡ Performance Strategy (Step 9)

### 1. In-Memory Caching Topology & TTL Decisions
We implement a lightweight, bounded in-memory cache ([`InMemoryCache<T>`](file:///d:/shivam/projects/Movie%20Discovery%20App/server/src/utils/cache.ts)) directly inside the service layer to dramatically reduce latency and protect external provider rate limits:

| Resource | Cache Key Pattern | TTL | Max Capacity | Eviction Policy | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Movie Genres** | `genres:en-US` | **1 hour** (3600s) | 10 entries | LRU | Static reference taxonomy; changes once every few years. |
| **Movie Details** | `movie:{id}` | **10 minutes** (600s) | 500 entries | LRU | Detailed overviews, runtimes, and release dates change very rarely. |
| **Movie Listings** | `movies:search={s}:genre={g}:year={y}:sort={sort}:page={p}:limit={l}` | **2 minutes** (120s) | 200 entries | LRU | Balances fresh discovery results with high reuse during active browsing. |

### 2. In-Flight Request Coalescing (Stampede / Dog-Piling Prevention)
When multiple client requests simultaneously ask for the exact same uncached movie ID (e.g. 10 users requesting `GET /api/movies/550` simultaneously on a cold cache), [`InMemoryCache.getOrSet()`](file:///d:/shivam/projects/Movie%20Discovery%20App/server/src/utils/cache.ts) shares a single in-flight Promise across all 10 callers. Only **1 upstream network request** is dispatched to TMDB; all 10 callers resolve concurrently when that single Promise fulfills.

### 3. Error Non-Caching Policy
Upstream network failures, timeouts, and rate limits are **never cached**. If TMDB temporarily drops a packet, the error is handled immediately, allowing subsequent requests to recover without waiting for a cache TTL to expire.

### 4. Strict Pagination & Query Protection
- `page >= 1` (integer)
- `limit >= 1` and `limit <= 20` (max bounded to 20 to protect memory and align with TMDB natural page sizes)
- Search queries are trimmed; empty strings/whitespace are converted to discovery mode instead of firing wasteful blank search requests.
- Excessive limits (e.g., `limit=100000`) are rejected at the edge with HTTP `400 Bad Request`.

### 5. HTTP Response Compression & Observability
- **Gzip/Deflate Compression**: Integrated `compression` middleware compresses JSON payloads over the wire.
- **Request Duration Logging**: Lightweight `requestLoggerMiddleware` measures and logs execution latency (`⚡ [HTTP] GET /api/movies -> 200 (1.85ms)`).

---

## 🛡️ Error Handling Architecture (Step 10)

```text
Request (Invalid / Edge-Case / Malformed)
   │
   ▼
[Zod Schemas]        ──► (Validation failure: 400 INVALID_REQUEST)
   │
   ▼
[Controllers]        ──► (Thin wrapper, delegates to Services)
   │
   ▼
[Services]           ──► (Business logic & domain error throws)
   │
   ├── Database Ops  ──► [Prisma] ──► (P2002: 409 MOVIE_ALREADY_IN_WISHLIST, P2025: 404, Fatal: 500 DATABASE_ERROR)
   └── Provider Ops  ──► [TMDB]   ──► (404: MOVIE_NOT_FOUND, 429: MOVIE_SERVICE_RATE_LIMITED, Timeout: 503 MOVIE_SERVICE_UNAVAILABLE)
   │
   ▼
[Central Error Middleware]
   │
   ▼
[Standard Error Envelope]
```

### Standardized Error Envelope
Every error returned by the API follows the exact same schema:
```json
{
  "success": false,
  "error": {
    "code": "MOVIE_NOT_FOUND",
    "message": "Movie was not found."
  },
  "timestamp": "2026-09-12T05:30:00.000Z"
}
```

### Domain Error Code Reference
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_REQUEST` | Validation error (e.g. `limit > 20`, negative page, out-of-range year, unwhitelisted sort). |
| `400 Bad Request` | `INVALID_MOVIE_ID` | Non-numeric or non-positive movie ID passed in route parameter. |
| `404 Not Found` | `MOVIE_NOT_FOUND` | Upstream movie ID does not exist in catalog. |
| `404 Not Found` | `WISHLIST_ITEM_NOT_FOUND` | Target movie ID does not exist in the user's wishlist during deletion. |
| `404 Not Found` | `ROUTE_NOT_FOUND` | Requested HTTP route path is unhandled (`GET /api/unknown`). |
| `409 Conflict` | `MOVIE_ALREADY_IN_WISHLIST` | Movie is already present in wishlist (enforced by DB unique constraint). |
| `429 Too Many Requests` | `MOVIE_SERVICE_RATE_LIMITED` | TMDB external provider rate limit threshold exceeded. |
| `500 Server Error` | `DATABASE_ERROR` | Internal database failure (Prisma internals sanitized). |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Generic fallback for unexpected runtime exceptions (stack traces suppressed). |
| `503 Service Unavailable`| `MOVIE_SERVICE_UNAVAILABLE` | External movie provider timeout or network unreachable. |

---

## 🧪 Testing Architecture & Multi-Layer Test Strategy

The backend follows a 5-layer testing strategy that verifies behavior across all levels without requiring real external TMDB API credentials during CI/CD.

```text
┌────────────────────────────────────────────────────────┐
│ Layer 1: Pure Unit Tests (Utilities & Validators)       │ (MovieMapper, Zod, AppError, InMemoryCache)
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Layer 2: Provider Tests (Contracts & Failure Modes)    │ (MockMovieProvider, FailingMovieProvider)
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Layer 3: Service & Business Logic Tests                │ (MovieService caching, coalescing, error recovery)
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Layer 4: Express HTTP API Integration Tests            │ (Real HTTP requests on ephemeral test port)
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Layer 5: PostgreSQL Database Integration Tests         │ (Prisma CRUD, unique constraint, concurrency)
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Layer 6: Security & Production Readiness Tests          │ (Headers, 10kb body, search bounds, rate limit)
└────────────────────────────────────────────────────────┘
```

### Test Suites & Coverage Breakdown

| Layer | Test Suite | File | Tests | Coverage Scope |
| :--- | :--- | :--- | :---: | :--- |
| **Layer 1** | Pure Unit Tests | `src/scripts/test-unit.ts` | 15 | `MovieMapper` with complete/corrupt data, `movieQuerySchema`, `movieIdParamSchema`, `addWishlistSchema`, `AppError` factory methods, `InMemoryCache` (hits, misses, LRU eviction, TTL expiration). |
| **Layer 2** | Provider Contract & Failure | `src/scripts/test-providers.ts` | 13 | `MockMovieProvider` search, filters, sorting, pagination, details, genres, and `FailingMovieProvider` simulations (`503`, timeouts, `429`, malformed payloads). |
| **Layer 3** | Service Logic & Caching | `src/scripts/test-services.ts` | 11 | `MovieService` query routing, detail caching, request coalescing (5 concurrent callers), and error non-caching resilience. |
| **Layer 4** | HTTP API Integration | `src/scripts/test-api-integration.ts` | 14 | Express endpoints (`/api/health`, `/api/movies`, `/api/movies/:id`, `/api/movies/genres`, `/api/wishlist`, `/api/unknown-route`) with standard JSON envelopes and status codes (`200`, `400`, `404`). |
| **Layer 5** | Database Persistence | `src/scripts/test-db-integration.ts` | 10 | PostgreSQL connection, Wishlist CRUD persistence, duplicate prevention, concurrent race condition (2 simultaneous inserts $\rightarrow$ 1 success, 1 conflict), and zero-residue cleanup. |
| **Layer 6** | Security & Production Readiness | `src/scripts/test-security.ts` | 8 | OWASP security headers (`nosniff`, `DENY`), `X-Powered-By` removal, 10KB body limit (`413`), search length bounds (`400`), rate limiting (`429`), zero secret leakage. |
| **Total** | **Unified Test Suite** | `src/scripts/run-all-tests.ts` | **71** | **100% Passing (0 Failures across all 6 layers)** |

---

## 🛡️ Security Considerations & Production Readiness

### 1. Secrets Management
* Sensitive credentials (`DATABASE_URL`, `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN`) are loaded via `dotenv` and validated at startup using Zod in `src/config/env.ts`.
* `.env` is strictly listed in `.gitignore` and never committed.
* `.env.example` contains only non-sensitive template placeholders.

### 2. HTTP Security Headers
* `X-Content-Type-Options: nosniff`: Prevents browsers from MIME-sniffing malicious uploads.
* `X-Frame-Options: DENY`: Defends against clickjacking by prohibiting iframe embedding.
* `Referrer-Policy: strict-origin-when-cross-origin`: Restricts sensitive URL parameter leakage in referrer headers.
* `Content-Security-Policy`: Modern defense restricting resource loading.
* `X-Powered-By`: Explicitly removed (`app.disable("x-powered-by")`) to eliminate framework fingerprinting.

### 3. Request Body Size & Input Bounds
* Body parser limit constrained to `10kb` (`express.json({ limit: "10kb" })`), rejecting oversized requests with `413 PAYLOAD_TOO_LARGE`.
* Strict Zod boundaries on all query and route parameters:
  - `search`: Trimmed and capped at 100 characters.
  - `limit`: Capped at 20 items per page.
  - `year`: Bounded between 1888 and current year + 5.
  - `sort`: Strictly whitelisted against `"popularity" | "rating" | "release_date" | "title"`.

### 4. Application Rate Limiting
* Public endpoints are protected against scraping and denial-of-service via an in-memory sliding-window rate limiter:
  - **General API**: 100 requests per 15 minutes per IP.
  - **Wishlist Mutations**: 30 requests per minute per IP.
  - Returns standard HTTP `429 Too Many Requests` with `Retry-After` header and `RATE_LIMITED` code.

### 5. Database Security & SQL Injection Prevention
* All database interactions utilize Prisma ORM parameterized queries.
* Zero raw, concatenated SQL strings are used anywhere in the codebase.
* Unique database constraints (`@unique` on `movieId`) atomically prevent race conditions and duplicate wishlist entries.

### 6. External Provider Isolation
* Third-party TMDB API keys exist exclusively on the backend server.
* The frontend only communicates with application-owned API endpoints.
* Axios timeouts are strictly enforced (8000ms) to prevent hanging server connections.

### 7. Zero Information Leakage
* Production error responses strictly return `{ success: false, error: { code, message } }`.
* Stack traces, database connection URLs, internal SQL tables, and Axios config dumps are never exposed to clients.

### 8. Architectural Limitations
* **Authentication**: Authentication (JWT, sessions, multi-user accounts) is deliberately omitted per the assignment specification. The wishlist operates at an application level.
* **In-Memory Cache & Limiter**: The in-memory LRU cache and rate limiter are optimized for single-instance deployments. For horizontally scaled multi-instance clusters, a distributed store (e.g. Redis) would be introduced.

---

## 🛠️ Developer Scripts

| Command | Purpose |
| :--- | :--- |
| `npm test` | **Execute the unified backend test suite across all 6 layers with summary reporting.** |
| `npm run test:security` | Execute Layer 6: Backend Security & Production Readiness Tests. |
| `npm run test:unit` | Execute Layer 1: Pure Unit Tests (Validators, Mappers, Cache). |
| `npm run test:providers` | Execute Layer 2: Movie Provider Contract & Failure Simulation Tests. |
| `npm run test:services` | Execute Layer 3: Service & Business Logic Tests. |
| `npm run test:integration`| Execute Layer 4: Express HTTP API Integration Tests. |
| `npm run test:database` | Execute Layer 5: PostgreSQL Database Integration Tests. |
| `npm run dev` | Start development server with hot-reload (`ts-node-dev`). |
| `npm run typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`). |
| `npm run build` | Compile TypeScript into production JavaScript bundle (`dist/`). |
| `npm run test:errors` | Execute Step 10 error handling, edge cases, and normalization test suite. |
| `npm run test:performance` | Execute Step 9 caching, TTL, LRU eviction, request coalescing, and bounds test suite. |
| `npm run test:wishlist` | Execute the end-to-end automated Wishlist lifecycle test suite. |
| `npm run test:step6` | Execute Search, Filter, Sort, and Pagination validation tests. |
| `npm run test:api` | Execute Movie Service & Normalization unit tests. |
| `npm run test:tmdb` | Test TMDB external client and timeout handling. |
| `npm run test:db` | Test direct PostgreSQL connection and unique constraints. |
| `npm run db:generate` | Regenerate Prisma Client types from `schema.prisma`. |
| `npm run db:studio` | Launch visual database browser at `http://localhost:5555`. |
| `npm run db:seed` | Seed database with sample wishlist records (`550`, `680`, `272`). |

