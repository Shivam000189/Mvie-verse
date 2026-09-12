import type { Server } from "http";
import app from "../app";
import {
  InMemoryRateLimiter,
  generalApiLimiter,
  ExponentialBackoffRateLimiter,
} from "../middleware/rate-limit.middleware";
import { movieService } from "../services/movie.service";
import { MockMovieProvider } from "../providers/mock-movie.provider";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: unknown): void {
  if (condition) {
    passedCount++;
    console.log(`  ✅ ${testName}`);
  } else {
    failedCount++;
    console.error(`  ❌ ${testName}`, failureDetails ? failureDetails : "");
  }
}

export async function runSecurityTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n=================================================");
  console.log("🛡️ Layer 6: Backend Security & Production Readiness Tests");
  console.log("=================================================");

  movieService.setProvider(new MockMovieProvider());
  generalApiLimiter.reset();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind ephemeral test server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // ----------------------------------------------------
    // 1. HTTP Security Headers
    // ----------------------------------------------------
    console.log("\n[Group 1] HTTP Security Headers Verification");

    const res = await fetch(`${baseUrl}/api/health`);
    const contentTypeOptions = res.headers.get("x-content-type-options");
    const frameOptions = res.headers.get("x-frame-options");
    const referrerPolicy = res.headers.get("referrer-policy");
    const poweredBy = res.headers.get("x-powered-by");

    assert(
      contentTypeOptions === "nosniff",
      "X-Content-Type-Options header is set to 'nosniff' (prevents MIME confusion)"
    );
    assert(
      frameOptions === "DENY",
      "X-Frame-Options header is set to 'DENY' (prevents clickjacking)"
    );
    assert(
      referrerPolicy === "strict-origin-when-cross-origin",
      "Referrer-Policy header is set to 'strict-origin-when-cross-origin'"
    );
    assert(
      poweredBy === null,
      "X-Powered-By fingerprinting header is successfully stripped"
    );

    // ----------------------------------------------------
    // 2. Request Body Limit (10kb) Protection
    // ----------------------------------------------------
    console.log("\n[Group 2] Request Body Size Protection");

    // Generate a payload larger than 10KB (e.g. 15KB of dummy data)
    const largePayload = {
      movieId: 550,
      dummyData: "x".repeat(15 * 1024),
    };

    const largeBodyRes = await fetch(`${baseUrl}/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(largePayload),
    });
    const largeBodyJson = await largeBodyRes.json();

    assert(
      largeBodyRes.status === 413 &&
        largeBodyJson.success === false &&
        largeBodyJson.error?.code === "PAYLOAD_TOO_LARGE",
      "Oversized request body (>10kb) is rejected with 413 PAYLOAD_TOO_LARGE"
    );

    // ----------------------------------------------------
    // 3. Search Query Bounds Protection
    // ----------------------------------------------------
    console.log("\n[Group 3] Large Input & Query Bounds Protection");

    // Search query exceeding 100 characters
    const excessiveSearch = "a".repeat(120);
    const searchRes = await fetch(`${baseUrl}/api/movies?search=${excessiveSearch}`);
    const searchJson = await searchRes.json();

    assert(
      searchRes.status === 400 &&
        searchJson.success === false &&
        searchJson.error?.code === "INVALID_REQUEST",
      "Excessive search query (>100 chars) is rejected with 400 INVALID_REQUEST"
    );

    // ----------------------------------------------------
    // 4. Rate Limiting Protection & Exponential Backoff
    // ----------------------------------------------------
    console.log("\n[Group 4] Rate Limiting Protection & Exponential Backoff");

    const testLimiter = new InMemoryRateLimiter({
      windowMs: 1000,
      maxRequests: 3,
      message: "Test rate limit reached",
    });

    // Simulate 4 rapid requests against the test limiter
    const testReq: any = { ip: "192.168.1.100", socket: {} };
    let rateLimitTriggered = false;

    for (let i = 1; i <= 4; i++) {
      const mockRes: any = {
        headers: {} as Record<string, string | number>,
        setHeader(name: string, val: any) {
          this.headers[name] = val;
        },
      };

      testLimiter.middleware()(testReq, mockRes, (err?: any) => {
        if (err && err.statusCode === 429 && err.code === "RATE_LIMITED") {
          rateLimitTriggered = true;
        }
      });
    }

    assert(
      rateLimitTriggered,
      "Rate limiter blocks requests exceeding maxRequests threshold and returns 429 RATE_LIMITED"
    );

    // Test Exponential Backoff Limiter
    const authBackoffLimiter = new ExponentialBackoffRateLimiter({
      windowMs: 5000,
      maxAttempts: 2,
      backoffBaseMs: 500,
      maxBackoffMs: 10000,
      accountKeyExtractor: (req) => (req.body as any)?.email,
    });

    // Record 2 failures (threshold)
    authBackoffLimiter.recordFailure("acc:test@example.com");
    const retrySecs1 = authBackoffLimiter.recordFailure("acc:test@example.com");

    const authReq: any = {
      ip: "10.0.0.1",
      socket: {},
      body: { email: "test@example.com" },
    };
    let authBlocked = false;
    let authRetryAfter = 0;

    const authResMock: any = {
      setHeader(name: string, val: any) {
        if (name === "Retry-After") authRetryAfter = val;
      },
    };

    authBackoffLimiter.middleware()(authReq, authResMock, (err?: any) => {
      if (err && err.statusCode === 429 && err.code === "AUTH_RATE_LIMITED") {
        authBlocked = true;
      }
    });

    assert(
      retrySecs1 > 0 && authBlocked && authRetryAfter > 0,
      "Exponential backoff rate limiter calculates progressive delays on repeated failures and issues 429"
    );

    // ----------------------------------------------------
    // 5. Strict Input Validation & Schema Enforcement
    // ----------------------------------------------------
    console.log("\n[Group 5] Strict Input Validation & Schema Enforcement");

    // POST /api/wishlist with unwhitelisted extra fields
    const unwhitelistedBodyRes = await fetch(`${baseUrl}/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: 550, unauthorizedField: "malicious_injection" }),
    });
    const unwhitelistedBodyJson = await unwhitelistedBodyRes.json();

    assert(
      unwhitelistedBodyRes.status === 400 &&
        unwhitelistedBodyJson.success === false &&
        unwhitelistedBodyJson.error?.code === "INVALID_REQUEST",
      "Strict schema rejects unrecognized properties in request bodies with 400 INVALID_REQUEST"
    );

    // GET /api/movies with unwhitelisted query parameter
    const unwhitelistedQueryRes = await fetch(`${baseUrl}/api/movies?unrecognizedParam=true`);
    const unwhitelistedQueryJson = await unwhitelistedQueryRes.json();

    assert(
      unwhitelistedQueryRes.status === 400 &&
        unwhitelistedQueryJson.success === false &&
        unwhitelistedQueryJson.error?.code === "INVALID_REQUEST",
      "Strict schema rejects unrecognized query parameters with 400 INVALID_REQUEST"
    );

    // ----------------------------------------------------
    // 6. Zero Secret & Stack Trace Leakage
    // ----------------------------------------------------
    console.log("\n[Group 6] Secret Redaction & Safe Error Envelopes");

    const error404 = await fetch(`${baseUrl}/api/movies/999999`);
    const json404 = await error404.json();

    const error400 = await fetch(`${baseUrl}/api/movies/invalid-id`);
    const json400 = await error400.json();

    const notFoundRoute = await fetch(`${baseUrl}/api/unmapped-endpoint`);
    const jsonRoute = await notFoundRoute.json();

    const stringifiedErrors = JSON.stringify([json404, json400, jsonRoute]);

    const hasStack = stringifiedErrors.includes(" at ") || stringifiedErrors.includes("node_modules");
    const hasDbCredentials =
      stringifiedErrors.includes("postgres://") ||
      stringifiedErrors.includes("postgresql://") ||
      stringifiedErrors.includes("DATABASE_URL");
    const hasApiKey = stringifiedErrors.includes("TMDB_API_KEY") || stringifiedErrors.includes("Bearer ");

    assert(
      !hasStack && !hasDbCredentials && !hasApiKey,
      "API responses never leak stack traces, database URLs, passwords, or provider API keys"
    );
  } finally {
    server.close();
  }

  return { passed: passedCount, failed: failedCount };
}

if (require.main === module) {
  runSecurityTests().then(({ passed, failed }) => {
    console.log(`\nLayer 6 Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  });
}
