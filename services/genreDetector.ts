import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger";

const getAiClient = () => {
    // In Vite, use import.meta.env
    // We try specific GEMINI key first, then fall back to Firebase key (often same project)
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY ||
        import.meta.env.VITE_GEMINI_API_KEY ||
        import.meta.env.VITE_FIREBASE_API_KEY ||
        process.env.API_KEY;

    if (!apiKey) {
        logger.error('GenreDetector', "API Key is missing. Please set VITE_GOOGLE_API_KEY or VITE_FIREBASE_API_KEY.");
        throw new Error("API Key is missing.");
    }
    return new GoogleGenAI({ apiKey });
};

export type Genre = 'fiction' | 'non_fiction' | 'technical' | 'script';

export async function detectGenre(fullText: string): Promise<Genre> {
    try {
        const ai = getAiClient();
        logger.info('GenreDetector', 'Detecting genre... (Model: gemini-1.5-flash)');

        // 1. Take a sample (First 1500 chars)
        const sample = fullText.substring(0, 1500);

        // 2. The Classifier Prompt
        const prompt = `
      Analyze the following text sample and classify it into exactly ONE of these categories:
      - "fiction" (Novels, stories, dialogue-heavy)
      - "non_fiction" (Self-help, history, biography, essays, general articles)
      - "technical" (Textbooks, manuals, code documentation, scientific papers)
      - "script" (Screenplays, stage plays, movie scripts - Look for "INT./EXT.", capitalized character names centered above dialogue)

      Text Sample:
      "${sample}..."

      Rules:
      - Return ONLY the category name (lowercase).
      - Do not add punctuation or explanation.
    `;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const text = result.text?.trim().toLowerCase() || 'non_fiction';

        // 3. Validation (Sanity check)
        if (text === 'fiction' || text === 'non_fiction' || text === 'technical' || text === 'script') {
            return text as Genre;
        }
        return 'non_fiction'; // Default fallback

    } catch (error: any) {
        // Specifically detect network/fetch errors
        const isNetworkError =
            error.message?.includes('fetch') ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('not connected') ||
            !navigator.onLine;

        if (isNetworkError) {
            logger.error('GenreDetector', "Genre detection failed due to network issue", error);
            throw new Error("NETWORK_DISCONNECTED");
        }

        logger.error('GenreDetector', "Genre detection failed, falling back to non_fiction", error);
        return 'non_fiction'; // Fail safe for AI glitches, but not for network
    }
}
