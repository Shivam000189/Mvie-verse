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

## 🛠️ Developer Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start development server with hot-reload (`ts-node-dev`). |
| `npm run typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`). |
| `npm run build` | Compile TypeScript into production JavaScript bundle (`dist/`). |
| `npm run db:generate` | Regenerate Prisma Client types from `schema.prisma`. |
| `npm run db:studio` | Launch visual database browser at `http://localhost:5555`. |
| `npm run db:seed` | Seed database with sample wishlist records (`550`, `680`, `272`). |
| `npm run test:wishlist` | Execute the end-to-end automated Wishlist lifecycle test suite. |
| `npm run test:step6` | Execute Search, Filter, Sort, and Pagination validation tests. |
| `npm run test:api` | Execute Movie Service & Normalization unit tests. |
| `npm run test:tmdb` | Test TMDB external client and timeout handling. |
| `npm run test:db` | Test direct PostgreSQL connection and unique constraints. |
