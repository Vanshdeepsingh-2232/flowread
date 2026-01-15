import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger";

const getAiClient = () => {
    if (!process.env.API_KEY) {
        logger.error('GenreDetector', "API Key is missing. Please set process.env.API_KEY.");
        throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export type Genre = 'fiction' | 'non_fiction' | 'technical';

export async function detectGenre(fullText: string): Promise<Genre> {
    try {
        const ai = getAiClient();
        logger.info('GenreDetector', 'Detecting genre for new book...');

        // 1. Take a sample (First 1500 chars)
        const sample = fullText.substring(0, 1500);

        // 2. The Classifier Prompt
        const prompt = `
      Analyze the following text sample and classify it into exactly ONE of these categories:
      - "fiction" (Novels, stories, dialogue-heavy)
      - "non_fiction" (Self-help, history, biography, essays, general articles)
      - "technical" (Textbooks, manuals, code documentation, scientific papers)

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
        if (text === 'fiction' || text === 'non_fiction' || text === 'technical') {
            return text as Genre;
        }
        return 'non_fiction'; // Default fallback

    } catch (error) {
        logger.error('GenreDetector', "Genre detection failed, falling back to non_fiction", error);
        return 'non_fiction'; // Fail safe
    }
}
