import React, { useEffect, useState } from 'react';
import { ArrowLeft, Flame, BookOpen, Clock, Bookmark, Brain, TrendingUp, Sparkles } from 'lucide-react';
import { useReadingStats } from '../hooks/useReadingStats';

interface StatsProps {
    onBack: () => void;
}

const Stats: React.FC<StatsProps> = ({ onBack }) => {
    const stats = useReadingStats();
    const [countUpComplete, setCountUpComplete] = useState(false);

    useEffect(() => {
        // Trigger count-up animations on mount
        const timer = setTimeout(() => setCountUpComplete(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!stats) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-muted">Loading stats...</div>
            </div>
        );
    }

    // Helper component for count-up animation
    const AnimatedNumber: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
        const [displayValue, setDisplayValue] = useState(0);

        useEffect(() => {
            if (!countUpComplete) {
                setDisplayValue(0);
                return;
            }

            const duration = 1000; // 1 second
            const steps = 30;
            const increment = value / steps;
            let current = 0;
            let step = 0;

            const timer = setInterval(() => {
                step++;
                current = Math.min(current + increment, value);
                setDisplayValue(Math.round(current));

                if (step >= steps) {
                    clearInterval(timer);
                    setDisplayValue(value);
                }
            }, duration / steps);

            return () => clearInterval(timer);
        }, [value, countUpComplete]);

        return <span>{displayValue}{suffix}</span>;
    };

    // Format time helper
    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-text" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Reading Stats</h1>
                        <p className="text-xs text-muted">Track your progress and insights</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
                {/* Hero Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Streak Card */}
                    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                        <div className="flex items-start justify-between mb-4">
                            <Flame size={28} className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                            <Sparkles size={16} className="text-orange-400/50" />
                        </div>
                        <div className="text-4xl font-bold text-text mb-1">
                            <AnimatedNumber value={stats.streak} />
                        </div>
                        <div className="text-sm text-muted">Day Streak 🔥</div>
                    </div>

                    {/* Active Books Card */}
                    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                        <div className="flex items-start justify-between mb-4">
                            <BookOpen size={28} className="text-blue-500" />
                            <Sparkles size={16} className="text-blue-400/50" />
                        </div>
                        <div className="text-4xl font-bold text-text mb-1">
                            <AnimatedNumber value={stats.activeBooksCount} />
                        </div>
                        <div className="text-sm text-muted">Books Reading</div>
                    </div>

                    {/* Weekly Time Card */}
                    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                        <div className="flex items-start justify-between mb-4">
                            <Clock size={28} className="text-emerald-500" />
                            <Sparkles size={16} className="text-emerald-400/50" />
                        </div>
                        <div className="text-4xl font-bold text-text mb-1">
                            {formatTime(stats.weeklyReadingTime)}
                        </div>
                        <div className="text-sm text-muted">This Week</div>
                    </div>
                </div>

                {/* Library Progress */}
                {stats.booksWithProgress.length > 0 && (
                    <div className="bg-surface rounded-2xl border border-[var(--border-color)] p-6">
                        <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-primary" />
                            Library Progress
                        </h2>
                        <div className="space-y-4">
                            {stats.booksWithProgress.map(book => (
                                <div key={book.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-text truncate max-w-[60%]">{book.title}</span>
                                        <span className="text-muted">{book.progress}%</span>
                                    </div>
                                    <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${book.progress}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted">
                                        {book.timeRemaining > 0 ? `${formatTime(book.timeRemaining)} remaining` : 'Complete!'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Insights Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Bookmarks */}
                    <div className="bg-surface rounded-xl border border-[var(--border-color)] p-4 text-center">
                        <Bookmark size={24} className="text-pink-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-text">
                            <AnimatedNumber value={stats.totalBookmarks} />
                        </div>
                        <div className="text-xs text-muted mt-1">Bookmarks</div>
                    </div>

                    {/* Brain Bank */}
                    <div className="bg-surface rounded-xl border border-[var(--border-color)] p-4 text-center">
                        <Brain size={24} className="text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-text">
                            <AnimatedNumber value={stats.brainBankCount} />
                        </div>
                        <div className="text-xs text-muted mt-1">Insights</div>
                    </div>

                    {/* Reading Pace */}
                    <div className="bg-surface rounded-xl border border-[var(--border-color)] p-4 text-center">
                        <TrendingUp size={24} className="text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-text">
                            <AnimatedNumber value={stats.avgReadingPace} />m
                        </div>
                        <div className="text-xs text-muted mt-1">Avg Pace</div>
                    </div>

                    {/* Books Completed */}
                    <div className="bg-surface rounded-xl border border-[var(--border-color)] p-4 text-center">
                        <Sparkles size={24} className="text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-text">
                            <AnimatedNumber value={stats.booksCompleted} />
                        </div>
                        <div className="text-xs text-muted mt-1">Completed</div>
                    </div>
                </div>

                {/* All-Time Stats */}
                <div className="bg-surface rounded-2xl border border-[var(--border-color)] p-6">
                    <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                        <Sparkles size={20} className="text-primary" />
                        All-Time Stats
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-2xl font-bold text-text mb-1">
                                <AnimatedNumber value={stats.totalChunksRead} />
                            </div>
                            <div className="text-muted">Chunks Read</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text mb-1">
                                <AnimatedNumber value={stats.totalEstimatedHours} suffix="h" />
                            </div>
                            <div className="text-muted">Total Hours</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text mb-1">
                                <AnimatedNumber value={stats.booksCompleted} />
                            </div>
                            <div className="text-muted">Books Finished</div>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {stats.activeBooksCount === 0 && stats.booksCompleted === 0 && (
                    <div className="text-center py-12">
                        <BookOpen size={48} className="mx-auto text-muted mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-text mb-2">Start Your Reading Journey</h3>
                        <p className="text-sm text-muted">Upload a book to see your stats come to life!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stats;
