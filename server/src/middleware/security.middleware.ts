import type { Request, Response, NextFunction } from "express";
import { isProduction } from "../config/env";

/**
 * Security Headers Middleware.
 * Applies OWASP-recommended HTTP security headers to protect against
 * MIME-type sniffing, clickjacking, XSS reflection, and information disclosure.
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Prevent browsers from MIME-sniffing a response away from the declared content-type
  res.setHeader("X-Content-Type-Options", "nosniff");

  // 2. Prevent clickjacking by forbidding embedding in frames/iframes
  res.setHeader("X-Frame-Options", "DENY");

  // 3. Disable legacy buggy XSS filters in favor of modern CSP
  res.setHeader("X-XSS-Protection", "0");

  // 4. Control referrer information sent in HTTP requests
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // 5. Restrict resource loading to secure origins (Content Security Policy)
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';");

  // 6. Enforce HTTPS in production via Strict-Transport-Security (HSTS)
  if (isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // 7. Strip fingerprinting header
  res.removeHeader("X-Powered-By");

  next();
}
