import { GeminiProvider } from './providers/GeminiProvider';
import { AIProvider } from './types';
import { fallbackChunking } from './fallback';
import { Chunk } from '../../types';
import { Genre } from '../genreDetector';
import { logger } from '../../utils/logger';

// Configuration (could be moved to types or config file)
const getProvider = (): AIProvider => {
    // 1. Read provider config (e.g., from .env)
    // Options: 'gemini', 'claude', 'openai'
    const providerType = process.env.AI_PROVIDER || 'gemini';

    // 2. Instantiate based on type
    if (providerType === 'gemini') {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("Missing API config for Gemini");
        return new GeminiProvider(apiKey);
    }

    // Example for future providers:
    /*
    if (providerType === 'claude') {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        return new ClaudeProvider(apiKey);
    }
    */

    throw new Error(`Unknown AI Provider: ${providerType}`);
};

// Singleton instance
const provider = getProvider();

export const cleanWebHtml = async (rawHtml: string) => {
    return provider.cleanWebHtml(rawHtml);
};

export const semanticChunking = async (
    textSegment: string,
    bookId: string,
    startIndex: number = 0,
    previousChapterContext?: string,
    bookTitle?: string,
    genre: Genre = 'non_fiction'
): Promise<Chunk[]> => {
    try {
        return await provider.semanticChunking(textSegment, bookId, startIndex, previousChapterContext, bookTitle, genre);
    } catch (error) {
        logger.warn('AIService', 'Primary provider failed, using fallback chunking', error);
        return fallbackChunking(textSegment, bookId, startIndex, previousChapterContext);
    }
};
