import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger';
import { AppState, Book, UserSettings, Theme } from './types';
import { db } from './db';
import { extractTextFromPdf, extractTextFromTxt } from './services/pdfService';
import { semanticChunking } from './services/geminiService';
import { findSafeBatchEnd } from './utils/textUtils';

// Eager Imports (Critical for First Paint)
import Library from './components/Library';
import Sidebar from './components/Sidebar';
import ErrorToast from './components/ErrorToast';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from './context/AuthContext';
import { useBooks } from './hooks/useBooks';
import { uploadBookToCloud } from './services/firebaseService';
import { detectGenre } from './services/genreDetector';
import WebReaderInput from './components/WebReaderInput';
import { fetchAndParseArticle } from './services/webExtractor';
import { cleanWebHtml } from './services/geminiService';

// Lazy Imports (Load only when needed)
const ReaderView = React.lazy(() => import('./components/ReaderView'));
const BrainBank = React.lazy(() => import('./components/BrainBank'));
const Profile = React.lazy(() => import('./components/Profile'));
const Stats = React.lazy(() => import('./components/Stats'));
const Features = React.lazy(() => import('./components/Features'));
const About = React.lazy(() => import('./components/About'));

// Simple Loading Fallback
const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const BATCH_SIZE = 20000; // Characters to process per batch

