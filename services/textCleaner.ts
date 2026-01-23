/**
 * Text Cleaner Service
 * 
 * Handles intelligent text repair for PDF extraction artifacts.
 * Fixes joined words, broken spacing, and other PDF-specific issues.
 */

// Common English words for boundary detection (sorted by length, longest first for greedy matching)
const COMMON_WORDS = new Set([
    // Articles & prepositions
    'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'after', 'over', 'between', 'under', 'during',
    // Pronouns
    'he', 'she', 'it', 'they', 'we', 'i', 'you', 'his', 'her', 'its', 'their', 'our', 'my', 'your',
    // Common verbs
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'said', 'says', 'told', 'asked', 'went', 'came', 'saw', 'knew', 'thought', 'made', 'found', 'gave', 'took', 'looked', 'seemed', 'felt', 'left', 'turned',
    'arrived', 'decided', 'wanted', 'needed', 'began', 'started', 'entered', 'walked', 'stood', 'sat', 'lay', 'lived', 'died', 'loved', 'hated',
    // Common adjectives
    'old', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'good', 'bad', 'young', 'right', 'left', 'best', 'next', 'same', 'few', 'more', 'most',
    'small', 'large', 'entire', 'whole', 'enormous', 'abandoned', 'ancient', 'ruined',
    // Common nouns
    'man', 'men', 'woman', 'women', 'boy', 'girl', 'child', 'children', 'people', 'person', 'name', 'time', 'year', 'day', 'night', 'way', 'thing', 'place', 'world', 'life', 'hand', 'part', 'house', 'home', 'room', 'door', 'window',
    'church', 'roof', 'spot', 'tree', 'sycamore', 'sacristy', 'herd', 'sheep', 'flock', 'gate', 'planks', 'wolves', 'region', 'animal',
    // Story-specific common words
    'chapter', 'part', 'prologue', 'epilogue', 'book', 'one', 'two', 'three', 'four', 'five',
    'dusk', 'falling', 'fallen', 'once', 'upon', 'there', 'here', 'where', 'when', 'what', 'who', 'how', 'why',
    'that', 'this', 'then', 'than', 'some', 'only', 'just', 'also', 'very', 'even', 'still', 'already', 'always', 'never', 'ever', 'now', 'often',
    'and', 'but', 'or', 'if', 'so', 'yet', 'because', 'although', 'while', 'until', 'before', 'after', 'since', 'unless',
    'all', 'each', 'every', 'both', 'many', 'much', 'such', 'no', 'not', 'any',
    'about', 'like', 'out', 'up', 'down', 'back', 'away', 'off', 'well', 'just', 'too',
    // Possessives and contractions parts
    's', 't', 'd', 'll', 've', 're', 'm',
]);

// Longer words that appear in literature (helps with greedy matching)
const LONG_WORDS = [
    'sycamore', 'sacristy', 'abandoned', 'enormous', 'santiago', 'searching', 'wandering', 'spending', 'prevent', 'during', 'falling', 'through', 'arrived', 'decided', 'strayed', 'entire',
    'chapter', 'prologue', 'epilogue', 'between', 'because', 'although', 'children', 'thought', 'morning', 'evening', 'afternoon', 'night',
];

/**
 * Attempts to split joined ALL-CAPS words into proper words with spaces.
 * Uses a greedy longest-match algorithm with a word dictionary.
 * 
 * Example: "DUSKWASFALLINGAS" -> "DUSK WAS FALLING AS"
 */
function splitJoinedUppercaseWords(text: string): string {
    // Find sequences of uppercase letters (potential joined words)
    return text.replace(/\b[A-Z]{6,}\b/g, (match) => {
        // Don't split if it looks like an acronym (common short patterns)
        if (match.length <= 4) return match;

        const result = greedySplit(match.toLowerCase());
        if (result.includes(' ')) {
            // Preserve original case pattern - title case the result
            return result.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        }
        return match; // Return original if we couldn't split
    });
}

/**
 * Greedy word splitting algorithm.
 * Tries to find the longest matching word from the beginning, then recurses.
 */
