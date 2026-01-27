import React, { useState } from 'react';
import { ArrowLeft, Moon, Sun, Coffee, Edit2, User as UserIcon, Check, X, BookOpen } from 'lucide-react';
import { Theme } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';

interface ProfileProps {
  onBack: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack, currentTheme, onThemeChange }) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile?.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    if (!currentUser || !editedName.trim()) return;

    const newName = editedName.trim();
    logger.info('Profile', `[v2.2] Optimistically updating name for: ${currentUser.uid}`, { newName });

    setSaving(true);

    // 1. Optimistic Update (Immediate UI response)
    updateUserProfile({ displayName: newName });
    setIsEditing(false);

    try {
      const userRef = doc(db, 'users', currentUser.uid);

      logger.debug('Profile', 'Syncing change with Firestore...', {
        persistence: 'Active',
        timeout: '25s'
      });

      const updatePromise = setDoc(userRef, {
        displayName: newName,
        updatedAt: new Date()
      }, { merge: true });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore operation timed out (25s)')), 25000)
      );

      await Promise.race([updatePromise, timeoutPromise]);

      logger.success('Profile', '[v2.2] Firestore sync confirmed', { newName });
      alert('✅ Profile updated and synced to cloud!');

    } catch (error: any) {
      logger.error('Profile', '[v2.2] Sync delayed or failed', { message: error.message });

      if (error.message?.includes('timed out')) {
        logger.warn('Profile', 'Firestore sync timed out, but change is cached locally.');
        alert('💾 Profile updated! Changes saved locally and will sync when you\'re back online.');
      } else {
        alert('❌ Persistent Error: ' + (error.message || 'Unknown error'));
        // Rollback if it's a hard failure (like permissions)
        updateUserProfile({ displayName: userProfile?.displayName });
      }
    } finally {
      logger.debug('Profile', '[v2.2] handleSaveName completed');
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(userProfile?.displayName || '');
    setIsEditing(false);
  };

  const getInitials = () => {
    if (currentUser?.photoURL) return null;
    if (userProfile?.displayName) {
      return userProfile.displayName.substring(0, 2).toUpperCase();
    }
    return currentUser?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background text-text p-6 md:p-10 max-w-2xl mx-auto animate-fade-in">
      <header className="mb-8 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface rounded-full transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
      </header>

      {/* Account Section */}
      <section className="bg-surface p-6 rounded-2xl border border-slate-700/20 shadow-lg mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-700/10 pb-2">Account</h2>

        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {getInitials()}
              </span>
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-background border border-[var(--border-color)] rounded-lg p-2 text-text focus:border-primary outline-none"
                  placeholder="Display Name"
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={saving || !editedName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                  >
                    <Check size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-surface border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-background disabled:opacity-50 transition"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-lg">{userProfile?.displayName || 'Reader'}</h3>
                  <button
                    onClick={() => {
                      setEditedName(userProfile?.displayName || '');
                      setIsEditing(true);
                    }}
                    className="p-1.5 hover:bg-background rounded-full transition text-muted hover:text-primary"
                    title="Edit Name"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-muted">{currentUser?.email}</p>
                <p className="text-xs text-muted mt-1">
                  Joined {userProfile?.createdAt ? new Date(userProfile.createdAt.toDate?.() || userProfile.createdAt).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-surface p-6 rounded-2xl border border-slate-700/20 shadow-lg mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-700/10 pb-2">Appearance</h2>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-sm text-muted mb-3">Color Theme</p>
            <div className="flex gap-2">
              <button
                onClick={() => onThemeChange('midnight')}
                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'midnight' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
              >
                <Moon size={24} />
                <span className="text-sm font-medium">Midnight</span>
              </button>

              <button
                onClick={() => onThemeChange('slate')}
                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'slate' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
              >
                <Sun size={24} />
                <span className="text-sm font-medium">Slate</span>
              </button>

              <button
                onClick={() => onThemeChange('coffee')}
                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'coffee' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
              >
                <Coffee size={24} />
                <span className="text-sm font-medium">Coffee</span>
              </button>

              <button
                onClick={() => onThemeChange('textured')}
                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'textured' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
              >
                <BookOpen size={24} />
                <span className="text-sm font-medium">Textured</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Preview */}
      {userProfile?.stats && (
        <section className="bg-surface p-6 rounded-2xl border border-slate-700/20 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 border-b border-slate-700/10 pb-2">Reading Stats</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{userProfile.stats.booksRead}</p>
              <p className="text-xs text-muted mt-1">Books Read</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{userProfile.stats.totalChunksRead}</p>
              <p className="text-xs text-muted mt-1">Cards Read</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{userProfile.stats.currentStreak}</p>
              <p className="text-xs text-muted mt-1">Day Streak</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Profile;
