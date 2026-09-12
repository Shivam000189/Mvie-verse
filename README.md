# 🎬 Movie Discovery App — Backend

A production-ready, type-safe REST API for movie discovery and persistent wishlist management, built with **Node.js**, **Express**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and the **TMDB API** (abstracted behind a provider layer).

> 📌 **Current Status**: The backend foundation, business logic, provider abstraction, caching, centralized error handling, security hardening, and 6-layer automated test suite are **100% complete**. The React + TypeScript frontend will be implemented in the next phase.

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Implemented Features](#-key-implemented-features)
3. [System Architecture & Layer Responsibilities](#-system-architecture--layer-responsibilities)
4. [Tech Stack](#-tech-stack)
5. [Project Directory Structure](#-project-directory-structure)
6. [Movie Provider Architecture](#-movie-provider-architecture)
7. [Environment Configuration](#-environment-configuration)
8. [Local Installation & Setup](#-local-installation--setup)
9. [Database Setup & Schema Design](#-database-setup--schema-design)
10. [REST API Reference](#-rest-api-reference)
11. [Query, Search, Filtering & Pagination](#-query-search-filtering--pagination)
12. [Centralized Error Handling](#-centralized-error-handling)
13. [Caching & Performance Architecture](#-caching--performance-architecture)
14. [Security & Production Readiness](#-security--production-readiness)
15. [Testing Strategy (6 Layers / 71 Tests)](#-testing-strategy-6-layers--71-tests)
16. [Developer Scripts](#-developer-scripts)
17. [Technical Decisions & Trade-Offs](#-technical-decisions--trade-offs)
18. [Known Limitations & Future Roadmap](#-known-limitations--future-roadmap)
19. [AI Usage Disclosure](#-ai-usage-disclosure)

---

## 🎯 Project Overview

The **Movie Discovery App** is designed for a software engineering internship assignment to evaluate full-stack architectural design, data normalization, resilience against external API failures, database integrity under concurrency, in-memory caching, security practices, and clean automated testing.

The backend exposes an application-owned REST API. The external provider (TMDB) remains strictly decoupled behind an `IMovieProvider` abstraction. During development and testing, an offline deterministic `MockMovieProvider` is used, allowing the entire system to run and pass all test suites without external API keys or active internet access.

---

## 🚀 Key Implemented Features

* **Movie Discovery & Catalog Exploration**: Paginated movie listings supporting discovery mode and keyword search.
* **Multi-Attribute Filtering**: Filter movies simultaneously by genre ID and release year.
* **Strict Sorting Whitelist**: Sort results by `popularity` (default), `rating`, `release_date`, or `title`.
* **Bounded Pagination**: Enforces safe limits (`page >= 1`, `1 <= limit <= 20`) to prevent denial-of-service memory spikes.
* **Detailed Movie Metadata**: Full metadata including runtime, budget, revenue, tagline, IMDb ID, genres, and poster/backdrop paths.
* **Persistent Wishlist**: Add, view, check status, and remove movies from a persistent PostgreSQL database.
* **Concurrency & Race Condition Guard**: Database-level unique constraint (`@unique` on `movieId`) atomically prevents duplicate wishlist entries during simultaneous requests.
* **Provider Abstraction Layer**: Decouples domain logic from TMDB; allows runtime provider switching (`MockMovieProvider` vs `TmdbMovieProvider`).
* **In-Memory Caching & LRU Eviction**: Domain-specific TTLs (1h genres, 10m details, 2m listings) with bounded sizes and LRU eviction.
* **In-Flight Request Coalescing**: Prevents cache stampedes / dog-piling by multiplexing concurrent requests for identical uncached keys onto a single upstream execution.
* **Error Non-Caching Policy**: Transient upstream errors (timeouts, 503s) are never cached, enabling instant recovery.
* **Centralized Error Handling**: Standardized error envelope `{ success: false, error: { code, message }, timestamp }` with complete stack trace redaction in production.
* **Security Hardening**: OWASP security headers (`nosniff`, `DENY`, CSP), 10KB body limit (`413`), 100-character search bounds, and in-memory rate limiting (`429`).
* **Multi-Layer Automated Testing**: 71 automated tests across 6 testing layers (Unit, Provider, Service, API Integration, Database, Security).

---

## 🏛️ System Architecture & Layer Responsibilities

```
                                 HTTP Client Request (React / curl)
                                                │
                                                ▼
                                   [OWASP Security Headers]
                                                │
                                                ▼
                                     [Rate Limiting (429)]
                                                │
                                                ▼
                                    [Body Parser (10KB max)]
                                                │
                                                ▼
                                   [Zod Input Validation (400)]
                                                │
                                                ▼
                                    [Express Route Matching]
                                                │
                                                ▼
                                      [Thin Controllers]
                                                │
                                                ▼
                                      [Domain Services]
                                       │              │
                    ┌──────────────────┴──┐        ┌──┴────────────────┐
                    ▼                     ▼        ▼                   ▼
           [In-Memory Cache]     [Movie Provider] [Prisma Client]  [PostgreSQL]
           (TTL, LRU, Coalescing) (Mock / TMDB)    (ORM queries)    (Persistence)
                    │                     │        │                   │
                    └─────────────────────┼────────┴───────────────────┘
                                          │ (Controlled AppError or Success)
                                          ▼
                             [Central Error Middleware]
                                          │ (Sanitizes internals & formats envelope)
                                          ▼
                                Standard JSON Response
```

### Layer Responsibilities

| Layer | Primary Files | Responsibilities |
| :--- | :--- | :--- |
| **Routes** | `src/routes/*.ts` | Defines endpoint paths and maps HTTP verbs (`GET`, `POST`, `DELETE`) to controller actions. |
| **Validators / Schemas** | `src/schemas/*.ts` | Validates and coerces query params, route parameters, and request bodies using Zod before controller execution. |
| **Controllers** | `src/controllers/*.ts` | Thin HTTP handlers. Reads validated input, calls services, chooses HTTP status codes (`200`, `201`, `400`, `404`, `409`), and returns standard envelopes. |
| **Services** | `src/services/*.ts` | Contains core business logic, coordinates caching, orchestrates provider calls, manages database persistence, and translates low-level errors. |
| **Providers** | `src/providers/*.ts` | Implements `IMovieProvider`. Handles provider-specific communication, raw pagination, and payload normalization. |
| **Database (Prisma)** | `prisma/schema.prisma` | Type-safe database queries, migrations, and atomic PostgreSQL constraints. |
| **Middleware** | `src/middleware/*.ts` | Request logging, OWASP security headers, CORS verification, in-memory rate limiting, 404 unmapped route interception, and centralized error handling. |

---

## 💻 Tech Stack

* **Runtime**: Node.js (`v20+` or `v22+`)
* **Framework**: Express.js (`v5.2.1`)
* **Language**: TypeScript (`v5.8.2`) in strict mode
* **Database**: PostgreSQL (Neon Cloud / Local PostgreSQL)
* **ORM**: Prisma (`v6.19.3`)
* **Validation**: Zod (`v4.3.6`)
* **HTTP Client**: Axios (`v1.7.9`) with 8000ms timeouts
* **Middleware**: CORS, Compression (gzip/deflate), Custom Security Headers, Custom Rate Limiter
* **Testing**: TypeScript script-based test runners with native Node.js asynchronous execution

---

## 📂 Project Directory Structure

```text
server/
├── prisma/
│   ├── migrations/              # Prisma SQL migration history
│   └── schema.prisma            # PostgreSQL schema definition (Wishlist model)
│
├── src/
│   ├── clients/                 # (Optional raw client wrappers)
│   ├── config/
│   │   ├── database.ts          # PrismaClient singleton instance
│   │   ├── env.ts               # Startup environment validation with Zod
│   │   └── tmdb.ts              # Axios instance configured with TMDB headers & timeout
│   │
│   ├── controllers/
│   │   ├── movie.controller.ts  # Movie listing, search, details, and genre endpoints
│   │   └── wishlist.controller.ts # Wishlist CRUD endpoints
│   │
│   ├── middleware/
│   │   ├── error.middleware.ts  # Centralized error handler & status mapper
│   │   ├── logger.middleware.ts # HTTP request performance & duration logger
│   │   ├── not-found.middleware.ts # 404 ROUTE_NOT_FOUND handler
│   │   ├── rate-limit.middleware.ts # Sliding-window in-memory rate limiter
│   │   └── security.middleware.ts # OWASP HTTP security headers (nosniff, DENY, CSP)
│   │
│   ├── providers/
│   │   ├── failing-movie.provider.ts # Upstream error & timeout simulation harness
│   │   ├── mock-movie.provider.ts  # In-memory deterministic mock movie dataset
│   │   ├── movie-provider.interface.ts # IMovieProvider contract
│   │   └── tmdb-movie.provider.ts  # Live TMDB API provider adapter
│   │
│   ├── routes/
│   │   ├── movie.routes.ts      # /api/movies routes
│   │   └── wishlist.routes.ts   # /api/wishlist routes
│   │
│   ├── schemas/
│   │   ├── movie.schema.ts      # Zod validation for query params and :id
│   │   └── wishlist.schema.ts   # Zod validation for wishlist body and :movieId
│   │
│   ├── scripts/                 # Automated test suites & database scripts
│   │   ├── run-all-tests.ts     # Master test runner (all 6 layers)
│   │   ├── seed-db.ts           # PostgreSQL seeding utility
│   │   ├── test-api-integration.ts # Layer 4: Express HTTP integration tests
│   │   ├── test-db-integration.ts  # Layer 5: PostgreSQL database persistence tests
│   │   ├── test-errors.ts       # Step 10 error matrix test
│   │   ├── test-performance.ts  # Step 9 cache & coalescing test
│   │   ├── test-providers.ts    # Layer 2: Movie provider contract tests
│   │   ├── test-security.ts     # Layer 6: Security headers & rate limit tests
│   │   ├── test-services.ts     # Layer 3: Service business logic tests
│   │   ├── test-step6.ts        # Step 6 query & filter validation test
│   │   ├── test-tmdb.ts         # Live TMDB connection test
│   │   ├── test-unit.ts         # Layer 1: Pure unit tests (Mappers, Zod, AppError)
│   │   └── test-wishlist.ts     # Step 8 wishlist lifecycle test
│   │
│   ├── services/
│   │   ├── movie.service.ts     # Movie catalog, caching, and coalescing service
│   │   ├── tmdb.service.ts      # Direct TMDB REST endpoint methods
│   │   └── wishlist.service.ts  # Wishlist PostgreSQL persistence & metadata hydration
│   │
│   ├── types/
│   │   ├── movie.types.ts       # Application-owned Movie domain models
│   │   ├── tmdb.types.ts        # Upstream TMDB raw JSON schemas
│   │   └── wishlist.types.ts    # Wishlist response models
│   │
│   ├── utils/
│   │   ├── api-response.ts      # Standard sendSuccess and sendError helpers
│   │   ├── app-error.ts         # Standard AppError class & factory helpers
│   │   ├── cache.ts             # Generic InMemoryCache with TTL, LRU, and coalescing
│   │   ├── movie.mapper.ts      # Defensive normalizer (TMDB raw -> domain Movie)
│   │   └── tmdb-error.ts        # TMDB status code classifier
│   │
│   ├── app.ts                   # Express application configuration & middleware stack
│   └── server.ts                # HTTP server bootstrap & graceful shutdown listeners
│
├── .env.example                 # Safe environment variables template
├── .gitignore                   # Git ignore file (strictly ignores .env, node_modules, dist)
├── package.json                 # Project manifest & npm scripts
├── tsconfig.json                # TypeScript compiler configuration
└── README.md                    # Root project documentation
```

---

## 🔌 Movie Provider Architecture

The backend implements a **Provider Pattern** to decouple application business logic from external third-party APIs.

```text
                        ┌──────────────────────────────┐
                        │         MovieService         │
                        └──────────────┬───────────────┘
                                       │ (Depends on interface)
                                       ▼
                        ┌──────────────────────────────┐
                        │      «IMovieProvider»        │
                        ├──────────────────────────────┤
                        │ + getMovies(query)           │
                        │ + getMovieById(id)           │
                        │ + getGenres()                │
                        └──────────────▲───────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
 ┌──────────────┴──────────────┐               ┌──────────────┴──────────────┐
 │      MockMovieProvider      │               │      TmdbMovieProvider      │
 ├─────────────────────────────┤               ├─────────────────────────────┤
 │ • 100% Offline dataset      │               │ • Live TMDB Axios Client    │
 │ • Zero credentials needed   │               │ • Normalization via Mapper  │
 │ • Instant execution in CI   │               │ • 8000ms timeout handling   │
 └─────────────────────────────┘               └─────────────────────────────┘
```

### Why Provider Abstraction?

1. **Testability & Determinism**: Unit and integration tests run against `MockMovieProvider` without making live network requests, eliminating test flakiness and API quota consumption.
2. **Seamless Upstream Swapping**: Enabling TMDB requires changing only `MOVIE_PROVIDER=tmdb` in `.env`. Controllers, routes, and client responses remain identical.
3. **Resilience & Fault Isolation**: Upstream TMDB errors (timeouts, rate limits, malformed payloads) are captured and translated inside the provider layer, preventing raw Axios dumps from leaking to clients.

---

## ⚙️ Environment Configuration

Configuration is managed via `.env` and strictly validated at server startup in `src/config/env.ts`.

| Variable | Type | Default | Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| `PORT` | `number` | `5000` | No | HTTP server port. |
| `NODE_ENV` | `string` | `development` | No | Environment mode (`development`, `test`, `production`). |
| `CORS_ORIGIN` | `string` | `http://localhost:5173` | No | Comma-separated list of allowed frontend origins. |
| `DATABASE_URL` | `string` | `""` | **Yes** | PostgreSQL connection string for Prisma. |
| `MOVIE_PROVIDER` | `string` | `mock` | **Yes** | Active movie provider: `mock` (offline) or `tmdb` (live API). |
| `TMDB_API_KEY` | `string` | `""` | Conditional | TMDB v3 API Key (required only if `MOVIE_PROVIDER=tmdb`). |
| `TMDB_ACCESS_TOKEN` | `string` | `""` | Conditional | TMDB v4 Read Access Token (Bearer token). |
| `TMDB_BASE_URL` | `string` | `https://api.themoviedb.org/3` | No | TMDB REST API root endpoint. |
| `TMDB_IMAGE_BASE_URL`| `string` | `https://image.tmdb.org/t/p` | No | TMDB CDN base URL for posters and backdrops. |
| `TMDB_TIMEOUT_MS` | `number` | `8000` | No | Maximum Axios request timeout in milliseconds. |

> 🔒 **Security Notice**: Startup validation enforces TMDB credentials **only** when `MOVIE_PROVIDER=tmdb`. When `MOVIE_PROVIDER=mock`, the server boots cleanly without requiring third-party credentials.

---

## 🛠️ Local Installation & Setup

### 1. Clone & Navigate to Server Directory
```bash
git clone https://github.com/Shivam000189/Mvie-verse.git
cd "Movie Discovery App/server"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Local Environment Configuration
```bash
# On Linux / macOS / Git Bash:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

Edit `.env` and configure your `DATABASE_URL`. If you wish to use mock data, keep `MOVIE_PROVIDER=mock`.

---

## 🗄️ Database Setup & Schema Design

### 1. Database Migrations
Apply the Prisma migration to create the PostgreSQL tables:
```bash
npm run db:migrate
```

### 2. (Optional) Seed Database with Initial Wishlist Records
```bash
npm run db:seed
```

### 3. (Optional) Launch Prisma Studio
Open the visual database management GUI in your browser:
```bash
npm run db:studio
```

---

### Database Schema (`prisma/schema.prisma`)

```prisma
model Wishlist {
  id        Int      @id @default(autoincrement())
  movieId   Int      @unique
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@map("wishlists")
}
```

### Why only `movieId` is stored in PostgreSQL (Data Ownership)

* **Application-Owned Data**: PostgreSQL stores user intent (which movies are wishlisted and when they were added).
* **Provider-Owned Data**: Upstream TMDB owns movie metadata (title, overview, poster URL, vote average).
* **Zero Data Staleness**: Storing only `movieId` ensures users always see the latest ratings and poster paths without requiring background sync jobs.
* **Storage Efficiency**: Keeps database records lightweight (~30 bytes per entry).
* **Atomic Race Condition Defense**: The database `@unique` constraint on `movieId` atomically prevents duplicate entries even when concurrent duplicate requests arrive at the same millisecond.

---

## 📡 REST API Reference

All responses return a predictable standard JSON envelope:
* **Success**: `{ "success": true, "data": ..., "timestamp": "..." }`
* **Error**: `{ "success": false, "error": { "code": "...", "message": "..." }, "timestamp": "..." }`

### Endpoint Summary Table

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Lightweight server uptime and health check | Excluded |
| `GET` | `/api/movies` | Discover / search paginated movies with filters and sorting | 100 req / 15 min |
| `GET` | `/api/movies/:id` | Retrieve full movie details by numeric ID | 100 req / 15 min |
| `GET` | `/api/movies/genres` | Retrieve available movie genre taxonomy | 100 req / 15 min |
| `GET` | `/api/wishlist` | Retrieve all wishlisted movies (ordered by newest first) | 100 req / 15 min |
| `POST` | `/api/wishlist` | Add a movie to the wishlist | 30 req / 1 min |
| `GET` | `/api/wishlist/:movieId` | Check if a specific movie is in the wishlist | 100 req / 15 min |
| `DELETE`| `/api/wishlist/:movieId`| Remove a movie from the wishlist | 30 req / 1 min |

---

### 1. Health Check
```http
GET /api/health
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 142,
    "timestamp": "2026-09-12T06:00:00.000Z"
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 2. Discover & Search Movies
```http
GET /api/movies?search=Inception&genre=28&year=2010&sort=rating&page=1&limit=20
```

| Parameter | Type | Required | Default | Validation Rules |
| :--- | :--- | :---: | :--- | :--- |
| `search` | `string` | No | — | Trimmed, maximum 100 characters. |
| `genre` | `number` | No | — | Positive integer ID (e.g. `28` for Action). |
| `year` | `number` | No | — | Integer between `1888` and `CURRENT_YEAR + 5`. |
| `sort` | `string` | No | `popularity` | Whitelist: `popularity`, `rating`, `release_date`, `title`. |
| `page` | `number` | No | `1` | Integer $\ge 1$. |
| `limit` | `number` | No | `20` | Integer between `1` and `20`. |

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "movies": [
      {
        "id": 27205,
        "title": "Inception",
        "overview": "Cobb, a skilled thief who steals corporate secrets through dream-sharing technology...",
        "posterUrl": "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "rating": 8.3,
        "voteCount": 35000,
        "releaseDate": "2010-07-15",
        "genres": [
          { "id": 28, "name": "Action" },
          { "id": 878, "name": "Sci-Fi" },
          { "id": 12, "name": "Adventure" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "totalResults": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 3. Get Movie Details
```http
GET /api/movies/550
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "movie": {
      "id": 550,
      "title": "Fight Club",
      "overview": "An insomniac office worker and a devil-may-care soap maker form an underground fight club.",
      "posterUrl": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
      "rating": 8.4,
      "voteCount": 27500,
      "releaseDate": "1999-10-15",
      "genres": [
        { "id": 18, "name": "Drama" },
        { "id": 53, "name": "Thriller" }
      ],
      "tagline": "Mischief. Mayhem. Soap.",
      "runtime": 139,
      "status": "Released",
      "budget": 63000000,
      "revenue": 100853753,
      "homepage": "http://www.foxmovies.com/movies/fight-club",
      "imdbId": "tt0137523",
      "originalLanguage": "en"
    }
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 4. Get Movie Genres Taxonomy
```http
GET /api/movies/genres
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "genres": [
      { "id": 28, "name": "Action" },
      { "id": 12, "name": "Adventure" },
      { "id": 16, "name": "Animation" },
      { "id": 35, "name": "Comedy" },
      { "id": 80, "name": "Crime" },
      { "id": 18, "name": "Drama" },
      { "id": 14, "name": "Fantasy" },
      { "id": 27, "name": "Horror" },
      { "id": 878, "name": "Sci-Fi" },
      { "id": 53, "name": "Thriller" }
    ]
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 5. Add Movie to Wishlist
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
    "addedAt": "2026-09-12T06:00:00.000Z"
  },
  "message": "Movie added to wishlist",
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

*Duplicate Attempt (`409 Conflict`):*
```json
{
  "success": false,
  "error": {
    "code": "MOVIE_ALREADY_IN_WISHLIST",
    "message": "Movie is already in the wishlist."
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 6. Get Wishlist
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
        "overview": "An insomniac office worker...",
        "posterUrl": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/w1280/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
        "rating": 8.4,
        "voteCount": 27500,
        "releaseDate": "1999-10-15",
        "genres": [
          { "id": 18, "name": "Drama" },
          { "id": 53, "name": "Thriller" }
        ]
      }
    ],
    "total": 1
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 7. Check Wishlist Status
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
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

### 8. Remove Movie from Wishlist
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
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

---

## 🛡️ Centralized Error Handling

The application maps internal exceptions to domain-level status codes and envelopes via `src/middleware/error.middleware.ts`.

### Standardized Error Format
```json
{
  "success": false,
  "error": {
    "code": "MOVIE_NOT_FOUND",
    "message": "Movie was not found."
  },
  "timestamp": "2026-09-12T06:00:00.000Z"
}
```

### Domain Error Code Reference

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_REQUEST` | Query parameter, route parameter, or request body failed validation. |
| `400 Bad Request` | `INVALID_MOVIE_ID` | Non-numeric or non-positive ID passed in URL route parameters. |
| `404 Not Found` | `MOVIE_NOT_FOUND` | Upstream movie ID does not exist in the provider catalog. |
| `404 Not Found` | `WISHLIST_ITEM_NOT_FOUND` | Target movie ID does not exist in the user's wishlist during deletion. |
| `404 Not Found` | `ROUTE_NOT_FOUND` | Unhandled HTTP route path (`GET /api/unknown-route`). |
| `409 Conflict` | `MOVIE_ALREADY_IN_WISHLIST` | Movie is already present in wishlist (enforced by DB unique constraint). |
| `413 Payload Too Large` | `PAYLOAD_TOO_LARGE` | Request payload exceeds the 10KB body limit. |
| `429 Too Many Requests` | `RATE_LIMITED` | Client exceeded the allowed request threshold. |
| `500 Server Error` | `DATABASE_ERROR` | PostgreSQL database connection or query failure (internals sanitized). |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Generic fallback for unexpected exceptions (stack traces suppressed). |
| `503 Service Unavailable`| `MOVIE_SERVICE_UNAVAILABLE` | External movie provider timeout or network unreachable. |

---

## ⚡ Caching & Performance Architecture

The backend includes a custom generic in-memory cache (`src/utils/cache.ts`) designed specifically to optimize TMDB API quota consumption and minimize database latency.

```
Incoming Request
      │
      ▼
Check In-Memory Cache (Key: "movies:search=:genre=28:year=2024:sort=popularity:page=1:limit=20")
      │
      ├── [Cache Hit] ──► Return cached JSON immediately (~1ms)
      │
      └── [Cache Miss]
             │
             ├── Check in-flight request map (Coalescing)
             │      └── [In-Flight Found] ──► Await existing Promise (prevents duplicate fetch)
             │
             └── [Execute Upstream Provider]
                    │
                    ├── [Success] ──► Store in Cache with TTL & return
                    │
                    └── [Failure] ──► DO NOT CACHE (Instant recovery on next call)
```

### Cache Configuration Policies

| Cache Name | Scope | TTL | Max Capacity | Eviction Policy |
| :--- | :--- | :--- | :---: | :--- |
| `GenreCache` | Taxonomy (`/api/movies/genres`) | 1 Hour | 10 entries | LRU (Least Recently Used) |
| `MovieDetailCache` | Single Movie Metadata (`/api/movies/:id`) | 10 Minutes | 500 entries | LRU (Least Recently Used) |
| `MovieListCache` | Discovery & Search (`/api/movies?...`) | 2 Minutes | 200 entries | LRU (Least Recently Used) |

---

## 🔒 Security & Production Readiness

1. **OWASP Security Headers**: Configured via `src/middleware/security.middleware.ts`:
   - `X-Content-Type-Options: nosniff` (prevents MIME confusion attacks)
   - `X-Frame-Options: DENY` (prevents clickjacking)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none';`
   - `X-Powered-By` header explicitly stripped.
2. **Request Body Minimization**: `express.json({ limit: "10kb" })` protects against payload memory exhaustion.
3. **Search Length Bounds**: Zod `.max(100)` prevents CPU exhaustion during search regex/substring matching.
4. **In-Memory Rate Limiting**: Bounded sliding-window rate limiting (`100 req / 15 min` for general API; `30 req / 1 min` for wishlist mutations).
5. **Database Security**: 100% parameterized queries via Prisma ORM; zero raw SQL string concatenation.
6. **Provider Credentials Isolation**: TMDB credentials exist exclusively on the server and are never exposed to clients.
7. **Zero Secret Leakage**: Error envelopes never expose stack traces, database URLs, passwords, or provider tokens.

---

## 🧪 Testing Strategy (6 Layers / 71 Tests)

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
| `npm start` | Run compiled production bundle (`node dist/server.js`). |
| `npm run test:errors` | Execute Step 10 error handling, edge cases, and normalization test suite. |
| `npm run test:performance` | Execute Step 9 caching, TTL, LRU eviction, request coalescing, and bounds test suite. |
| `npm run test:wishlist` | Execute the end-to-end automated Wishlist lifecycle test suite. |
| `npm run test:step6` | Execute Search, Filter, Sort, and Pagination validation tests. |
| `npm run test:api` | Execute Movie Service & Normalization unit tests. |
| `npm run test:tmdb` | Test TMDB external client and timeout handling. |
| `npm run test:db` | Test direct PostgreSQL connection and unique constraints. |
| `npm run db:generate` | Regenerate Prisma Client types from `schema.prisma`. |
| `npm run db:migrate` | Run Prisma database migrations against PostgreSQL. |
| `npm run db:studio` | Launch visual database browser at `http://localhost:5555`. |
| `npm run db:seed` | Seed database with sample wishlist records (`550`, `680`, `272`). |

---

## 💡 Technical Decisions & Trade-Offs

### 1. Why Node.js + Express + TypeScript?
Express provides a lightweight, minimalist HTTP foundation. TypeScript adds compile-time type safety across domain models, controller inputs, and database queries, preventing runtime `TypeError` bugs and improving developer velocity.

### 2. Why Prisma ORM over raw SQL?
Prisma provides type-safe database queries, automated SQL migrations, and prepared-statement parameterization by default. It eliminates SQL injection vulnerabilities while ensuring that schema modifications remain tracked in version control.

### 3. Why Provider Abstraction?
Decoupling the movie data provider behind `IMovieProvider` allows local development and CI/CD pipelines to run against `MockMovieProvider` without hitting TMDB rate limits or requiring secret credentials. Enabling TMDB is a one-line `.env` configuration change.

### 4. Why In-Memory Cache instead of Redis?
For an internship project deployed as a single-instance service, an in-memory LRU cache eliminates external infrastructure overhead while providing sub-millisecond lookups, TTL expirations, and request coalescing.

### 5. Why no User Authentication?
The assignment specification explicitly focuses on movie discovery, search/filtering, provider abstraction, caching, and persistence without requiring user accounts or authentication. Implementing mock auth or unsecured JWTs would introduce unnecessary complexity and distract from core requirements.

---

## ⚠️ Known Limitations & Future Roadmap

### Realistic Limitations
* **Single-Instance In-Memory State**: Cache and rate-limiter state reside in process memory. If the backend is horizontally scaled across multiple instances, a distributed store (e.g. Redis) is required.
* **Application-Level Wishlist**: Without user authentication, all clients interact with a shared application-level wishlist.
* **No Advanced DDoS/WAF**: Layer 7 DDoS mitigation, IP geo-blocking, and bot detection are expected to be handled by edge reverse proxies (e.g. Cloudflare / Nginx).

### Future Roadmap
1. **User Authentication**: Introduce OAuth 2.0 / JWT session cookies and multi-tenant `userId` relations on the Wishlist model.
2. **Distributed Redis Caching**: Replace in-memory caching and rate limiting with Redis cluster support.
3. **Advanced Movie Recommendations**: Implement cosine similarity / collaborative filtering for movie recommendations.
4. **React Frontend**: Implement modern React + Vite + TypeScript frontend with rich UI and debounce searching.

---

## 🤖 AI Usage Disclosure

In compliance with the assignment guidelines, AI tools (Google Antigravity / Gemini) were used during development for:
* Architectural planning and design pattern review.
* Scaffolding boilerplate TypeScript interfaces and Zod schemas.
* Generating edge-case test suites and error simulation providers.
* Formatting comprehensive markdown documentation.

**Developer Role**: All generated architecture, business logic, database migrations, security configurations, and test suites were reviewed, validated, modified, and verified through manual and automated test execution.
