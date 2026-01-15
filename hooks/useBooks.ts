import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserLibrary } from '../services/firebaseService';
import { db } from '../db';
import { Book } from '../types';
import { logger } from '../utils/logger';

export function useBooks() {
    const { currentUser } = useAuth();

    // Effect: When user logs in, fetch their cloud books
    useEffect(() => {
        if (!currentUser) return;

        const syncLibrary = async () => {
            logger.info('useBooks', `🔄 Syncing library for user: ${currentUser.uid}`);

            try {
                const cloudBooks = await getUserLibrary(currentUser.uid);

                // Merge logic:
                // 1. Get all local books
                const localBooks = await db.books.toArray();
                const localBookIds = new Set(localBooks.map(b => b.id));

                let addedCount = 0;
                for (const cloudBookData of cloudBooks) {
                    const bookId = cloudBookData.bookId;

                    if (!localBookIds.has(bookId)) {
                        logger.info('useBooks', `Found cloud book not in local: "${cloudBookData.title}" (${bookId})`);

                        const placeholderBook: Book = {
                            id: bookId,
                            title: cloudBookData.title as string,
                            author: "Unknown",
                            fileType: 'txt',
                            dateAdded: Date.now(),
                            totalChunks: cloudBookData.totalChunks || 0,
                            lastReadIndex: cloudBookData.reading?.currentChunkIndex || 0,
                            processedCharCount: 0,
                            rawContent: "",
                            genre: (cloudBookData.genre as any) || 'non_fiction',
                        };

                        await db.books.put(placeholderBook);
                        addedCount++;
                    }
                }

                logger.success('useBooks', `Sync complete. Synced ${cloudBooks.length} books, added ${addedCount} new placeholders.`);

            } catch (err: any) {
                logger.error('useBooks', "Library sync failed", err);
            }
        };

        syncLibrary();
    }, [currentUser]);
}
