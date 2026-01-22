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

  // Dynamic Font Family
  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case 'serif': return 'font-serif';
      case 'dyslexic': return 'font-mono tracking-widest'; // Temporary fallback
      case 'sans': default: return 'font-sans';
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

  // Smart Title Logic
  const displayTitle = useMemo(() => {
    const label = chunk.contextLabel;
    const isGeneric = !label || /Book Content|Text Content|Section/i.test(label);

    if (!isGeneric && label.length > 2) {
      return label;
    }

    return bookTitle || "FlowRead";
  }, [chunk, bookTitle]);

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

            {/* Title / Context Pill */}
            <div className="
                px-3 py-1 rounded-full
                bg-surface border border-[var(--border-color)]
                text-[10px] font-serif italic text-muted font-medium
                shadow-sm flex items-center gap-1
                ">
              {displayTitle}
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="flex-grow flex flex-col justify-center w-full z-10 bg-surface/0 rounded-3xl mt-2">

          {chunk.speaker && settings.showContextTags && (
            <div className="self-start mb-4 px-3 py-1 rounded-full bg-surface border border-slate-700/20 text-[9px] font-bold uppercase text-primary/80 tracking-widest shadow-sm">
              {chunk.speaker}
            </div>
          )}

          <div className={`${getFontFamily()} ${getTextStyles()} ${settings.isBold ? 'font-bold' : 'font-light'} text-text text-left tracking-wide ${settings.debugMode ? 'select-text' : 'select-none'} transition-all duration-300 prose prose-slate dark:prose-invert max-w-none`}>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                strong: ({ node, ...props }) => <span className="font-bold text-primary opacity-90" {...props} />,
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