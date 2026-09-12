export interface ChatResponse {
  reply: string;
  provider: "gemini" | "fallback";
}
