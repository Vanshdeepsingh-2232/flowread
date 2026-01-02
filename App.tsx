import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Book, UserSettings, Theme } from './types';
import { db } from './db';
import { extractTextFromPdf, extractTextFromTxt } from './services/pdfService';
import { semanticChunking } from './services/geminiService';
import { findSafeBatchEnd } from './utils/textUtils';
import ReaderView from './components/ReaderView';
import BrainBank from './components/BrainBank';
import Library from './components/Library';
import Sidebar from './components/Sidebar';
import Profile from './components/Profile';
import SettingsModal from './components/SettingsModal';
import ErrorToast from './components/ErrorToast';
import Stats from './components/Stats';
import Features from './components/Features';
import About from './components/About';
import { useLiveQuery } from 'dexie-react-hooks';

const BATCH_SIZE = 20000; // Characters to process per batch

// Default Settings
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'midnight',
  fontFamily: 'serif',
  textSize: 3,
  scrollMode: 'vertical',
  density: 'standard',
  autoScrollSpeed: 0,
  progressBarStyle: 'segmented',
  hapticsEnabled: true,
  showContextTags: true,
  isLeftHanded: false
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LIBRARY);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  // Error/Notification State
  const [errorState, setErrorState] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);

  const showError = (msg: string) => setErrorState({ message: msg, type: 'error' });
  const showSuccess = (msg: string) => setErrorState({ message: msg, type: 'success' });

  // Processing State
  const [processingState, setProcessingState] = useState({
    active: false,
    message: '',
    progress: 0
  });

  // Global UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarSide, setSidebarSide] = useState<'left' | 'right'>('left');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load Settings
  useEffect(() => {
    const saved = localStorage.getItem('flowread-settings-v1');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Persist Settings & Apply Global Theme/Font
  useEffect(() => {
    localStorage.setItem('flowread-settings-v1', JSON.stringify(settings));

    // Apply Theme Class
    const root = document.documentElement;
    root.classList.remove('midnight', 'slate', 'paper', 'daylight', 'light', 'dark', 'coffee'); // Removing old ones too
    root.classList.add(settings.theme);

    // Apply Global Font Var if needed, or handle in ReaderView
  }, [settings]);

  // Storage calculation (Rough estimate)
  // In a real app, we'd query navigator.storage or iterate IndexedDB
  const storageEstimate = useLiveQuery(async () => {
    const books = await db.books.toArray();
    const chunks = await db.chunks.toArray();
    // Rough: 1 char ~= 1 byte. 
    let bytes = 0;
    books.forEach(b => bytes += (b.rawContent?.length || 0));
    chunks.forEach(c => bytes += c.text.length + 200); // + overhead
    return bytes / (1024 * 1024);
  });

  const handleClearCache = async () => {
    if (confirm("Clear all book content? Highlights and Library metadata will differ.")) {
      // Implementation: We clear chunks and rawText but keep Book entries and BrainBank
      // Actually user said "Keeps highlights, deletes processed book text".
      // This implies we need to re-process if they open it again.
      // For simplicity, let's just clear everything except BrainBank for now? 
      // Or strictly following request:

      // 1. Clear Chunks
      await db.chunks.clear();

      // 2. Clear Raw Content from Books
      const books = await db.books.toArray();
      const updates = books.map(b => ({ key: b.id, changes: { rawContent: "", processedCharCount: 0, totalChunks: 0 } }));
      // await db.books.bulkPut(updates...); -> Dexie bulkUpdate is tricky, loop for now
      for (const b of books) {
        await db.books.update(b.id, { rawContent: undefined, processedCharCount: 0, totalChunks: 0 });
      }

      showSuccess("Cache cleared! Books will need to be re-processed.");
      setCurrentBook(null);
      setAppState(AppState.LIBRARY);
    }
  };

  // Global Edge Swipe Detection
  useEffect(() => {
    let touchStartX = 0;

    const handleGlobalTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (isSidebarOpen) return;

      const touchEndX = e.changedTouches[0].clientX;
      const windowWidth = window.innerWidth;
      const deltaX = touchEndX - touchStartX;

      // Swipe RIGHT from LEFT EDGE (< 50px)
      if (touchStartX < 50 && deltaX > 50) {
        setSidebarSide('left');
        setIsSidebarOpen(true);
      }

      // Swipe LEFT from RIGHT EDGE (> Width - 50px)
      else if (touchStartX > windowWidth - 50 && deltaX < -50) {
        setSidebarSide('right');
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('touchstart', handleGlobalTouchStart);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleGlobalTouchStart);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isSidebarOpen]);


  // Handle uploading and processing a new file
  const handleFileUpload = async (file: File) => {
    setProcessingState({ active: true, message: 'Reading file...', progress: 10 });

    try {
      let text = "";
      let type: 'pdf' | 'txt' = 'txt';

      if (file.type === "application/pdf") {
        text = await extractTextFromPdf(file, (progress) => {
          // Map 0-100% PDF progress to 10-35% total progress
          setProcessingState(prev => ({
            ...prev,
            progress: 10 + Math.round((progress / 100) * 25)
          }));
        });
        type = 'pdf';
      } else {
        text = await extractTextFromTxt(file);
        setProcessingState(prev => ({ ...prev, progress: 35 }));
        type = 'txt';
      }

      if (!text || text.length < 10) {
        showError("Could not extract text or file is empty.");
        setProcessingState({ active: false, message: '', progress: 0 });
        return;
      }

      setProcessingState({ active: true, message: 'Analyzing structure...', progress: 35 });
      const bookId = uuidv4();

      // Process first batch (Smart Slice)
      const safeEndIndex = findSafeBatchEnd(text, BATCH_SIZE);
      const textBatch = text.slice(0, safeEndIndex);

      setProcessingState({ active: true, message: 'Chunking Chapter 1...', progress: 40 });

      // Fake progress during AI call
      const chunkingInterval = setInterval(() => {
        setProcessingState(prev => ({ ...prev, progress: Math.min(prev.progress + 2, 90) }));
      }, 500);

      const bookTitle = file.name.replace(/\.[^/.]+$/, "");
      const chunks = await semanticChunking(textBatch, bookId, 0, undefined, bookTitle);
      clearInterval(chunkingInterval);

      const newBook: Book = {
        id: bookId,
        title: bookTitle,
        author: "Unknown",
        fileType: type,
        totalChunks: chunks.length,
        lastReadIndex: 0,
        dateAdded: Date.now(),
        rawContent: text,
        processedCharCount: safeEndIndex
      };

      setProcessingState({ active: true, message: 'Finalizing...', progress: 100 });

      // Save to IndexedDB
      await (db as any).transaction('rw', db.books, db.chunks, async () => {
        await db.books.add(newBook);
        await db.chunks.bulkAdd(chunks);
      });

      setCurrentBook(newBook);
      setProcessingState({ active: false, message: '', progress: 0 });
      setAppState(AppState.READING);

    } catch (error: any) {
      console.error("Processing failed", error);
      showError(error.message || "Failed to process file. Ensure API Key is valid and try again.");
      setProcessingState({ active: false, message: '', progress: 0 });
    }
  };

  const handleSelectBook = (book: Book) => {
    // Check if book has content (might be cleared cache)
    if (!book.totalChunks || book.totalChunks === 0) {
      showError("This book's content is missing. Please re-upload.");
      return;
    }
    setCurrentBook(book);
    setAppState(AppState.READING);
  };

  const handleBackToLibrary = () => {
    setAppState(AppState.LIBRARY);
    setCurrentBook(null);
  };

  const handleLoadMore = async () => {
    if (!currentBook || !currentBook.rawContent) return;

    const startChar = currentBook.processedCharCount;
    const totalLen = currentBook.rawContent.length;

    if (startChar >= totalLen) return;

    try {
      // Load next batch
      const nextBatchEnd = findSafeBatchEnd(currentBook.rawContent.slice(startChar), BATCH_SIZE) + startChar;
      const textBatch = currentBook.rawContent.slice(startChar, nextBatchEnd);

      // Find previous context (last chapter)
      const lastChunk = await db.chunks.where('bookId').equals(currentBook.id).reverse().first();
      const context = lastChunk?.chapterTitle;

      setProcessingState({ active: true, message: 'Synthesizing...', progress: 50 });

      const newChunks = await semanticChunking(textBatch, currentBook.id, (lastChunk?.index || 0) + 1, context, currentBook.title);

      await db.transaction('rw', db.books, db.chunks, async () => {
        await db.chunks.bulkAdd(newChunks);
        await db.books.update(currentBook.id, {
          totalChunks: (currentBook.totalChunks || 0) + newChunks.length,
          processedCharCount: nextBatchEnd
        });
      });

      // Refresh current book object
      const updatedBook = await db.books.get(currentBook.id);
      if (updatedBook) setCurrentBook(updatedBook);

      setProcessingState({ active: false, message: '', progress: 0 });
    } catch (e) {
      setProcessingState({ active: false, message: '', progress: 0 });
      showError("Failed to load more content. Check your connection.");
      console.error(e);
    }
  };

  const handleNavigateToChunk = async (bookId: string, chunkId: string) => {
    const book = await db.books.get(bookId);
    if (book) {
      const chunk = await db.chunks.get(chunkId);
      if (chunk) {
        await db.books.update(bookId, { lastReadIndex: chunk.index });
        const updatedBook = await db.books.get(bookId);
        if (updatedBook) {
          setCurrentBook(updatedBook);
          setAppState(AppState.READING);
        }
      }
    }
  };

  const handleNavigate = (page: 'features' | 'about') => {
    if (page === 'features') setAppState(AppState.FEATURES);
    if (page === 'about') setAppState(AppState.ABOUT);
  };

  return (
    <div className="text-text antialiased bg-background transition-colors duration-300 font-sans">

      {errorState && (
        <ErrorToast
          message={errorState.message}
          type={errorState.type}
          onClose={() => setErrorState(null)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={setAppState}
        currentPage={appState}
        onOpenSettings={() => setIsSettingsOpen(true)}
        side={sidebarSide}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearCache={handleClearCache}
        storageUsageMB={storageEstimate || 0}
      />

      {/* Main Content Routing */}
      {appState === AppState.PROCESSING && (
        <Library
          onSelectBook={() => { }} // Disabled during processing
          onUploadFile={() => { }}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          processingState={processingState}
          onNavigate={handleNavigate}
        />
      )}

      {appState === AppState.LIBRARY && (
        <Library
          onSelectBook={handleSelectBook}
          onUploadFile={handleFileUpload}
          onOpenSidebar={() => { setSidebarSide('left'); setIsSidebarOpen(true); }}
          processingState={processingState}
          onNavigate={handleNavigate}
        />
      )}

      {appState === AppState.READING && currentBook && (
        <ReaderView
          book={currentBook}
          onBack={handleBackToLibrary}
          onLoadMore={handleLoadMore}
          settings={settings}
        />
      )}

      {appState === AppState.PROFILE && (
        <Profile
          onBack={() => setAppState(AppState.LIBRARY)}
          currentTheme={settings.theme as Theme}
          onThemeChange={(t) => setSettings({ ...settings, theme: t })}
        />
      )}

      {appState === AppState.BRAIN_BANK && (
        <BrainBank
          onBack={() => setAppState(AppState.LIBRARY)}
          onNavigateToChunk={handleNavigateToChunk}
        />
      )}

      {appState === AppState.STATS && (
        <Stats onBack={() => setAppState(AppState.LIBRARY)} />
      )}

      {appState === AppState.FEATURES && (
        <Features onBack={() => setAppState(AppState.LIBRARY)} />
      )}

      {appState === AppState.ABOUT && (
        <About onBack={() => setAppState(AppState.LIBRARY)} />
      )}
    </div>
  );
};

export default App;
