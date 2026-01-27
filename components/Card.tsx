import React, { useRef, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Chunk, UserSettings } from '../types';
import { Heart, Clock, Share2, Check } from 'lucide-react';

interface CardProps {
  chunk: Chunk;
  onFavorite: (chunk: Chunk) => void;
  isActive: boolean;
  isBookmarked?: boolean;
  bookTitle?: string;
  settings: UserSettings;
}

const Card: React.FC<CardProps> = ({ chunk, onFavorite, isActive, isBookmarked, bookTitle, settings }) => {
  const lastTapRef = useRef<number>(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      onFavorite(chunk);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }

    lastTapRef.current = now;
  }, [chunk, onFavorite]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToShare = chunk.shareableQuote || chunk.text;
    navigator.clipboard.writeText(`"${textToShare}" - ${chunk.chapterTitle} (FlowRead)`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic Text Styles based on slider (1-5)
  const getTextStyles = () => {
    switch (settings.textSize) {
      case 1: return 'text-base leading-relaxed'; // Smallest
      case 2: return 'text-lg leading-relaxed';   // Small
      case 3: return 'text-[1.2rem] leading-[1.75]'; // Default
      case 4: return 'text-xl leading-[1.8]';     // Large
      case 5: return 'text-2xl leading-[1.9]';    // Largest
      default: return 'text-[1.2rem] leading-[1.75]';
    }
  };

  // Dynamic Layout Styles based on Density
  const getLayoutStyles = () => {
    switch (settings.density) {
      case 'focus': return 'max-w-xl py-14 px-10'; // Narrower, more breathing room
      case 'dense': return 'max-w-3xl py-6 px-5'; // Wider, tighter
      case 'standard': default: return 'max-w-2xl px-6 md:px-8 py-10';
    }
  };

  // Robust Chapter Title Logic
  const displayChapter = useMemo(() => {
    if (chunk.chapterTitle) return chunk.chapterTitle;

    // Legacy fallback: extract from 'context' if it exists in the raw object
    const legacyContext = (chunk as any).context || "";
    const match = legacyContext.match(/Chapter\s+\d+|Part\s+\d+|Prologue|Epilogue/i);
    if (match) return match[0];

    return "Chapter";
  }, [chunk]);

  // Smart Context Label Logic - More Intelligent!
  const displayContext = useMemo(() => {
    const label = chunk.contextLabel;
    const text = chunk.text || '';
    const lowerText = text.toLowerCase();

    // Skip generic/useless labels
    const genericPatterns = [
      /^Book Content$/i,
      /^Text Content$/i,
      /^Section$/i,
      /^Content$/i,
      /^Unknown$/i,
      /^Narrative$/i,
      /^\s*$/
    ];

    const isGeneric = !label || genericPatterns.some(p => p.test(label));

    // If we have a good label from AI, clean and use it
    if (!isGeneric && label.length > 2 && label.length < 40) {
      const cleaned = label.replace(/^(Scene:|Topic:|Context:)\s*/i, '').trim();
      return cleaned;
    }

    // === SMART EXTRACTION FROM TEXT ===

    // 1. Speaker - Show who's talking
    if (chunk.speaker) {
      return chunk.speaker;
    }

    // 2. Character detection - Find who's acting
    const characterMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|asked|replied|thought|looked|smiled|nodded|whispered|shouted)/);
    if (characterMatch) {
      return characterMatch[1];
    }

    // 3. Location/Setting
    const locationPatterns = [
      /(?:in|at|near|inside|outside|entered|arrived at|reached)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)/,
      /\b(?:the\s+)(church|castle|palace|forest|desert|mountain|village|city|town|market|shop|room|house|garden|oasis)/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const loc = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        return `The ${loc}`;
      }
    }

    // 4. Time of day
    const timePatterns = [
      { pattern: /\b(dawn|sunrise)\b/i, label: 'Dawn' },
      { pattern: /\bmorning\b/i, label: 'Morning' },
      { pattern: /\b(noon|midday)\b/i, label: 'Midday' },
      { pattern: /\bafternoon\b/i, label: 'Afternoon' },
      { pattern: /\b(dusk|sunset|evening)\b/i, label: 'Evening' },
      { pattern: /\b(night|midnight)\b/i, label: 'Night' },
    ];

    for (const { pattern, label } of timePatterns) {
      if (pattern.test(lowerText)) return label;
    }

    // 5. Narrative mood/scene type
    const moodPatterns = [
      { pattern: /\b(dream|dreamed|dreaming|slept|woke|awoke)\b/i, label: 'Dream' },
      { pattern: /\b(remember|remembered|memory|recalled)\b/i, label: 'Memory' },
      { pattern: /\b(journey|traveled|travelled|wandered)\b/i, label: 'Journey' },
      { pattern: /\b(battle|fight|fought|sword|attack)\b/i, label: 'Conflict' },
      { pattern: /\b(learn|taught|lesson|wisdom)\b/i, label: 'Lesson' },
      { pattern: /\b(love|heart|kiss|embrace)\b/i, label: 'Romance' },
      { pattern: /\b(fear|afraid|terror|danger)\b/i, label: 'Tension' },
      { pattern: /\b(decision|choose|chose|decided)\b/i, label: 'Decision' },
      { pattern: /\b(secret|hidden|reveal|discover)\b/i, label: 'Discovery' },
      { pattern: /\b(pray|prayed|god|divine)\b/i, label: 'Spiritual' },
    ];

    for (const { pattern, label } of moodPatterns) {
      if (pattern.test(lowerText)) return label;
    }

    // 6. Heavy dialogue
    const quoteCount = (text.match(/["'"']/g) || []).length;
    if (quoteCount >= 4) return 'Conversation';

    // 7. New scene
    if (chunk.isNewScene) return 'New Scene';

    // 8. Extract from chapter title
    if (chunk.chapterTitle && !/^Chapter\s*\d*$/i.test(chunk.chapterTitle)) {
      const chapterClean = chunk.chapterTitle.replace(/^(Chapter|Part)\s*\d*[:\s]*/i, '').trim();
      if (chapterClean.length > 2 && chapterClean.length < 25) return chapterClean;
    }

    // 9. Fallback
    return 'Story';
  }, [chunk, bookTitle]);


  // Dynamic Font Family
  const getFontFamily = () => {
    // If it's a script, force specialized script look, overriding user setting if needed, or allowing courier.
    if (chunk.genre === 'script') return 'font-mono whitespace-pre-wrap text-[0.9em]';

    switch (settings.fontFamily) {
      case 'serif': return 'font-serif';
      case 'dyslexic': return 'font-mono tracking-widest'; // Temporary fallback
      case 'sans': default: return 'font-sans';
    }
  };

  const isScript = chunk.genre === 'script';

  return (
    <div
      className={`
        min-h-[85vh] w-full flex items-center justify-center p-4 snap-center relative py-8
        ${chunk.isNewScene ? 'pt-16' : ''}
      `}
      onClick={handleTap}
    >
      <div className={`
        relative w-full 
        bg-surface/70 backdrop-blur-md 
        border border-[var(--border-color)]
        rounded-[2rem] shadow-2xl overflow-visible 
        transition-all duration-500 ease-out flex flex-col items-center
        ${getLayoutStyles()}
        ${isActive ? 'opacity-100 scale-100 ring-1 ring-white/10' : 'opacity-40 scale-90'}
      `}>

        {/* Pills (Touching Top Border) */}
        {settings.showContextTags && (
          <div className="absolute -top-3 left-6 z-20 flex items-center gap-2">
            {/* Chapter Pill */}
            <div className="
                px-3 py-1 rounded-full
                bg-primary text-white
                text-[10px] font-black uppercase tracking-widest
                shadow-md border border-white/10
                ">
              {displayChapter}
            </div>

            {/* Context Pill - Smart Labels */}
            <div className="
                px-3 py-1 rounded-full
                bg-surface border border-[var(--border-color)]
                text-[10px] font-sans text-muted font-medium
                shadow-sm flex items-center gap-1
                ">
              {displayContext}
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="flex-grow flex flex-col justify-center w-full z-10 bg-surface/0 rounded-3xl mt-2">

          <div className={`${getFontFamily()} ${getTextStyles()} ${settings.isBold ? 'font-bold' : 'font-light'} text-text text-left tracking-wide ${settings.debugMode ? 'select-text' : 'select-none'} transition-all duration-300 prose prose-slate dark:prose-invert max-w-none ${isScript ? 'prose-script' : ''}`}>
            {(() => {
              const isScriptContent = isScript || /^[A-Z]{2,}(\s+[A-Z]{2,})*(?:\s+\([A-Z.']+\))?(\s|$)/.test(chunk.text) || /\n[A-Z]{2,}(\s+[A-Z]{2,})*(?:\s+\([A-Z.']+\))?(\s|$)/.test(chunk.text) || chunk.text.includes('**');

              if (isScriptContent) {
                // 1. Normalize Names: Strip existing ** then re-apply consistently.
                // This handles both raw input like "MIKE ..." and AI input like "**MIKE** ..."
                let formattedText = chunk.text
                  .replace(/\*\*([A-Z]{2,}(?:\s+[A-Z]{2,})*(?:\s+\([A-Z.']+\))?)\*\*/g, '$1') // Clean existing
                  .replace(/(^|[\n.!?"]\s+)(?!(?:INT|EXT|EST|DAY|NIGHT|HOUSE|ROOM|LIVING|KITCHEN|BEDROOM)\b)([A-Z]{2,}(?:\s+[A-Z]{2,})*(?:\s+\([A-Z.']+\))?)(?=[:\s]|$)/g, '$1\n**$2**'); // Re-apply safely

                return (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="mb-0.5 last:mb-0 whitespace-pre-wrap" {...props} />,
                      strong: ({ node, ...props }) => {
                        const content = String(props.children || '').trim();

                        // Refined Name Detection: Must be all caps, but NOT common scene words or contains structural dashes
                        const sceneKeywords = /\b(INT|EXT|EST|DAY|NIGHT|HOUSE|ROOM|LIVING|KITCHEN|BEDROOM|EXTERIOR|INTERIOR|FLOOR|HALLWAY|STREET|ROAD|AVE|AVENUE|PARK|OFFICE|HOSPITAL|SCHOOL|CAR|TRUCK|VAN|FOREST|WOODS)\b/i;
                        const isName = /^[A-Z]{2,}(\s+[A-Z]{2,})*(?:\s+\([A-Z.']+\))?[.:\-]*$/.test(content) &&
                          !sceneKeywords.test(content) &&
                          !content.includes(' - ') &&
                          content.length < 30; // Real names are rarely huge

                        return isName ? (
                          <span className="
                            block mt-0 mb-0.5
                            text-primary font-black uppercase tracking-[0.1em] text-[0.85em]
                            border-l-4 border-primary pl-4 py-1
                            bg-primary/5 rounded-r-md w-fit pr-8
                          " {...props} />
                        ) : (
                          <span className="font-bold text-primary" {...props} />
                        );
                      },
                      em: ({ node, ...props }) => <span className="italic opacity-80" {...props} />,
                    }}
                  >
                    {formattedText}
                  </ReactMarkdown>
                );
              }

              return (
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                    strong: ({ node, ...props }) => <span className="font-bold text-primary" {...props} />,
                    em: ({ node, ...props }) => <span className="italic opacity-80" {...props} />,
                    h1: ({ node, ...props }) => <h3 className="text-xl font-bold mb-2 mt-4" {...props} />,
                    h2: ({ node, ...props }) => <h4 className="text-lg font-bold mb-2 mt-3" {...props} />,
                    h3: ({ node, ...props }) => <h5 className="text-base font-bold mb-1 mt-2" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-4 list-disc" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 opacity-80" {...props} />,
                    code: ({ node, ...props }) => <code className="bg-slate-800/20 rounded px-1 py-0.5 text-[0.8em] font-mono" {...props} />
                  }}
                >
                  {chunk.text}
                </ReactMarkdown>
              );
            })()}
          </div>
        </div>

        {/* Footer: State & Time & Actions */}
        <div className={`
            w-[calc(100%+3rem)] -ml-6 -mr-6 md:-ml-8 md:-mr-8 
            h-14 mt-8 border-t border-slate-700/10 flex justify-between items-center px-6 
            bg-surface/30 rounded-b-[2rem] -mb-10
         `}>
          <span className="text-[10px] font-mono font-medium text-muted/50">
            {chunk.index + 1}
          </span>

          <div className="flex items-center gap-4">
            {/* Time Estimate */}
            {chunk.estimatedTime && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-muted">
                <Clock size={11} className="opacity-70" />
                {chunk.estimatedTime}s
              </span>
            )}

            {/* Divider */}
            <div className="h-3 w-[1px] bg-slate-700/20" />

            {/* Bookmark Heart */}
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(chunk); }}
              className="group p-2 rounded-full hover:bg-white/10 transition-colors pointer-events-auto"
              title="Bookmark"
            >
              <Heart
                size={16}
                className={`transition-colors duration-300 ${isBookmarked ? 'fill-pink-500 text-pink-500' : 'text-slate-400 group-hover:text-pink-400'}`}
              />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-primary relative pointer-events-auto"
              title="Share Quote"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
            </button>
          </div>
        </div>

        {/* Double tap heart animation overlay */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <Heart className="w-24 h-24 text-pink-500 fill-pink-500 animate-ping drop-shadow-2xl" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;