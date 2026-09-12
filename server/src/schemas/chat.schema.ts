import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(500, { message: "Message cannot exceed 500 characters" }),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
