import type { Request, Response } from "express";
import { sendError } from "../utils/api-response";

export const notFoundMiddleware = (req: Request, res: Response): void => {
  sendError(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    "NOT_FOUND"
  );
};