// Default Settings
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'midnight',
  fontFamily: 'quicksand',
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

  // Auth & Sync Logic
  const { currentUser: user } = useAuth();
  useBooks(); // Sync Trigger

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
    logger.info('App', 'Loading user settings from localStorage');
    const saved = localStorage.getItem('flowread-settings-v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        logger.success('App', 'Settings loaded successfully', parsed);
      } catch (e) {
        logger.error('App', 'Failed to parse settings', e);
      }
    } else {
      logger.info('App', 'No saved settings found, using defaults');
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
      await db.books.toCollection().modify({ rawContent: "", processedCharCount: 0, totalChunks: 0 });

      showSuccess("Cache cleared. Book text removed, highlights kept.");
      window.location.reload();
    }
  };

  const handleExportHighlights = async () => {
    const highlights = await db.brainBank.toArray();
    const blob = new Blob([JSON.stringify(highlights, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowread-highlights-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // -------------------------
  // Handlers
  // -------------------------

  // Handle Global Swipe from Edges
  useEffect(() => {


    // We already have Sidebar opening logic? No, only in specific buttons.
    // Let's add edge swipe detection for opening sidebar
    let touchStartX = 0;

    const handleGlobalTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX;
      const windowWidth = window.innerWidth;

      // Ignore if sidebar is open (Sidebar handles closing)
      if (isSidebarOpen) return;

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
    logger.info('App', `Starting file upload process for: ${file.name}`, { size: file.size, type: file.type });
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
        logger.warn('App', 'File processing aborted: text extraction failed or file too short');
        showError("Could not extract text or file is empty.");
        setProcessingState({ active: false, message: '', progress: 0 });
        return;
      }

      logger.info('App', `Text extraction complete (${text.length} chars). Identifying genre...`);
      setProcessingState({ active: true, message: 'Analyzing structure...', progress: 60 });

      // 2. Detect Genre
      const genre = await detectGenre(text);
      logger.info('App', `Detected genre: ${genre}`);

      // 3. Smart Chunking (First Batch)
      const firstBatchEnd = findSafeBatchEnd(text, BATCH_SIZE);
      const firstBatchText = text.slice(0, firstBatchEnd);

      logger.info('App', `Processing first batch of ${firstBatchText.length} characters`);
      setProcessingState({ active: true, message: `Creating smart cards (${genre})...`, progress: 75 });
      const bookId = uuidv4();
      const chunks = await semanticChunking(firstBatchText, bookId, 0, undefined, file.name.replace(/\.[^/.]+$/, ""), genre);

      // 4. Save to DB
      const newBook: Book = {
        id: bookId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        author: "Unknown",
        fileType: type,
        dateAdded: Date.now(),
        lastReadIndex: 0,
        totalChunks: chunks.length,
        processedCharCount: firstBatchEnd,
        rawContent: text,
        genre: genre
      };

      logger.info('App', 'Saving book and chunks to local database');
      await db.transaction('rw', db.books, db.chunks, async () => {
        await db.books.add(newBook);
        await db.chunks.bulkAdd(chunks);
      });

      logger.success('App', `Book "${newBook.title}" processed and saved locally`);

      // 5. Cloud Sync (Background)
      if (user) {
        logger.info('App', 'Initiating background cloud sync');
        // Critical Fix: Pass chunks explicitly as they are not in the 'Book' type
        uploadBookToCloud(user.uid, { ...newBook, chunks })
          .then(() => logger.success('App', '☁️ Uploaded to cloud'))
          .catch((err) => logger.error('App', 'Cloud upload failed', err));
      } else {
        logger.warn('App', 'User not logged in - Book saved locally only');
      }

      setProcessingState({ active: false, message: '', progress: 100 });
      setCurrentBook(newBook);
      setAppState(AppState.READING);

    } catch (error: any) {
      logger.error('App', 'File processing failed', error);
      showError(error.message || "Failed to process file.");
      setProcessingState({ active: false, message: '', progress: 0 });
    }
  };

  // Handle URL Article Processing
  const handleUrlSubmit = async (url: string) => {
    logger.info('App', `Starting article extraction for: ${url}`);
    setProcessingState({ active: true, message: 'Fetching article...', progress: 20 });

    try {
      let article = await fetchAndParseArticle(url);

      if (!article.content || article.content.length < 50) {
        throw new Error('Article content is too short or empty');
      }

      // ---------------------------------------------------------
      // AI Cleaning Step (If raw content returned)
      // ---------------------------------------------------------
      if (article.isRaw) {
        setProcessingState({ active: true, message: 'AI is reading the page...', progress: 40 });
        try {
          const aiCleaned = await cleanWebHtml(article.content);
          article = {
            ...article,
            title: aiCleaned.title || article.title,
            content: aiCleaned.content,
            textContent: aiCleaned.content,
            byline: aiCleaned.author !== "Unknown" ? aiCleaned.author : article.byline,
            isRaw: false
          };
          logger.success('App', 'AI successfully cleaned the raw content');
        } catch (err) {
          logger.warn('App', 'AI cleaning failed, using raw content as fallback', err);
        }
      }

      setProcessingState({ active: true, message: 'Analyzing content...', progress: 60 });
      const genre = await detectGenre(article.textContent);

      // Smart Chunking
      setProcessingState({ active: true, message: 'Creating reading cards...', progress: 80 });
      const bookId = uuidv4();

      const chunks = await semanticChunking(
        article.textContent,
        bookId,
        0,
        undefined,
        article.title,
        genre
      );

      const newBook: Book = {
        id: bookId,
        title: article.title,
        author: article.byline || article.siteName,
        fileType: 'web_article',
        dateAdded: Date.now(),
        lastReadIndex: 0,
        totalChunks: chunks.length,
        processedCharCount: article.textContent.length,
        rawContent: article.textContent,
        genre: genre
      };

      // Save to DB
      await db.transaction('rw', db.books, db.chunks, async () => {
        await db.books.add(newBook);
        await db.chunks.bulkAdd(chunks);
      });

      // Cloud Sync
      if (user) {
        uploadBookToCloud(user.uid, { ...newBook, chunks }).catch(console.error);
      }

      setProcessingState({ active: false, message: '', progress: 100 });
      setCurrentBook(newBook);
      setAppState(AppState.READING);

    } catch (error: any) {
      logger.error('App', 'Article extraction failed', error);
      showError(error.message || "Failed to fetch article.");
      setProcessingState({ active: false, message: '', progress: 0 });
    }
  };

  // Cleanup duplicate chunks (same index) keeping the one with latest ID maybe? 
  // Actually usually we want to keep one.
  const cleanupDuplicateChunks = async (bookId: string) => {
    const chunks = await db.chunks.where('bookId').equals(bookId).sortBy('index');
    const seenIndices = new Set<number>();
    const duplicateIds: string[] = [];

    for (const chunk of chunks) {
      if (seenIndices.has(chunk.index)) {
        duplicateIds.push(chunk.id);
      } else {
        seenIndices.add(chunk.index);
      }
    }

    if (duplicateIds.length > 0) {
      await db.chunks.bulkDelete(duplicateIds);
      logger.success('App', `Cleaned up ${duplicateIds.length} duplicate chunks.`);
      // Re-count chunks
      const count = await db.chunks.where('bookId').equals(bookId).count();
      await db.books.update(bookId, { totalChunks: count });
    }
  };

  const handleSelectBook = async (book: Book) => {
    // Check if book has content (might be cleared cache)
    if (!book.totalChunks || book.totalChunks === 0) {
      showError("This book's content is missing. Please re-upload.");
      return;
    }

    // Auto-heal duplicates
    await cleanupDuplicateChunks(book.id);

    // Fetch full book incase rawContent is missing from list view
    const fullBook = await db.books.get(book.id);

    if (fullBook) {
      setCurrentBook(fullBook);
      setAppState(AppState.READING);
    } else {
      showError("Book not found in database.");
    }
  };

  const handleBackToLibrary = () => {
    setAppState(AppState.LIBRARY);
    setCurrentBook(null);
  };

  const handleLoadMore = async () => {
    if (processingState.active) return; // Prevent concurrent calls
    if (!currentBook || !currentBook.rawContent) return;

    const startChar = currentBook.processedCharCount;
    const totalLen = currentBook.rawContent.length;

    if (startChar >= totalLen) return;

    try {
      // Load next batch
      const nextBatchEnd = findSafeBatchEnd(currentBook.rawContent.slice(startChar), BATCH_SIZE) + startChar;
      const textBatch = currentBook.rawContent.slice(startChar, nextBatchEnd);

      // Find previous context (last chapter) and robustly get the highest index
      // sort by index to ensure we get the absolute last one
      const sortedChunks = await db.chunks.where('bookId').equals(currentBook.id).sortBy('index');
      const lastChunk = sortedChunks[sortedChunks.length - 1];

      const context = lastChunk?.chapterTitle;
      const nextIndex = (lastChunk?.index ?? -1) + 1;

      setProcessingState({ active: true, message: 'Synthesizing...', progress: 50 });

      const newChunks = await semanticChunking(textBatch, currentBook.id, nextIndex, context, currentBook.title, currentBook.genre);

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
    } catch (e: any) {
      setProcessingState({ active: false, message: '', progress: 0 });
      showError("Failed to load more content. Check your connection.");
      logger.error('App', 'Failed to load more chunks', e);
    }
  };

  const handleNavigate = (page: 'features' | 'about') => {
    logger.info('App', `Navigating to ${page} page`);
    if (page === 'features') setAppState(AppState.FEATURES);
    if (page === 'about') setAppState(AppState.ABOUT);
  };

  const handleNavigateToProfile = () => {
    logger.info('App', 'Navigating to Profile');
    setAppState(AppState.PROFILE);
  };

  // Render Content based on State
  const renderContent = () => {
    if (processingState.active) {
      // While processing, show a loading/progress screen
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="relative w-32 h-32">
            <svg className="animate-spin w-full h-full text-primary" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-primary font-mono">
              {processingState.progress}%
            </div>
          </div>
          <h2 className="text-2xl font-bold animate-pulse">{processingState.message}</h2>
          <p className="text-muted max-w-md">Our AI is reading your book, analyzing the plot, and preparing the perfect reading experience.</p>
        </div>
      );
    }

    return (
      <Suspense fallback={<PageLoader />}>
        {(() => {
          switch (appState) {
            case AppState.READING:
              return currentBook ? (
                <ReaderView
                  book={currentBook}
                  onBack={handleBackToLibrary}
                  onLoadMore={handleLoadMore}
                  settings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              ) : null;

            case AppState.BRAIN_BANK:
              return <BrainBank onBack={handleBackToLibrary} onNavigate={(bookId, idx) => {
                db.books.get(bookId).then(book => {
                  if (book) {
                    setCurrentBook(book);
                    book.lastReadIndex = idx;
                    setAppState(AppState.READING);
                  }
                });
              }} />;

            case AppState.PROFILE:
              return <Profile
                onBack={handleBackToLibrary}
                currentTheme={settings.theme}
                onThemeChange={(theme) => setSettings({ ...settings, theme })}
              />;

            case AppState.WEB_READER:
              return (
                <WebReaderInput
                  onBack={handleBackToLibrary}
                  onSubmit={(url) => handleUrlSubmit(url)}
                  processing={processingState.active}
                />
              );

            case AppState.STATS:
              return <Stats onBack={handleBackToLibrary} />;

            case AppState.FEATURES:
              return <Features onBack={handleBackToLibrary} />;

            case AppState.ABOUT:
              return <About onBack={handleBackToLibrary} />;

            case AppState.LIBRARY:
            default:
              return (
                <Library
                  onUploadFile={handleFileUpload}
                  onSelectBook={handleSelectBook}
                  onNavigate={handleNavigate}
                  processingState={processingState}
                  onOpenSidebar={() => { setSidebarSide('left'); setIsSidebarOpen(true); }}
                  onNavigateToProfile={handleNavigateToProfile}
                />
              );
          }
        })()}
      </Suspense>
    );
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-[100dvh] text-text antialiased bg-background transition-colors duration-300 font-${settings.fontFamily}`}>

        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onNavigate={setAppState}
          currentPage={appState}
          onOpenSettings={() => setIsSettingsOpen(true)}
          side={sidebarSide}
        />

        {/* Settings Modal (Right Sidebar basically, or Modal) */}
        {/* We are reusing Sidebar for settings access, but we also have a dedicated SettingsModal for advanced stuff */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          onClearCache={handleClearCache}
          onExportHighlights={handleExportHighlights}
          storageUsedMB={storageEstimate || 0}
          onTriggerWebReader={() => {
            setIsSettingsOpen(false);
            setAppState(AppState.WEB_READER);
          }}
        />

        {/* Main Content */}
        <main className="relative z-10">
          {renderContent()}
        </main>

        {/* Error Toast */}
        {errorState && (
          <ErrorToast
            message={errorState.message}
            type={errorState.type}
            onClose={() => setErrorState(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;