function greedySplit(text: string): string {
    if (text.length === 0) return '';
    if (text.length <= 2) return text;

    const lowerText = text.toLowerCase();

    // Try longest words first (greedy)
    for (let len = Math.min(text.length, 12); len >= 1; len--) {
        const candidate = lowerText.slice(0, len);

        // Check if it's a known word
        if (COMMON_WORDS.has(candidate) || LONG_WORDS.includes(candidate)) {
            const remainder = text.slice(len);
            if (remainder.length === 0) {
                return candidate;
            }

            const restResult = greedySplit(remainder);
            // Only accept if the rest also splits well (has spaces or is a known word)
            if (restResult.includes(' ') || COMMON_WORDS.has(restResult.toLowerCase()) || LONG_WORDS.includes(restResult.toLowerCase()) || restResult.length <= 3) {
                return candidate + ' ' + restResult;
            }
        }
    }

    // If no match found, return as-is (might be a proper noun or unknown word)
    return text;
}

/**
 * Fixes broken words with spaces in the middle.
 * Example: "ru ined" -> "ruined", "S ANTIAGO" -> "SANTIAGO"
 */
function fixBrokenWords(text: string): string {
    return text
        // Fix single letter followed by space and rest of word: "S ANTIAGO" -> "SANTIAGO"
        .replace(/\b([A-Z])\s+([A-Z]{2,})\b/g, '$1$2')
        // Fix "ru ined" pattern - single space breaking a word
        .replace(/\b(\w{1,3})\s+(\w{2,})\b/g, (match, first, second) => {
            const combined = first + second;
            // Check if combined word makes sense
            if (COMMON_WORDS.has(combined.toLowerCase()) || LONG_WORDS.includes(combined.toLowerCase())) {
                return combined;
            }
            // Keep as-is if we can't confirm it's a broken word
            return match;
        });
}

/**
 * Handles possessive and contraction patterns that get broken in PDFs.
 * Example: "BOY 'S" -> "BOY'S", "DON 'T" -> "DON'T"
 */
function fixPossessivesAndContractions(text: string): string {
    return text
        // Fix broken possessives: "BOY 'S" -> "BOY'S"
        .replace(/(\w)\s+['']([SMDTV])\b/gi, "$1'$2")
        // Fix broken contractions: "DON ' T" -> "DON'T"
        .replace(/(\w)\s+[''](\s*)([A-Z])\b/gi, "$1'$3");
}

/**
 * Detects and preserves story structure elements.
 * Ensures chapter titles, prologues, etc. are properly formatted.
 */
function normalizeStructure(text: string): string {
    return text
        // Normalize chapter headings
        .replace(/\b(CHAPTER|PART|PROLOGUE|EPILOGUE)\s*(\d*|\w*)/gi, (match, type, num) => {
            const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            return num ? `${normalizedType} ${num}` : normalizedType;
        });
}

/**
 * Main text cleaning function.
 * Applies all cleaning transformations in the correct order.
 */
export function cleanExtractedText(text: string): string {
    let result = text;

    // 1. Fix possessives and contractions first (they have special patterns)
    result = fixPossessivesAndContractions(result);

    // 2. Split joined uppercase words
    result = splitJoinedUppercaseWords(result);

    // 3. Fix broken words (spaces in the middle)
    result = fixBrokenWords(result);

    // 4. Normalize structure elements
    result = normalizeStructure(result);

    // 5. Clean up multiple spaces
    result = result.replace(/[ \t]+/g, ' ');

    return result;
}

/**
 * Identifies front matter that should be skipped.
 * Returns true if the text appears to be front matter (not actual story content).
 */
export function isFrontMatter(text: string): boolean {
    const lowerText = text.toLowerCase().trim();

    const frontMatterPatterns = [
        /^copyright/i,
        /^all rights reserved/i,
        /^isbn/i,
        /^published by/i,
        /^first (published|edition|printing)/i,
        /^printed in/i,
        /^library of congress/i,
        /^dedication/i,
        /^to my/i, // Common dedication start
        /^for my/i,
        /^acknowledgments?/i,
        /^table of contents/i,
        /^contents$/i,
        /^about the author/i,
        /^translator'?s note/i,
        /^editor'?s note/i,
        /^introduction$/i,
        /^preface$/i,
        /^foreword$/i,
    ];

    return frontMatterPatterns.some(pattern => pattern.test(lowerText));
}

/**
 * Detects if text is the start of actual story content.
 */
export function isStoryStart(text: string): boolean {
    const lowerText = text.toLowerCase().trim();

    const storyStartPatterns = [
        /^(part\s+(one|1|i))/i,
        /^(chapter\s+(one|1|i))/i,
        /^prologue/i,
        /^book\s+(one|1|i)/i,
        // Common narrative openings
        /^(once upon a time|in the beginning|it was|there was|there were|he was|she was|they were|the boy|the girl|the man|the woman)/i,
    ];

    return storyStartPatterns.some(pattern => pattern.test(lowerText));
}
