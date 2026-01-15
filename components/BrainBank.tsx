import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { AppState } from '../types';
import { ArrowLeft, BookOpen, Quote, Calendar } from 'lucide-react';

interface BrainBankProps {
    onBack: () => void;
    onNavigate: (bookId: string, index: number) => void;
}

const BrainBank: React.FC<BrainBankProps> = ({ onBack, onNavigate }) => {
    // Fetch bookmarks and enrich with Book/Chunk data
    const bookmarks = useLiveQuery(async () => {
        const items = await db.brainBank.reverse().sortBy('savedAt'); // Newest first

        // Enrich items
        const enriched = await Promise.all(items.map(async (item) => {
            const book = await db.books.get(item.bookId);
            const chunk = await db.chunks.get(item.chunkId);
            return {
                ...item,
                bookTitle: book?.title || "Unknown Book",
                chapterTitle: chunk?.chapterTitle || "Unknown Chapter",
                chunkIndex: chunk?.index || 0
            };
        }));

        return enriched;
    });

    if (!bookmarks) return <div className="p-8 text-center">Loading Brain Bank...</div>;

    return (
        <div className="min-h-screen bg-background text-text p-6 md:p-10 transition-colors duration-300">

            {/* Header */}
            <div className="max-w-7xl mx-auto flex items-center gap-4 mb-10">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-surface transition"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Brain Bank</h1>
                    <p className="text-muted text-sm mt-1">Your collection of {bookmarks.length} saved insights.</p>
                </div>
            </div>

            {/* Grid */}
            {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Quote size={48} className="mb-4" />
                    <h3 className="text-xl font-medium">No highlights yet</h3>
                    <p className="text-sm">Double tap any card while reading to save it here.</p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookmarks.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onNavigate(item.bookId, item.chunkIndex)}
                            className="
                group relative bg-surface border border-[var(--border-color)] 
                rounded-2xl p-6 cursor-pointer
                hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300
                flex flex-col gap-4 justify-between h-full
              "
                        >
                            {/* Content */}
                            <div className="relative z-10">
                                <Quote size={20} className="text-primary/40 mb-3" />
                                <p className="font-serif text-lg leading-relaxed line-clamp-6 text-text/90">
                                    {item.text}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-slate-700/10 flex items-center justify-between text-xs text-muted font-medium">
                                <div className="flex items-center gap-2 max-w-[70%]">
                                    <BookOpen size={14} className="min-w-[14px]" />
                                    <span className="truncate">{item.bookTitle}</span>
                                </div>
                                <div className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 truncate max-w-[40%]">
                                    {item.chapterTitle}
                                </div>
                            </div>

                            {/* Hover Effect Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BrainBank;
