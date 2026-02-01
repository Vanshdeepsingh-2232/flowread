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
        genre: Genre = 'non_fiction',
        globalCharOffset: number = 0
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

            let localCursor = 0;

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

                // Calculate Chars Indices
                // We attempt to find the chunk text in the source segment to map it.
                // We search starting from 'localCursor' to keep order.
                const snippet = item.text.slice(0, 20); // Search first 20 chars
                const foundIndex = textSegment.indexOf(snippet, localCursor);

                let startPixel = -1;
                let endPixel = -1;

                if (foundIndex !== -1) {
                    startPixel = globalCharOffset + foundIndex;
                    // Approximate end
                    endPixel = startPixel + item.text.length;
                    localCursor = foundIndex + Math.min(item.text.length, 10); // Move cursor fwd but allow slight overlap if needed
                } else {
                    // Fallback: If not found (maybe AI fixed typo), continue from last cursor
                    startPixel = globalCharOffset + localCursor;
                    endPixel = startPixel + item.text.length;
                    localCursor += item.text.length;
                }

                return {
                    id: uuidv4(),
                    bookId,
                    index: startIndex + idx,
                    text: item.text,
                    startCharIndex: startPixel,
                    endCharIndex: endPixel,
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

    async extractTableOfContents(fullText: string): Promise<Array<{ title: string; startCharIndex: number }>> {
        logger.info('GeminiProvider', 'Extracting Table of Contents...');

        // Scan first 15k chars for specific TOC structure, or whole file if small
        const scanDepth = Math.min(fullText.length, 15000);
        const scanText = fullText.slice(0, scanDepth);

        try {
            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `
                Analyze the following text sample (start of a book) and extract the Table of Contents.
                Identify "Chapter N", "Part N", "Prologue", "Epilogue", etc.
                
                For each entry, return:
                - "title": The full chapter name (e.g. "Chapter 1: The Boy")
                - "snippet": A unique 10-15 word phrase that strictly appears at the VERY START of this chapter's actual content.
                
                Input Text:
                ${scanText}
                `,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                snippet: { type: Type.STRING }
                            },
                            required: ["title", "snippet"]
                        }
                    }
                }
            });

            const jsonText = response.text;
            if (!jsonText) return [];

            const tocData = JSON.parse(jsonText) as Array<{ title: string, snippet: string }>;

            // Map snippets to actual indices in the FULL text
            const mappedTOC = tocData.map(item => {
                // Find the snippet in the text. We search the whole text but realistically it should be in the beginning
                // However, some books have TOC in the front matter, we want the ACTUAL content location.
                // The prompt asked for snippet at the start of CONTENT, so we hope AI respects that.
                // We search from index 0 for now.
                const index = fullText.indexOf(item.snippet);
                return {
                    title: item.title,
                    startCharIndex: index
                };
            }).filter(item => item.startCharIndex !== -1).sort((a, b) => a.startCharIndex - b.startCharIndex);

            logger.info('GeminiProvider', `Found ${mappedTOC.length} chapters.`);
            return mappedTOC;

        } catch (error) {
            logger.warn('GeminiProvider', 'TOC Extraction failed', error);
            return []; // Fail gracefully
        }
    }
}
