export type AppErrorCode =
  | "INVALID_MOVIE_ID"
  | "MOVIE_NOT_FOUND"
  | "MOVIE_SERVICE_UNAVAILABLE"
  | "MOVIE_ALREADY_IN_WISHLIST"
  | "WISHLIST_ITEM_NOT_FOUND"
  | "DUPLICATE_WISHLIST_ITEM"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: AppErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: AppErrorCode = "INTERNAL_SERVER_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
  }

  public static badRequest(
    message: string,
    code: AppErrorCode = "BAD_REQUEST",
    details?: unknown
  ): AppError {
    return new AppError(message, 400, code, details);
  }

  public static notFound(
    message = "Resource not found",
    code: AppErrorCode = "MOVIE_NOT_FOUND"
  ): AppError {
    return new AppError(message, 404, code);
  }

  public static conflict(
    message = "Resource already exists",
    code: AppErrorCode = "CONFLICT",
    details?: unknown
  ): AppError {
    return new AppError(message, 409, code, details);
  }

  public static serviceUnavailable(
    message = "Service is temporarily unavailable",
    code: AppErrorCode = "MOVIE_SERVICE_UNAVAILABLE"
  ): AppError {
    return new AppError(message, 503, code);
  }
}
