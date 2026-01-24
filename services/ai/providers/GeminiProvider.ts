import { GoogleGenAI, Type } from "@google/genai";
import { AIProvider } from "../types";
import { Chunk } from '../../../types';
import { Genre } from '../../genreDetector';
import { getChunkingSystemInstruction } from '../../promptFactory';
import { logger } from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class GeminiProvider implements AIProvider {
    id = 'gemini';
    private client: GoogleGenAI;

    constructor(apiKey: string) {
        if (!apiKey) {
            logger.error('GeminiProvider', "API Key is missing.");
            throw new Error("API Key is missing.");
        }
        this.client = new GoogleGenAI({ apiKey });
    }

    async cleanWebHtml(rawHtml: string): Promise<{ title: string; author: string; content: string }> {
        logger.info('GeminiProvider', `Starting HTML cleaning via AI using gemini-2.0-flash-exp`);

        try {
            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are an expert web scraper and content extractor.
        
        Task: Extract the main article content from the following raw HTML or text.
        
        Rules:
        1. IGNORE navigation menus, footers, sidebars, ads, and "read more" links.
        2. Extract the MAIN article title.
        3. Extract the Author name (if found, otherwise "Unknown").
        4. Extract the full article content in clean, valid Markdown.
        5. Preserve code blocks, headers, and lists.
        6. Remove any "Title:..." or metadata headers from the content body itself.
  
        Raw Input:
        ${rawHtml.slice(0, 100000)} 
        
        Output JSON Schema:
        {
          "title": "Article Title",
          "author": "Author Name",
          "content": "# Title \n\n Content..."
        }`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            content: { type: Type.STRING }
                        },
                        required: ["title", "content"]
                    }
                }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("No response from AI cleaner");

            return JSON.parse(jsonText);

        } catch (error) {
            logger.error('GeminiProvider', 'AI Cleaning failed', error);
            throw error;
        }
    }

    async semanticChunking(
        textSegment: string,
        bookId: string,
        startIndex: number,
        previousContext?: string,
        bookTitle?: string,
        genre: Genre = 'non_fiction'
    ): Promise<Chunk[]> {
        logger.info('GeminiProvider', `Starting semantic chunking for "${bookTitle}"`, {
            segmentLength: textSegment.length,
            genre,
            startIndex
        });

        if (!textSegment || textSegment.trim().length === 0) {
            logger.warn('GeminiProvider', 'Empty text segment provided, skipping');
            return [];
        }

        try {
            const systemInstruction = getChunkingSystemInstruction(genre);

            logger.time('gemini-chunking');
            // Using gemini-1.5-flash as it is stable and fast
            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `CONTEXT: Book Title: "${bookTitle || 'Unknown'}".Continuing from previous batch.Last Chapter: "${previousContext || 'None'}".\n\nFormat the following text into smart reading cards: \n\n${textSegment} `,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                chapterTitle: { type: Type.STRING, description: "Current Chapter Name" },
                                contextLabel: { type: Type.STRING, description: "Specific Scene/Topic Context" },
                                speaker: { type: Type.STRING, nullable: true },
                                isNewScene: { type: Type.BOOLEAN, nullable: true },
                                shareableQuote: { type: Type.STRING, nullable: true }
                            },
                            required: ["text", "chapterTitle", "contextLabel"]
                        }
                    }
                }
            });
            logger.timeEnd('GeminiProvider', 'gemini-chunking');

            const jsonText = response.text;
            if (!jsonText) throw new Error("No response from AI");

            const parsedData = JSON.parse(jsonText) as any[];

            logger.success('GeminiProvider', `Successfully generated ${parsedData.length} chunks via AI`);

            // Map to our Chunk interface
            return parsedData.map((item, idx) => {
                let finalChapterTitle = item.chapterTitle;

                if (!finalChapterTitle || finalChapterTitle === "Unknown Chapter" || finalChapterTitle.trim() === "Chapter") {
                    if (startIndex === 0 && idx < 5) {
                        finalChapterTitle = "Chapter 1";
                    } else {
                        finalChapterTitle = previousContext && previousContext !== "Unknown Chapter"
                            ? previousContext
                            : (item.chapterTitle || "Unknown Chapter");
                    }
                }

                return {
                    id: uuidv4(),
                    bookId,
                    index: startIndex + idx,
                    text: item.text,
                    chapterTitle: finalChapterTitle,
                    contextLabel: item.contextLabel,
                    speaker: item.speaker,
                    isNewScene: item.isNewScene || false,
                    shareableQuote: item.shareableQuote,
                    estimatedTime: Math.ceil(item.text.split(' ').length / 3.5),
                    tags: []
                };
            });

        } catch (error: any) {
            logger.error('GeminiProvider', `Gemini processing error: ${error.message}`, error);
            throw error;
        }
    }
}
