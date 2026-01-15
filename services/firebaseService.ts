import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { Book } from "../types";
import { logger } from "../utils/logger";

// ==========================================
// 📚 BOOK MANAGEMENT
// ==========================================

/**
 * Uploads a processed book to the cloud.
 * 1. Saves full JSON content to Firebase Storage
 * 2. Saves lightweight metadata to Firestore
 */
export const uploadBookToCloud = async (userId: string, bookData: any) => { // Using any for now to match Book/flexible structure
    const { id, title, genre, chunks } = bookData;
    const totalChunks = chunks ? chunks.length : 0;

    logger.info('FirebaseService', `Starting cloud upload for book: "${title}" (${id})`);

    try {
        // A. Upload Content to Storage
        const storagePath = `books/${id}/content.json`;
        logger.info('FirebaseService', `Uploading full content to Storage: ${storagePath}`);
        const storageRef = ref(storage, storagePath);
        const jsonString = JSON.stringify(bookData);

        await uploadString(storageRef, jsonString, 'raw', { contentType: 'application/json' });
        logger.success('FirebaseService', 'Content JSON uploaded to Storage');

        // B. Save Metadata to Firestore
        const bookRef = doc(db, "users", userId, "books", String(id));
        logger.info('FirebaseService', `Saving metadata to Firestore for user: ${userId}`);

        await setDoc(bookRef, {
            bookId: String(id),
            title: title,
            genre: genre || "unknown",
            totalChunks: totalChunks,
            uploadedAt: serverTimestamp(),
            chunkingMetadata: {
                totalChunks: totalChunks,
                strategy: "v1_genre_aware"
            },
            reading: {
                currentChunkIndex: 0,
                progressPercent: 0,
                lastReadAt: serverTimestamp()
            }
        });

        logger.success('FirebaseService', 'Book upload complete: metadata and content synced');
        return true;
    } catch (error: any) {
        logger.error('FirebaseService', 'Upload failed', {
            error: error.message,
            bookId: id,
            title
        });
        throw error;
    }
};

/**
 * Fetches the list of books (Metadata ONLY) for the library view.
 */
export const getUserLibrary = async (userId: string) => {
    logger.info('FirebaseService', `Fetching library for user: ${userId}`);
    try {
        const booksRef = collection(db, "users", userId, "books");
        const snapshot = await getDocs(booksRef);

        const books = snapshot.docs.map(doc => doc.data());
        logger.success('FirebaseService', `Library fetched: ${books.length} books found`);
        return books;
    } catch (error: any) {
        logger.error('FirebaseService', 'Failed to get library', error);
        return [];
    }
};

/**
 * Downloads the full book content.
 */
export const downloadBookContent = async (bookId: string) => {
    logger.info('FirebaseService', `Downloading content for book: ${bookId}`);
    try {
        const storageRef = ref(storage, `books/${bookId}/content.json`);
        const url = await getDownloadURL(storageRef);

        const response = await fetch(url);
        const json = await response.json();
        logger.success('FirebaseService', 'Book content downloaded and parsed');
        return json;
    } catch (error: any) {
        logger.error('FirebaseService', 'Failed to download content', error);
        throw error;
    }
};

// ==========================================
// 🔄 SYNC & PROGRESS
// ==========================================

/**
 * Updates reading progress.
 */
export const syncReadingProgress = async (userId: string, bookId: string, chunkIndex: number, totalChunks: number) => {
    try {
        const bookRef = doc(db, "users", userId, "books", String(bookId));
        const percent = Math.round((chunkIndex / totalChunks) * 100);

        await updateDoc(bookRef, {
            "reading.currentChunkIndex": chunkIndex,
            "reading.progressPercent": percent,
            "reading.lastReadAt": serverTimestamp()
        });
        logger.debug('FirebaseService', `Reading progress synced: ${percent}%`, { bookId, chunkIndex });
    } catch (error: any) {
        logger.warn('FirebaseService', 'Progress sync failed (non-critical)', error);
    }
};

// ==========================================
// 🧠 BRAIN BANK (HIGHLIGHTS)
// ==========================================

export const saveHighlight = async (userId: string, highlightData: any) => {
    const { bookId, chunkId, text, context } = highlightData;
    const highlightId = `hl_${Date.now()}`;
    logger.info('FirebaseService', 'Saving highlight to cloud', { bookId, highlightId });

    try {
        const ref = doc(db, "users", userId, "brainBank", highlightId);
        await setDoc(ref, {
            id: highlightId,
            bookId,
            chunkId,
            text,
            context,
            savedAt: serverTimestamp()
        });
        logger.success('FirebaseService', 'Highlight saved successfully');
        return highlightId;
    } catch (error: any) {
        logger.error('FirebaseService', 'Save highlight failed', error);
        throw error;
    }
};
