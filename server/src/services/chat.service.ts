import { env } from "../config/env";
import { wishlistService } from "./wishlist.service";
import type { ChatResponse } from "../types/chat.types";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent`;

export class ChatService {
  public async answer(message: string): Promise<ChatResponse> {
    const wishlist = await wishlistService.getWishlist();
    const movieContext = wishlist.items.length > 0
      ? wishlist.items.map((movie) => `${movie.title} (${movie.releaseDate?.slice(0, 4) ?? "year unknown"}, ${movie.genres.map((genre) => genre.name).join(", ")})`).join("; ")
      : "The wishlist is empty.";

    if (!env.gemini.apiKey) {
      return { reply: this.fallbackReply(message, wishlist.items.length), provider: "fallback" };
    }

    const prompt = [
      "You are Reelmark, a concise and warm movie recommendation assistant.",
      "Use the user's wishlist as taste context. Recommend movies, explain the connection briefly, and never claim a movie is in the wishlist unless listed.",
      "Keep answers under 120 words and do not use markdown headings.",
      `Wishlist: ${movieContext}`,
      `User question: ${message}`,
    ].join("\n\n");

    try {
      const response = await fetch(`${modelEndpoint}?key=${encodeURIComponent(env.gemini.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as GeminiResponse;
      const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!reply) throw new Error("Gemini returned an empty response");

      return { reply, provider: "gemini" };
    } catch (error) {
      console.warn("[Chat Notice]: Gemini unavailable, using local fallback.", error);
      return { reply: this.fallbackReply(message, wishlist.items.length), provider: "fallback" };
    }
  }

  private fallbackReply(message: string, wishlistCount: number): string {
    if (wishlistCount === 0) {
      return "Your wishlist is empty, so I am starting fresh. Save a few films and ask me what connects them.";
    }

    return `I found ${wishlistCount} film${wishlistCount === 1 ? "" : "s"} in your list. For “${message.trim()}”, try exploring the catalogue by genre and rating, then save the films that feel closest to that mood.`;
  }
}

export const chatService = new ChatService();
