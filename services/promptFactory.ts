import { Genre } from "./genreDetector";

/**
 * Returns the perfect system prompt for the specific genre.
 */
export function getChunkingSystemInstruction(genre: Genre = 'non_fiction'): string {

  // 1. Base Rules (Applies to everyone)
  const baseContext = `
    You are an expert editor for "FlowRead," an app that formats text into rich, comprehensive reading cards.
    Your Goal: Split the provided text into logical, substantive "chunks" or "cards".
    
    ** CRITICAL RULES:**
    1. ** PACING **: Optimize for 200-400 words per card. Aim for "Page-Like" density, not "Tweet-Like".
    2. ** DENSITY **: Combine 3-5 related paragraphs into a single card. Do NOT split short paragraphs.
    3. ** FLOW **: Each card must feel like a complete thought or scene. No jarring mid-sentence/mid-paragraph breaks.
    4. ** VERBATIM **: Exact text only.
    
    ** METADATA RULES (The Brain):**
    - ** chapterTitle **: The Top-Level Header. Persist across cards until it changes.
    - ** contextLabel **: A tiny specific context tag (e.g., "Scene: The Desert", "Topic: The Soul").
    - ** speaker **: IF dialogue, identify speaker.
    - ** isNewScene **: Set to true ONLY if distinct jump (time/location).
    - ** shareableQuote **: Extract profound/catchy sentence.
  `;

  // 2. Genre-Specific Rules
  const rules = {
    fiction: `
      ** STRICT RULES FOR FICTION:**
      - ** Scene Integrity:** Keep entire short-to-medium scenes in ONE card. Do not fragment the narrative.
      - ** Dialogue:** Keep long conversations together. Never split a back-and-forth exchange unless it spans pages.
      - ** Immersion:** The goal is to let the user read a significant portion of the story before swiping.
    `,

    non_fiction: `
      ** STRICT RULES FOR NON-FICTION:**
      - ** Concept Unity:** Group complete arguments or explanations into one card.
      - ** Depth:** If a concept takes 3 paragraphs to explain, keep them ALL in one chunk.
      - ** Context:** Avoid isolating single sentences; provide the full context.
    `,

    technical: `
      ** STRICT RULES FOR TECHNICAL TEXT:**
      - ** Completeness:** Keep code snippets, their explanation, and the result/output together in one card.
      - ** Steps:** Keep entire procedures (Step 1 to Step 5) in a single card if possible.
      - ** Definitions:** Never separate a term from its definition and usage.
    `
  };

  const selectedRule = rules[genre] || rules.non_fiction;

  return `${baseContext}\n\n${selectedRule}`;
}
