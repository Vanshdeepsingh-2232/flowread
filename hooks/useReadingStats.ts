import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export interface ReadingStats {
    // Hero Stats
    streak: number;
    activeBooksCount: number;
    weeklyReadingTime: number; // in minutes

    // Library Progress
    booksWithProgress: Array<{
        id: string;
        title: string;
        progress: number; // percentage
        timeRemaining: number; // in minutes
        lastReadIndex: number;
        totalChunks: number;
    }>;

    // Insights
    totalBookmarks: number;
    brainBankCount: number;
    avgReadingPace: number; // minutes per chunk

    // All Time
    totalChunksRead: number;
    totalEstimatedHours: number;
    booksCompleted: number;
}

export function useReadingStats(): ReadingStats | undefined {
    return useLiveQuery(async () => {
        const books = await db.books.toArray();
        const chunks = await db.chunks.toArray();
        const brainBankItems = await db.brainBank.toArray();

        // Helper: Calculate Reading Streak
        const calculateStreak = (): number => {
            // For MVP, we'll use a simple localStorage-based approach
            // Track the last read date and increment streak
            const streakData = localStorage.getItem('flowread-streak');
            if (!streakData) return books.length > 0 ? 1 : 0;

            try {
                const { lastReadDate, count } = JSON.parse(streakData);
                const today = new Date().setHours(0, 0, 0, 0);
                const lastRead = new Date(lastReadDate).setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today - lastRead) / (1000 * 60 * 60 * 24));

                if (daysDiff === 0) return count; // Read today, same streak
                if (daysDiff === 1) return count; // Continuous
                return 1; // Streak broken, restart
            } catch {
                return 1;
            }
        };

        // Active Books: Books that aren't 100% complete
        const activeBooks = books.filter(book =>
            book.lastReadIndex < (book.totalChunks - 1) && book.totalChunks > 0
        );

        // Weekly Reading Time: Sum estimated time for chunks read in last 7 days
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const weeklyChunks = chunks.filter(chunk => {
            const book = books.find(b => b.id === chunk.bookId);
            return book && book.dateAdded >= weekAgo;
        });
        const weeklyTimeSeconds = weeklyChunks.reduce((sum, chunk) => sum + (chunk.estimatedTime || 0), 0);
        const weeklyTimeMinutes = Math.round(weeklyTimeSeconds / 60);

        // Books with Progress
        const booksWithProgress = books
            .filter(book => book.totalChunks > 0)
            .map(book => {
                const progress = Math.round(((book.lastReadIndex + 1) / book.totalChunks) * 100);
                const remainingChunks = book.totalChunks - (book.lastReadIndex + 1);

                // Calculate time remaining based on average chunk time for this book
                const bookChunks = chunks.filter(c => c.bookId === book.id);
                const avgChunkTime = bookChunks.length > 0
                    ? bookChunks.reduce((sum, c) => sum + (c.estimatedTime || 0), 0) / bookChunks.length
                    : 180; // Default 3 minutes

                const timeRemainingSeconds = remainingChunks * avgChunkTime;
                const timeRemainingMinutes = Math.round(timeRemainingSeconds / 60);

                return {
                    id: book.id,
                    title: book.title,
                    progress,
                    timeRemaining: timeRemainingMinutes,
                    lastReadIndex: book.lastReadIndex,
                    totalChunks: book.totalChunks
                };
            })
            .sort((a, b) => b.progress - a.progress); // Sort by progress desc

        // Total Bookmarks
        const totalBookmarks = chunks.filter(chunk => chunk.isBookmarked).length;

        // Brain Bank Count
        const brainBankCount = brainBankItems.length;

        // Average Reading Pace (minutes per chunk)
        const readChunks = chunks.filter(chunk => {
            const book = books.find(b => b.id === chunk.bookId);
            return book && chunk.index <= book.lastReadIndex;
        });
        const totalReadTime = readChunks.reduce((sum, chunk) => sum + (chunk.estimatedTime || 0), 0);
        const avgPaceSeconds = readChunks.length > 0 ? totalReadTime / readChunks.length : 180;
        const avgPaceMinutes = Math.round(avgPaceSeconds / 60);

        // Total Chunks Read
        const totalChunksRead = books.reduce((sum, book) => sum + (book.lastReadIndex + 1), 0);

        // Total Estimated Hours
        const totalEstimatedSeconds = books.reduce((sum, book) => {
            const bookChunks = chunks.filter(c => c.bookId === book.id && c.index <= book.lastReadIndex);
            return sum + bookChunks.reduce((s, c) => s + (c.estimatedTime || 0), 0);
        }, 0);
        const totalEstimatedHours = Math.round((totalEstimatedSeconds / 3600) * 10) / 10; // 1 decimal

        // Books Completed (100% progress)
        const booksCompleted = books.filter(book =>
            book.totalChunks > 0 && (book.lastReadIndex >= book.totalChunks - 1)
        ).length;

        return {
            streak: calculateStreak(),
            activeBooksCount: activeBooks.length,
            weeklyReadingTime: weeklyTimeMinutes,
            booksWithProgress,
            totalBookmarks,
            brainBankCount,
            avgReadingPace: avgPaceMinutes,
            totalChunksRead,
            totalEstimatedHours,
            booksCompleted
        };
    });
}

// Helper: Update streak when user reads
export function updateReadingStreak() {
    const today = new Date().setHours(0, 0, 0, 0);
    const streakData = localStorage.getItem('flowread-streak');

    if (!streakData) {
        localStorage.setItem('flowread-streak', JSON.stringify({ lastReadDate: today, count: 1 }));
        return;
    }

    try {
        const { lastReadDate, count } = JSON.parse(streakData);
        const lastRead = new Date(lastReadDate).setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - lastRead) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            // Already read today, no change
            return;
        } else if (daysDiff === 1) {
            // Read yesterday, increment streak
            localStorage.setItem('flowread-streak', JSON.stringify({ lastReadDate: today, count: count + 1 }));
        } else {
            // Streak broken, restart
            localStorage.setItem('flowread-streak', JSON.stringify({ lastReadDate: today, count: 1 }));
        }
    } catch {
        localStorage.setItem('flowread-streak', JSON.stringify({ lastReadDate: today, count: 1 }));
    }
}
