import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Book, Chunk, UserSettings, Theme } from '../types';
import Card from './Card';
import { ArrowLeft, Clock, Zap, Download, SkipForward, FastForward, ChevronDown } from 'lucide-react';

interface ReaderViewProps {
  book: Book;
  onBack: () => void;
  onLoadMore: () => Promise<void>;
  settings: UserSettings;
}

const ReaderView: React.FC<ReaderViewProps> = ({ book, onBack, onLoadMore, settings }) => {
  const chunks = useLiveQuery(() => db.chunks.where('bookId').equals(book.id).sortBy('index'));
  const bookmarks = useLiveQuery(() => db.brainBank.where('bookId').equals(book.id).toArray());

  const bookmarkedChunkIds = useMemo(() => {
    return new Set(bookmarks?.map(b => b.chunkId));
  }, [bookmarks]);

  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // State
  const [activeIndex, setActiveIndex] = useState(book.lastReadIndex || 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track the furthest point user has reached in this session
  const [furthestIndex, setFurthestIndex] = useState(book.lastReadIndex || 0);
  const prevChunkCountRef = useRef<number>(0);

  // Restore scroll position on mount
  useEffect(() => {
    if (chunks && chunks.length > 0 && containerRef.current) {
      if (containerRef.current.scrollTop === 0) {
        setTimeout(() => {
          scrollToIndex(book.lastReadIndex || 0, 'auto');
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks ? chunks.length : 0]);

  // Helper to scroll
  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current && index >= 0) {
      const wrapper = containerRef.current.firstElementChild;
      if (wrapper) {
        // +1 for top spacer
        const target = wrapper.children[index + 1] as HTMLElement;
        if (target) {
          target.scrollIntoView({ behavior, block: 'center', inline: 'center' });
          setActiveIndex(index);
        }
      }
    }
  };

  // Handle auto-scroll when new content is loaded
  useEffect(() => {
    if (chunks && chunks.length > 0) {
      const prevCount = prevChunkCountRef.current;
      if (prevCount > 0 && chunks.length > prevCount) {
        setTimeout(() => scrollToIndex(prevCount, 'smooth'), 100);
      }
      prevChunkCountRef.current = chunks.length;
    }
  }, [chunks]);

  // Handle Scroll to update active index
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const wrapper = container.firstElementChild;

    if (!wrapper) return;

    const children = Array.from(wrapper.children);
    let closestIndex = activeIndex;
    let minDistance = Infinity;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = isHorizontal
      ? containerRect.left + containerRect.width / 2
      : containerRect.top + containerRect.height / 2;

    for (let i = 0; i < children.length; i++) {
      // Skip spacers (assuming first and last children are spacers)
      if (i === 0 || i === children.length - 1) continue;

      const child = children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();

      const childCenter = isHorizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;

      const distance = Math.abs(childCenter - containerCenter);

      if (distance < minDistance) {
        minDistance = distance;
        const candidateChunkIndex = i - 1; // Adjust for start spacer
        if (candidateChunkIndex >= 0 && candidateChunkIndex < (chunks?.length || 0)) {
          closestIndex = candidateChunkIndex;
        }
      }
    }

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
      if (closestIndex > furthestIndex) {
        setFurthestIndex(closestIndex);
      }
      db.books.update(book.id, { lastReadIndex: closestIndex });

      // Haptic Feedback
      if (settings.hapticsEnabled && window.navigator.vibrate) {
        window.navigator.vibrate(5);
      }
    }
  };

  const handleFavorite = async (chunk: Chunk) => {
    if (bookmarkedChunkIds.has(chunk.id)) return;
    await db.brainBank.add({
      id: crypto.randomUUID(),
      chunkId: chunk.id,
      bookId: book.id,
      text: chunk.text,
      savedAt: Date.now()
    });
  };

  const onTriggerLoadMore = async () => {
    setIsLoadingMore(true);
    await onLoadMore();
    setIsLoadingMore(false);
  };

  // --- Scoped Segment Logic ---
  const { currentChapterSegments, chapterProgress } = useMemo(() => {
    if (!chunks || chunks.length === 0) return { currentChapterSegments: [], chapterProgress: 0 };

    const currentChunk = chunks[activeIndex];
    if (!currentChunk) return { currentChapterSegments: [], chapterProgress: 0 };

    const currentChapterTitle = currentChunk.chapterTitle || "Unknown Chapter";

    let start = activeIndex;
    while (start > 0 && chunks[start - 1].chapterTitle === currentChapterTitle) {
      start--;
    }
    let end = activeIndex;
    while (end < chunks.length - 1 && chunks[end + 1].chapterTitle === currentChapterTitle) {
      end++;
    }

    const chapterChunks = chunks.slice(start, end + 1);

    const segments: { id: string; label: string; count: number; start: number; end: number; time: number }[] = [];
    let currentSegment: { id: string; label: string; count: number; start: number; end: number; time: number } | null = null;

    chapterChunks.forEach((chunk, idx) => {
      const globalIndex = start + idx;
      const label = chunk.contextLabel || "Section " + (segments.length + 1);

      if (currentSegment && currentSegment.label === label) {
        currentSegment.count++;
        currentSegment.end = globalIndex;
        currentSegment.time += (chunk.estimatedTime || 1);
      } else {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = {
          id: `seg-${globalIndex}`,
          label,
          count: 1,
          start: globalIndex,
          end: globalIndex,
          time: (chunk.estimatedTime || 1)
        };
      }
    });
    if (currentSegment) segments.push(currentSegment);

    const relativeActive = activeIndex - start;
    const totalChapter = end - start + 1;
    const prog = Math.round((relativeActive / totalChapter) * 100);

    return { currentChapterSegments: segments, chapterProgress: prog };
  }, [chunks, activeIndex]);

  // --- Interaction Logic ---
  const [peekTooltip, setPeekTooltip] = useState<{ label: string, time: number, x: number } | null>(null);

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const element = document.elementFromPoint(clientX, clientY);
    const segmentId = element?.getAttribute('data-segment-id');

    if (segmentId) {
      const segment = currentChapterSegments.find(s => s.id === segmentId);
      if (segment) {
        setPeekTooltip({
          label: segment.label,
          time: Math.ceil(segment.time),
          x: clientX
        });
      }
    } else {
      setPeekTooltip(null);
    }
  };

  const handleTouchEnd = () => {
    setPeekTooltip(null);
  };

  // --- Navigation Logic ---
  const storyStartIndex = useMemo(() => {
    if (!chunks) return -1;
    return chunks.findIndex(c =>
      c.tags?.includes('story-start') ||
      /Chapter 1|One|Part 1|Prologue/i.test(c.chapterTitle || "")
    );
  }, [chunks]);

  const handleSkipToStory = () => {
    if (storyStartIndex > -1) scrollToIndex(storyStartIndex);
  };

  const handleNextChapter = () => {
    if (!chunks) return;
    const currentChap = chunks[activeIndex]?.chapterTitle;
    const nextChapIndex = chunks.findIndex((c, i) => i > activeIndex && c.chapterTitle !== currentChap);

    if (nextChapIndex !== -1) {
      scrollToIndex(nextChapIndex);
    } else {
      if (onLoadMore) onTriggerLoadMore();
    }
  };

  const handleResume = () => {
    scrollToIndex(furthestIndex);
  };

  if (!chunks) return <div className="h-screen flex items-center justify-center text-muted">Loading Book...</div>;

  const timeRemaining = Math.ceil((chunks.length - activeIndex) / 4);
  const hasMoreContent = (book.processedCharCount || 0) < (book.rawContent?.length || 0);

  const showSkipIntro = storyStartIndex > 0 && activeIndex < storyStartIndex;
  const showResume = activeIndex < furthestIndex - 2;
  const showNextChapter = true;

  // --- Theme Logic ---
  const getCapsuleStyles = () => {
    switch (settings.theme) {
      case 'daylight':
        // Daylight: Clean white, subtle gray border, soft shadow
        return 'bg-white/90 border border-slate-200/50 text-slate-800 shadow-xl shadow-slate-200/50';
      case 'paper':
        // Paper: Warm beige, wood accent border
        return 'bg-[#efe6d5]/95 border border-[#8b5e34]/10 text-[#5c3d22] shadow-xl shadow-[#8b5e34]/10';
      case 'midnight':
        // Midnight: Deep blue/black
        return 'bg-slate-900/90 border border-white/5 text-slate-100 shadow-2xl shadow-sky-500/20';
      case 'slate':
      default:
        // Slate: Dark gray
        return 'bg-slate-800/90 border border-slate-700/50 text-slate-200 shadow-2xl shadow-black/20';
    }
  };

  const getUnreadColor = () => {
    switch (settings.theme) {
      case 'daylight': return 'bg-slate-200';
      case 'paper': return 'bg-[#dcc8a9]';
      case 'midnight': return 'bg-slate-800';
      case 'slate': default: return 'bg-slate-700/50';
    }
  };

  const getActivePillStyle = () => {
    switch (settings.theme) {
      case 'daylight': return 'bg-slate-200 ring-1 ring-blue-500/30';
      case 'paper': return 'bg-[#dcc8a9] ring-1 ring-[#8b5e34]/30';
      case 'midnight': return 'bg-sky-900/50 ring-1 ring-sky-500/50';
      case 'slate': default: return 'bg-slate-600 ring-1 ring-white/20';
    }
  };

  // Dynamic Background for Tooltip to match theme perfectly
  const getTooltipStyles = () => {
    switch (settings.theme) {
      case 'daylight': return 'bg-white text-slate-900 border-slate-200 shadow-slate-200/50';
      case 'paper': return 'bg-[#efe6d5] text-[#5c3d22] border-[#8b5e34]/20 shadow-[#8b5e34]/10';
      case 'midnight': return 'bg-slate-900 text-white border-slate-700/50 shadow-sky-500/20';
      case 'slate': default: return 'bg-slate-800 text-white border-slate-600 shadow-black/20';
    }
  };

  const showProgressBar = settings.progressBarStyle !== 'hidden';
  const isMinimalProgress = settings.progressBarStyle === 'minimal';

  // Scroll Mode Logic
  const isHorizontal = settings.scrollMode === 'horizontal';

  // Handle Wheel Data for Horizontal Scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (isHorizontal && containerRef.current) {
      // Redirect vertical scroll to horizontal
      if (e.deltaY !== 0 && e.deltaX === 0) {
        containerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <div className={`
       relative h-screen bg-background flex flex-col transition-colors duration-500 
       font-${settings.fontFamily}
    `}>
      {/* Header / HUD */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">

        {/* Left: Back */}
        <button
          onClick={onBack}
          className="pointer-events-auto p-2 bg-surface/80 backdrop-blur rounded-full text-text shadow-lg hover:opacity-80 transition"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Right: Controls Stack */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Time Badge */}
          <div className="px-3 py-1 bg-surface backdrop-blur rounded-full cursor-default text-xs font-mono text-primary shadow-lg flex items-center gap-2 mb-2 border border-white/5">
            <Clock size={12} />
            <span>{timeRemaining} min left</span>
          </div>

          <div className="flex flex-col gap-2">
            {showResume && (
              <button
                onClick={handleResume}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:scale-105 transition animate-pulse"
              >
                <ChevronDown size={14} />
                Resume
              </button>
            )}

            {showSkipIntro && (
              <button
                onClick={handleSkipToStory}
                className="px-3 py-1.5 bg-primary text-slate-900 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:scale-105 transition"
              >
                <SkipForward size={14} />
                Start Story
              </button>
            )}

            {showNextChapter && (
              <button
                onClick={handleNextChapter}
                className="px-3 py-1.5 bg-surface backdrop-blur border border-white/10 text-text rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:bg-surface/80 transition"
              >
                <FastForward size={14} />
                Next Chapter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Capsule Segmented Progress Bar */}
      {showProgressBar && !isMinimalProgress && (
        <div className="absolute bottom-8 left-4 right-4 z-[60] flex justify-center pointer-events-none">
          <div
            ref={progressBarRef}
            className={`w-full max-w-2xl backdrop-blur-md rounded-2xl p-4 flex items-center gap-1.5 pointer-events-auto touch-none transition-all duration-500 ${getCapsuleStyles()}`}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={handleTouchMove}
            onMouseMove={handleTouchMove}
            onMouseLeave={handleTouchEnd}
          >
            {currentChapterSegments.map((seg) => {
              let status: 'read' | 'current' | 'unread' = 'unread';
              if (activeIndex > seg.end) status = 'read';
              else if (activeIndex >= seg.start) status = 'current';

              const isCurrent = status === 'current';
              const isRead = status === 'read';

              const innerProgress = isCurrent
                ? ((activeIndex - seg.start + 1) / (seg.end - seg.start + 1)) * 100
                : 0;

              return (
                <div
                  key={seg.id}
                  data-segment-id={seg.id}
                  className={`
                    h-3 rounded-full transition-all duration-300 relative overflow-hidden group
                    ${isRead ? 'bg-primary' : ''} 
                    ${status === 'unread' ? getUnreadColor() : ''}
                    ${isCurrent ? getActivePillStyle() : ''}
                  `}
                  style={{ flexGrow: seg.count, minWidth: '6px' }}
                >
                  {/* Precise Inner Cursor for Current Segment */}
                  {isCurrent && (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${innerProgress}%` }}
                    />
                  )}

                  {/* Hover/Touch Highlight Overlay */}
                  <div className="absolute inset-0 bg-white opacity-0 hover:opacity-20 transition-opacity" />
                </div>
              );
            })}
          </div>

          {/* Peek Tooltip (Global Portal Style) */}
          {peekTooltip && (
            <div
              className={`fixed bottom-24 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold whitespace-nowrap pointer-events-none z-[100] border animate-in fade-in slide-in-from-bottom-2 ${getTooltipStyles()}`}
              style={{ left: peekTooltip.x, transform: 'translateX(-50%)' }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-bold text-primary">{peekTooltip.label.length > 25 ? peekTooltip.label.substring(0, 25) + '...' : peekTooltip.label}</span>
                <span className="text-[10px] opacity-70 font-mono tracking-wide uppercase">{peekTooltip.time} min read</span>
              </div>

              {/* Arrow */}
              <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 border-b border-r rotate-45 ${settings.theme === 'daylight' ? 'bg-white border-slate-200' :
                settings.theme === 'paper' ? 'bg-[#efe6d5] border-[#8b5e34]/20' :
                  settings.theme === 'midnight' ? 'bg-slate-900 border-slate-700/50' :
                    'bg-slate-800 border-slate-600'
                }`} />
            </div>
          )}
        </div>
      )}

      {/* Minimal Progress Bar (Line) */}
      {isMinimalProgress && chunks && (
        <div className="fixed top-0 left-0 h-1 bg-primary z-[60]" style={{ width: `${(activeIndex / chunks.length) * 100}%` }} />
      )}

      {/* Main Scroll Container */}
      <div
        ref={containerRef}
        className={`
            flex-1 
            ${isHorizontal ? 'flex flex-row overflow-x-scroll snap-x overflow-y-hidden' : 'flex flex-col overflow-y-scroll snap-y overflow-x-hidden'}
            snap-mandatory scroll-smooth no-scrollbar
        `}
        onScroll={handleScroll}
        onWheel={isHorizontal ? handleWheel : undefined}
      >
        <div className={`
            ${isHorizontal ? 'h-full flex flex-row' : 'w-full flex flex-col'}
        `}>
          {/* Start Spacer */}
          <div className={`${isHorizontal ? 'w-[5vw] h-full shrink-0' : 'h-[5vh] w-full shrink-0'}`} />

          {chunks.map((chunk, idx) => (
            <div key={chunk.id} className={`${isHorizontal ? 'h-full w-screen shrink-0 flex items-center justify-center snap-center' : 'w-full'}`}>
              <Card
                chunk={chunk}
                isActive={idx === activeIndex}
                isBookmarked={bookmarkedChunkIds.has(chunk.id)}
                onFavorite={handleFavorite}
                bookTitle={book.title}
                settings={settings}
              />
            </div>
          ))}

          {/* End Spacer & Loader */}
          <div className={`${isHorizontal ? 'w-[20vw] h-full shrink-0 grid place-content-center' : 'h-[20vh] w-full shrink-0 py-10 flex justify-center'}`}>
            <div
              ref={loaderRef}
              className={`flex flex-col items-center gap-4 text-muted/50 p-6 rounded-2xl ${!hasMoreContent ? 'opacity-100' : ''}`}
              onClick={() => hasMoreContent && onLoadMore()}
            >
              {isLoadingMore ? (
                <>
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-primary font-medium">Synthesizing more cards...</p>
                </>
              ) : hasMoreContent ? (
                <>
                  <div className="bg-slate-800 p-4 rounded-full">
                    <Zap className="text-yellow-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-muted">Continue the Story</h3>
                  <p className="text-muted/70 text-sm max-w-[200px] text-center">
                    You've reached the end of the processed content.
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); onLoadMore(); }}
                    className="mt-2 px-6 py-3 bg-primary text-slate-900 font-bold rounded-full hover:bg-sky-300 transition flex items-center gap-2"
                  >
                    <Download size={18} />
                    Load Next Chapter
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-serif italic mb-2">The End</p>
                  <p className="text-sm opacity-50">You have completed this book.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReaderView;