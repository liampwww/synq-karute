import { GoogleGenerativeAI } from "@google/generative-ai";

let geminiInstance: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!geminiInstance) {
    geminiInstance = new GoogleGenerativeAI(
      process.env.GOOGLE_AI_API_KEY!
    );
  }
  return geminiInstance;
}
