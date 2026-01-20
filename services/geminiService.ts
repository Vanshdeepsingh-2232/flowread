import { GoogleGenAI, Type } from "@google/genai";
import { Chunk } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Genre } from './genreDetector';
import { getChunkingSystemInstruction } from './promptFactory';
import { logger } from '../utils/logger';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    logger.error('GeminiService', "API Key is missing. Please set process.env.API_KEY.");
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const cleanWebHtml = async (rawHtml: string): Promise<{ title: string; author: string; content: string }> => {
  logger.info('GeminiService', `Starting HTML cleaning via AI using gemini-2.0-flash-exp`);
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
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
    logger.error('GeminiService', 'AI Cleaning failed', error);
    throw error;
  }
};

export const semanticChunking = async (
  textSegment: string,
  bookId: string,
  startIndex: number = 0,
  previousChapterContext?: string,
  bookTitle?: string,
  genre: Genre = 'non_fiction'
): Promise<Chunk[]> => {
  logger.info('GeminiService', `Starting semantic chunking for "${bookTitle}"`, {
    segmentLength: textSegment.length,
    genre,
    startIndex
  });

  const ai = getAiClient();
  const textToProcess = textSegment;

  if (!textToProcess || textToProcess.trim().length === 0) {
    logger.warn('GeminiService', 'Empty text segment provided, skipping');
    return [];
  }

  try {
    const systemInstruction = getChunkingSystemInstruction(genre);
    logger.debug('GeminiService', 'System instruction generated', { genre });

    logger.time('gemini-chunking');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `CONTEXT: Book Title: "${bookTitle || 'Unknown'}".Continuing from previous batch.Last Chapter: "${previousChapterContext || 'None'}".\n\nFormat the following text into smart reading cards: \n\n${textToProcess} `,
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
    logger.timeEnd('GeminiService', 'gemini-chunking');

    const jsonText = response.text;
    if (!jsonText) {
      logger.error('GeminiService', 'No response text from AI');
      throw new Error("No response from AI");
    }

    const parsedData = JSON.parse(jsonText) as {
      text: string;
      chapterTitle: string;
      contextLabel: string;
      speaker?: string;
      isNewScene?: boolean;
      shareableQuote?: string;
    }[];

    logger.success('GeminiService', `Successfully generated ${parsedData.length} chunks via AI`);

    // Map to our Chunk interface
    return parsedData.map((item, idx) => {
      // Robust fallback for chapter titles
      let finalChapterTitle = item.chapterTitle;

      // If AI failed to find a title
      if (!finalChapterTitle || finalChapterTitle === "Unknown Chapter" || finalChapterTitle.trim() === "Chapter") {
        // If it's the very start of the book, default to "Chapter 1" or Book Title
        if (startIndex === 0 && idx < 5) {
          finalChapterTitle = "Chapter 1";
        }
        // Otherwise use previous context
        else {
          finalChapterTitle = previousChapterContext && previousChapterContext !== "Unknown Chapter"
            ? previousChapterContext
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
        estimatedTime: Math.ceil(item.text.split(' ').length / 3.5), // ~200 wpm
        tags: []
      };
    });

  } catch (error: any) {
    logger.error('GeminiService', 'Gemini processing error, falling back to basic chunking', error);
    return fallbackChunking(textToProcess, bookId, startIndex, previousChapterContext, bookTitle);
  }
};

// Simple fallback if API fails
const fallbackChunking = (text: string, bookId: string, startIndex: number, previousContext?: string, bookTitle?: string): Chunk[] => {
  const rawParagraphs = text.split(/\n\n+/);
  let currentChapter = previousContext || (startIndex === 0 ? "Chapter 1" : "Unknown Chapter");
  // ... rest of fallbackChunking logic ...

  const optimizedChunks: { text: string; chapter: string; context: string }[] = [];

  rawParagraphs.forEach((p) => {
    const trimmed = p.trim();
    if (trimmed.length === 0) return;

    // Header detect
    const headerMatch = trimmed.match(/^(Chapter\s+\d+|Part\s+\w+|Prologue|Epilogue|[A-Z\s]{4,20}$)/i);
    if (headerMatch && trimmed.length < 60) {
      currentChapter = trimmed;
    }

    if (trimmed.length > 300) {
      // Split logic (simplified for fallback)
      const sentences = trimmed.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) || [trimmed];
      let buffer = "";
      sentences.forEach((sentence) => {
        if ((buffer + sentence).length < 250) {
          buffer += sentence;
        } else {
          if (buffer) {
            optimizedChunks.push({
              text: buffer.trim(),
              chapter: currentChapter,
              context: "Book Content"
            });
          }
          buffer = sentence;
        }
      });
      if (buffer) {
        optimizedChunks.push({
          text: buffer.trim(),
          chapter: currentChapter,
          context: "Book Content"
        });
      }
    } else {
      optimizedChunks.push({
        text: trimmed,
        chapter: currentChapter,
        context: "Book Content"
      });
    }
  });

  return optimizedChunks.map((item, idx) => ({
    id: uuidv4(),
    bookId,
    index: startIndex + idx,
    text: item.text,
    chapterTitle: item.chapter,
    contextLabel: item.context,
    estimatedTime: Math.ceil(item.text.split(' ').length / 3.5),
    tags: ["fallback"]
  }));
};