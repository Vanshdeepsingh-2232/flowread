import { Chunk } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const fallbackChunking = (text: string, bookId: string, startIndex: number, previousContext?: string): Chunk[] => {
    const rawParagraphs = text.split(/\n\n+/);
    let currentChapter = previousContext || (startIndex === 0 ? "Chapter 1" : "Unknown Chapter");

    const optimizedChunks: { text: string; chapter: string; context: string }[] = [];

    rawParagraphs.forEach((p) => {
        const trimmed = p.trim();
        if (trimmed.length === 0) return;

        // Header detect
        const headerMatch = trimmed.match(/^(Chapter\s+\d+|Part\s+\w+|Prologue|Epilogue|[A-Z\s]{4,20}$)/i);
        if (headerMatch && trimmed.length < 60) {
            currentChapter = trimmed;
        }

        if (trimmed.length > 150) {
            // Split logic (simplified for fallback)
            const sentences = trimmed.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) || [trimmed];
            let buffer = "";
            sentences.forEach((sentence) => {
                if ((buffer + sentence).length < 120) {
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
