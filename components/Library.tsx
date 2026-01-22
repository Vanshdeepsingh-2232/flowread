import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Book } from '../types';
import { Upload, BookOpen, Trash2, Menu, BrainCircuit, Plus } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import Header from './Header';
import Footer from './Footer';

interface LibraryProps {
  onSelectBook: (book: Book) => void;
  onUploadFile: (file: File) => void;
  onOpenSidebar: () => void;
  processingState: { active: boolean, message: string, progress: number };
  onNavigate: (page: 'features' | 'about') => void;
  onNavigateToProfile?: () => void;
}

const Library: React.FC<LibraryProps> = ({ onSelectBook, onUploadFile, onOpenSidebar, processingState, onNavigate, onNavigateToProfile }) => {
  // Sort books by lastReadTime if available, or just by dateAdded. 
  // Ideally, identifying "Currently Reading" is the most recently accessed one.
  // For now, let's assume the first one in the list (newest added) is Current.
  const books = useLiveQuery(() => db.books.orderBy('dateAdded').reverse().toArray());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Split Logic
  const currentBook = books && books.length > 0 ? books[0] : null;
  const libraryBooks = books && books.length > 1 ? books.slice(1) : [];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  const promptDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      db.books.delete(deleteTarget);
      db.chunks.where('bookId').equals(deleteTarget).delete();
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  // Helper for progress ring
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (processingState.progress / 100) * circumference;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        onNavigate={onNavigate}
        onNavigateToProfile={onNavigateToProfile}
        onOpenSidebar={onOpenSidebar}
      />

      <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full transition-colors duration-300">


        {/* Currently Reading Section */}
        <section className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Currently Reading</h2>

          {processingState.active ? (
            // Processing State Card
            <div className="w-full bg-surface border border-primary/50 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
              <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                {/* SVG Ring */}
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle
                    className="text-slate-700/30"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                  />
                  <circle
                    className="text-primary transition-all duration-300 ease-out"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                  />
                </svg>
                <div className="absolute text-xs font-bold text-primary">{processingState.progress}%</div>
              </div>
              <p className="text-lg font-bold text-text animate-pulse">{processingState.message}</p>
              <p className="text-xs text-muted mt-1">Please keep this tab open</p>
            </div>
          ) : currentBook ? (
            // Active Book Card
            <div
              onClick={() => onSelectBook(currentBook)}
              className="group relative bg-gradient-to-br from-surface to-surface/50 border border-border rounded-3xl p-5 md:p-8 cursor-pointer hover:border-primary/50 transition-all shadow-xl shadow-[var(--shadow-color)]/20 flex items-start sm:items-center gap-4 md:gap-6"
            >
              <div className="w-20 h-28 md:w-24 md:h-32 bg-surface-accent rounded-lg shadow-2xl shadow-[var(--shadow-color)]/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-muted/20 to-transparent" />
                <BookOpen size={40} className="text-primary z-10" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg md:text-2xl font-bold text-text leading-tight mb-1 md:mb-2 truncate">{currentBook.title}</h3>
                    <p className="text-xs md:text-sm text-muted mb-3 md:mb-4 truncate">{currentBook.totalChunks} chunks • Added {new Date(currentBook.dateAdded).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => promptDelete(e, currentBook.id)}
                    className="shrink-0 p-2 -mt-2 -mr-2 text-muted hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition"
                    title="Delete Book"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="w-full bg-muted/20 h-1.5 md:h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(((currentBook.lastReadIndex + 1) / (currentBook.totalChunks || 1)) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] md:text-xs font-medium">
                  <span className="text-primary">{Math.round(((currentBook.lastReadIndex + 1) / (currentBook.totalChunks || 1)) * 100)}% Complete</span>
                  <span className="text-muted">Continue Reading →</span>
                </div>
              </div>
            </div>
          ) : (
            // Empty State Placeholder
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-surface border-2 border-dashed border-slate-700/30 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-muted hover:text-primary group"
            >
              <div className="p-4 bg-surface-accent rounded-full mb-4 group-hover:scale-110 transition-transform">
                <Plus size={32} />
              </div>
              <p className="font-medium">Tap to start reading a new book</p>
              <p className="text-xs opacity-70 mt-1">Supports PDF & TXT</p>
            </div>
          )}

          {/* Hidden Input for main card */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt"
            onChange={handleChange}
          />
        </section>

        {/* Library Grid Helper - Show if we have any books (so we can add more) */}
        {(currentBook) && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Library Area</h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary text-black rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5"
              >
                <Plus size={16} /> Add Book
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Persistent Upload Card in Grid */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-surface/50 border-2 border-dashed border-border/60 rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition flex flex-col items-center justify-center text-center gap-2 group min-h-[100px]"
              >
                <div className="p-2 bg-surface-accent rounded-full group-hover:scale-110 transition-transform">
                  <Plus size={20} className="text-primary" />
                </div>
                <span className="text-xs font-bold text-muted group-hover:text-primary">Upload New</span>
              </div>
              {libraryBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group bg-surface hover:bg-surface-accent/10 transition p-4 rounded-xl border border-border/50 hover:border-border cursor-pointer flex gap-4"
                >
                  <div className="w-12 h-16 bg-surface-accent rounded shadow-sm flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-text truncate text-sm">{book.title}</h4>
                    <div className="w-full bg-muted/20 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-slate-400 group-hover:bg-primary transition-colors"
                        style={{ width: `${Math.min(100, Math.round(((book.lastReadIndex + 1) / (book.totalChunks || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={(e) => promptDelete(e, book.id)}
                    className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition self-center"
                    title="Delete Book"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Drag Overlay */}
        <div
          className={`fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity pointer-events-none ${dragActive ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="bg-surface p-8 rounded-3xl shadow-2xl flex flex-col items-center">
            <Upload size={48} className="text-primary mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-text">Drop your book here</h3>
          </div>
        </div>

        {/* Global Drag Handler Zone (Invisible but active) */}
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{ pointerEvents: dragActive ? 'auto' : 'none' }} // Only catch drops when dragging
        />

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete Book?"
          message="This action cannot be undone. All your progress and bookmarks for this book will be lost."
          confirmLabel="Delete Forever"
          isDestructive={true}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      </div>

      <Footer />
    </div>
  );
};

export default Library;
