/**
 * Finds a safe index to slice text, prioritizing paragraph breaks, then sentence endings.
 * This prevents cutting text in the middle of a sentence which confuses AI processing.
 * 
 * @param text The full text content
 * @param targetLimit The theoretical maximum characters we want (e.g., 20000)
 * @param minChunkSize Minimum acceptable chunk size to avoid tiny slivers (e.g., 5000)
 * @returns The strict index where the slice should end.
 */
export const findSafeBatchEnd = (
    text: string,
    targetLimit: number,
    minChunkSize: number = 5000
): number => {
    // If text is shorter than limit, just take it all
    if (text.length <= targetLimit) return text.length;

    // The "Search Window" is the range where we look for a break.
    // effectiveLimit is strictly the max char index we can go to.
    const effectiveLimit = Math.min(text.length, targetLimit);

    // We only look back a certain amount (e.g., 10% or 2000 chars) to find a break
    // We don't want to sacrifice too much batch size.
    const lookbackWindow = Math.min(2000, effectiveLimit - minChunkSize);
    const searchStart = effectiveLimit - lookbackWindow;

    // Slice the window for analysis
    const searchArea = text.slice(searchStart, effectiveLimit);

    // Priority 1: Paragraph Break (\n\n)
    const lastParagraphBreak = searchArea.lastIndexOf('\n\n');
    if (lastParagraphBreak !== -1) {
        return searchStart + lastParagraphBreak + 2; // +2 to include the newlines (clean break)
    }

    // Priority 2: Single Newline (\n) - typical for some formats
    const lastNewline = searchArea.lastIndexOf('\n');
    if (lastNewline !== -1) {
        return searchStart + lastNewline + 1;
    }

    // Priority 3: Sentence End (.!?) followed by space
    // We reverse the string to find the *last* occurrence efficiently or just use lastIndexOf with regex manually?
    // JS doesn't support lastIndexOf with regex directly.
    // We iterate backwards.
    for (let i = searchArea.length - 1; i >= 0; i--) {
        const char = searchArea[i];
        if (['.', '!', '?'].includes(char)) {
            // Check if it's followed by space or quote to likely be a sentence end
            // But we are at the end of our slice, so we check relative to original string if needed,
            // or just assume standard punctuation is safe enough.
            return searchStart + i + 1;
        }
    }

    // Fallback: Hard slice if no punctuation found (rare for book text)
    return effectiveLimit;
};
