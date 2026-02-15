import React, { useState } from 'react';
import { ArrowLeft, Moon, Sun, Coffee, Edit2, User as UserIcon, Check, X, BookOpen, TrendingUp, ExternalLink, Download, Trash2, ArrowRight } from 'lucide-react';
import { Theme } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; // Keep Firebase db
import { db as localDb } from '../db'; // Import Dexie db as localDb
import { useLiveQuery } from 'dexie-react-hooks';
import { logger } from '../utils/logger';
import { version as appVersion } from '../package.json';

// Icons
const SettingsIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

interface ProfileProps {
  onBack: () => void;
  onClearCache: () => void;
  onExportHighlights: () => void;
  storageUsedMB: number;
  onOpenSettings: () => void;
  onNavigateToChangelog: () => void;
}

const Profile: React.FC<ProfileProps> = ({
  onBack,
  onClearCache,
  onExportHighlights,
  storageUsedMB,
  onOpenSettings,
  onNavigateToChangelog
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.displayName || '');
  const [editedBio, setEditedBio] = useState(userProfile?.bio || '');
  const [saving, setSaving] = useState(false);

  // Scroll to top on mount to fix navigation scroll preservation
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update effect when profile loads
  React.useEffect(() => {
    if (userProfile) {
      setEditedName(prev => prev || userProfile.displayName);
      setEditedBio(prev => prev || userProfile.bio || '');
    }
  }, [userProfile]);

  const getReaderRank = (chunks: number) => {
    if (chunks > 1000) return { title: 'Literary Sage', color: 'text-purple-400', icon: '🧙‍♂️' };
    if (chunks > 500) return { title: 'Bookworm', color: 'text-indigo-400', icon: '🐛' };
    if (chunks > 100) return { title: 'Avid Learner', color: 'text-blue-400', icon: '📚' };
    return { title: 'Novice', color: 'text-emerald-400', icon: '🌱' };
  };

  const rank = getReaderRank(userProfile?.stats?.totalChunksRead || 0);

  const getInitials = () => {
    if (currentUser?.photoURL) return null;
    if (userProfile?.displayName) {
      return userProfile.displayName.substring(0, 2).toUpperCase();
    }
    return currentUser?.email?.[0].toUpperCase() || 'U';
  };

  const handleSaveName = async () => {
    if (!currentUser || !editedName.trim()) return;

    const newName = editedName.trim();
    const newBio = editedBio.trim();

    logger.info('Profile', `[v2.3] Saving profile for: ${currentUser.uid}`, { newName });
    setSaving(true);

    // 1. Optimistic Update
    updateUserProfile({ displayName: newName, bio: newBio });
    setIsEditing(false);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updatePromise = setDoc(userRef, {
        displayName: newName,
        bio: newBio,
        updatedAt: new Date()
      }, { merge: true });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore operation timed out (25s)')), 25000)
      );

      await Promise.race([updatePromise, timeoutPromise]);
      logger.success('Profile', 'Profile synced to cloud');

    } catch (error: any) {
      logger.error('Profile', 'Sync failed', error);
      alert('💾 Profile saved locally! Will sync when online.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(userProfile?.displayName || '');
    setEditedBio(userProfile?.bio || '');
    setIsEditing(false);
  };

  // Calculate Top Genres from Local DB
  const topGenres = useLiveQuery(async () => {
    const books = await localDb.books.toArray();
    const genreCounts: Record<string, number> = {};

    books.forEach(book => {
      if (book.genre) {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      }
    });

    return Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  });

  return (
    <div className="min-h-screen w-full bg-background animate-fade-in">
      <div className="max-w-4xl mx-auto p-6 md:p-10 pb-20 text-text">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-surface rounded-full transition"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold">Profile</h1>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-accent border border-[var(--border-color)] rounded-full transition font-medium text-sm"
          >
            <SettingsIcon size={18} />
            All Settings
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left Column: Identity & App Info */}
          <div className="space-y-6">

            {/* Account Card */}
            <section className="bg-surface p-6 rounded-3xl border border-slate-700/20 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-accent flex items-center justify-center border-4 border-background shadow-md mb-4 relative group cursor-pointer">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {getInitials()}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Edit2 size={24} className="text-white" />
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3 w-full">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full bg-background border border-[var(--border-color)] rounded-lg p-2 text-text text-center font-bold text-xl focus:border-primary outline-none"
                      placeholder="Display Name"
                      disabled={saving}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleSaveName}
                        disabled={saving || !editedName.trim()}
                        className="px-4 py-1.5 bg-primary text-slate-900 rounded-full text-sm font-bold hover:brightness-110 disabled:opacity-50 transition"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-4 py-1.5 bg-surface-accent rounded-full text-sm font-medium hover:bg-slate-700/20 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 w-full">
                    <h2 className="text-2xl font-bold flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                      {userProfile?.displayName || 'Reader'}
                      <Edit2 size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                    </h2>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2 mb-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full bg-surface-accent border border-white/5 ${rank.color} flex items-center gap-1`}>
                        {rank.icon} {rank.title}
                      </span>
                      {/* Favorite Genres */}
                      {topGenres?.map(genre => (
                        <span key={genre} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                          {genre.replace('_', ' ')}
                        </span>
                      ))}
                    </div>

                    {userProfile?.bio && (
                      <p className="text-sm text-muted leading-relaxed mb-6 px-2 italic">
                        "{userProfile.bio}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* App Info & About */}
            <section className="bg-surface p-6 rounded-3xl border border-slate-700/20 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 opacity-70">App Info</h3>

              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="font-medium text-sm">FlowRead Version</span>
                  <span className="font-mono text-xs text-muted">v{appVersion}</span>
                </div>

                <button onClick={onNavigateToChangelog} className="w-full flex items-center justify-between py-3 hover:bg-white/5 rounded-lg px-2 -mx-2 transition group">
                  <span className="font-medium text-sm group-hover:text-primary transition-colors">What's New</span>
                  <ArrowRight size={16} className="text-muted group-hover:translate-x-1 transition-transform" />
                </button>

                <a href="https://github.com/Vanshdeepsingh-2232/flowread" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between py-3 hover:bg-white/5 rounded-lg px-2 -mx-2 transition group">
                  <span className="font-medium text-sm group-hover:text-primary transition-colors">GitHub Repository</span>
                  <ExternalLink size={16} className="text-muted" />
                </a>
              </div>
            </section>
          </div>

          {/* Right Column: Stats & Data */}
          <div className="md:col-span-8 space-y-6">

            {/* Stats Preview */}
            {userProfile?.stats && (
              <section className="bg-surface p-6 rounded-3xl border border-slate-700/20 shadow-lg">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-6 opacity-70">Reading Journey</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                    <BookOpen size={24} className="text-primary mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{userProfile.stats.booksRead}</p>
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold mt-1">Books</p>
                  </div>
                  <div className="bg-background/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-3 bg-primary/40 rounded-full" />)}
                    </div>
                    <p className="text-3xl font-bold">{userProfile.stats.totalChunksRead}</p>
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold mt-1">Cards</p>
                  </div>
                </div>
                <div className="mt-4 bg-gradient-to-r from-orange-500/10 to-transparent p-4 rounded-2xl border border-orange-500/20 flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-400">{userProfile.stats.currentStreak} Days</p>
                    <p className="text-xs text-muted">Current Reading Streak</p>
                  </div>
                </div>
              </section>
            )}

            {/* Data Management */}
            <section className="bg-surface p-6 rounded-3xl border border-slate-700/20 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 opacity-70">Data & Storage</h3>

              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-2xl font-bold">{storageUsedMB.toFixed(1)} <span className="text-sm font-medium text-muted">MB</span></span>
                  <span className="text-xs text-muted">Local Storage Used</span>
                </div>
                <div className="w-full h-2 bg-slate-700/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min((storageUsedMB / 50) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-2 text-right">Rough estimate of stored books & highlights</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={onExportHighlights}
                  className="w-full py-4 bg-background hover:bg-surface-accent border-2 border-dashed border-[var(--border-color)] hover:border-primary/50 text-muted hover:text-primary rounded-2xl font-medium flex items-center justify-center gap-2 transition-all group"
                >
                  <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                  Export Brain Bank JSON
                </button>

                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear your local library? Saved Brain Bank highlights will remain.')) {
                      onClearCache();
                    }
                  }}
                  className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
                >
                  <Trash2 size={16} />
                  Clear Library Cache
                </button>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
};


export default Profile;


