import axios, { AxiosError } from "axios";
import type { TmdbErrorResponse } from "../types/tmdb.types";

export type TmdbErrorCode =
  | "TMDB_TIMEOUT"
  | "TMDB_UNAUTHORIZED"
  | "TMDB_NOT_FOUND"
  | "TMDB_RATE_LIMITED"
  | "TMDB_UNAVAILABLE"
  | "TMDB_BAD_RESPONSE"
  | "TMDB_NETWORK_ERROR";

export class TmdbError extends Error {
  public readonly code: TmdbErrorCode;
  public readonly statusCode: number;
  public readonly details?: TmdbErrorResponse | Record<string, unknown>;

  constructor(
    message: string,
    code: TmdbErrorCode,
    statusCode = 500,
    details?: TmdbErrorResponse | Record<string, unknown>
  ) {
    super(message);
    this.name = "TmdbError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, TmdbError.prototype);
  }
}

export const handleTmdbError = (error: unknown): never => {
  if (error instanceof TmdbError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<TmdbErrorResponse>;

    // 1. Timeout error
    if (axiosError.code === "ECONNABORTED" || axiosError.message.includes("timeout")) {
      throw new TmdbError(
        "Request to TMDB timed out",
        "TMDB_TIMEOUT",
        504
      );
    }

    // 2. Network error (no response received)
    if (!axiosError.response) {
      throw new TmdbError(
        `Failed to reach TMDB: ${axiosError.message}`,
        "TMDB_NETWORK_ERROR",
        503
      );
    }

    const { status, data } = axiosError.response;
    const statusMessage = data?.status_message || axiosError.message;

    switch (status) {
      case 401:
        throw new TmdbError(
          `TMDB authentication failed: ${statusMessage}`,
          "TMDB_UNAUTHORIZED",
          401,
          data
        );
      case 404:
        throw new TmdbError(
          `Resource not found on TMDB: ${statusMessage}`,
          "TMDB_NOT_FOUND",
          404,
          data
        );
      case 429:
        throw new TmdbError(
          "TMDB rate limit exceeded. Please try again later.",
          "TMDB_RATE_LIMITED",
          429,
          data
        );
      case 500:
      case 502:
      case 503:
      case 504:
        throw new TmdbError(
          `TMDB service unavailable (${status}): ${statusMessage}`,
          "TMDB_UNAVAILABLE",
          502,
          data
        );
      default:
        throw new TmdbError(
          `TMDB request failed with status ${status}: ${statusMessage}`,
          "TMDB_BAD_RESPONSE",
          status,
          data
        );
    }
  }

  if (error instanceof Error) {
    throw new TmdbError(
      error.message,
      "TMDB_BAD_RESPONSE",
      500
    );
  }

  throw new TmdbError(
    "Unknown error occurred while communicating with TMDB",
    "TMDB_BAD_RESPONSE",
    500
  );
};
