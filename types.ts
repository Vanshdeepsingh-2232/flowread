export interface Book {
  id: string;
  title: string;
  author: string;
  fileType: 'pdf' | 'txt' | 'epub' | 'web_article';
  totalChunks: number;
  lastReadIndex: number;
  dateAdded: number;
  rawContent?: string; // Stored temporarily for processing
  processedCharCount: number; // Tracks how many characters have been chunked
  furthestReadIndex?: number; // Tracks the absolute furthest point user has reached
  genre?: 'fiction' | 'non_fiction' | 'technical' | 'script';
}

export interface Chunk {
  id: string;
  bookId: string;
  index: number; // Serves as absoluteIndex
  text: string;

  // Anchor Metadata
  chapterTitle: string; // e.g. "Chapter 2: The Crystal Merchant"
  chapterIndex?: number; // Optional, can be derived or assumed 0 for now

  // Brain Metadata
  contextLabel: string; // e.g. "Scene: The Desert Oasis"
  speaker?: string; // e.g. "The Alchemist"
  isNewScene?: boolean;
  estimatedTime?: number; // in seconds

  // State Metadata
  shareableQuote?: string;
  isBookmarked?: boolean;
  highlightedText?: string;

  // Legacy/Internal
  tags?: string[];
  isThinking?: boolean;
  genre?: 'fiction' | 'non_fiction' | 'technical' | 'script';
}

export interface BrainBankItem {
  id: string;
  chunkId: string;
  bookId: string;
  text: string;
  note?: string;
  savedAt: number;
}

export enum AppState {
  LIBRARY = 'LIBRARY',
  READING = 'READING',
  PROCESSING = 'PROCESSING',
  PROFILE = 'PROFILE',
  BRAIN_BANK = 'BRAIN_BANK',
  STATS = 'STATS',
  FEATURES = 'FEATURES',
  ABOUT = 'ABOUT',
  WEB_READER = 'WEB_READER',
}

// --- User Settings & Preferences ---

export type Theme = 'midnight' | 'slate' | 'paper' | 'daylight' | 'coffee';
export type FontFamily = 'serif' | 'sans' | 'dyslexic' | 'quicksand';
export type ScrollMode = 'vertical' | 'horizontal';
export type DensityMode = 'focus' | 'standard' | 'dense';
export type ProgressBarStyle = 'segmented' | 'minimal' | 'hidden';

export interface UserSettings {
  // Visual
  theme: Theme;
  fontFamily: FontFamily;
  textSize: number; // 1-5 Scale
  isBold: boolean;

  // Flow
  scrollMode: ScrollMode;
  density: DensityMode;
  autoScrollSpeed: number; // 0 = Off

  // HUD
  progressBarStyle: ProgressBarStyle;
  hapticsEnabled: boolean;
  showContextTags: boolean;

  // Accessibility
  isLeftHanded: boolean;

  // Developer
  debugMode: boolean;
}
