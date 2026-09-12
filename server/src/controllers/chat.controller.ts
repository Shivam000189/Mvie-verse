import type { NextFunction, Request, Response } from "express";
import { chatMessageSchema } from "../schemas/chat.schema";
import { chatService } from "../services/chat.service";
import { AppError } from "../utils/app-error";
import { sendSuccess } from "../utils/api-response";

export class ChatController {
  public async recommend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = chatMessageSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw AppError.badRequest(firstIssue?.message ?? "Invalid chat message", "INVALID_REQUEST");
      }

      sendSuccess(res, await chatService.answer(validation.data.message));
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
