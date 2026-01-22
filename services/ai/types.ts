import { Chunk } from '../../types';
import { Genre } from '../genreDetector';

export interface AIProvider {
    /**
     * The unique identifier for this provider (e.g., 'gemini', 'anthropic', 'openai')
     */
    id: string;

    /**
     * Cleans raw HTML content into structured data.
     * Useful for web scraping and article extraction.
     */
    cleanWebHtml(rawHtml: string): Promise<{
        title: string;
        author: string;
        content: string; // Markdown
    }>;

    /**
     * Breaks text into semantic reading chunks.
     * This is the core "smart" feature of FlowRead.
     */
    semanticChunking(
        textSegment: string,
        bookId: string,
        startIndex: number,
        previousContext?: string,
        bookTitle?: string,
        genre?: Genre
    ): Promise<Chunk[]>;
}
