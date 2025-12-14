import React, { useRef } from 'react';
import { Home, User, Server, Settings, X, BookOpen, BarChart2 } from 'lucide-react';
import { AppState } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: AppState) => void;
  currentPage: AppState;
  onOpenSettings: () => void;
  side?: 'left' | 'right';
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentPage,
  onOpenSettings,
  side = 'left'
}) => {

  // Dynamic Styles based on Side
  const transformClass = side === 'left'
    ? (isOpen ? 'translate-x-0' : '-translate-x-full')
    : (isOpen ? 'translate-x-0' : 'translate-x-full');

  const positionClass = side === 'left' ? 'left-0' : 'right-0';
  const headerOrder = side === 'left' ? 'flex-row' : 'flex-row-reverse';

  // Swipe to Close Logic (Simple)
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);

    if (side === 'left') {
      if (deltaX < -50 && Math.abs(deltaX) > deltaY) onClose();
    } else {
      if (deltaX > 50 && Math.abs(deltaX) > deltaY) onClose();
    }
    touchStart.current = null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={`
          fixed top-0 bottom-0 w-80 bg-surface z-[100] shadow-2xl 
          transition-transform duration-300 ease-out border-r border-[var(--border-color)]
          ${positionClass} ${transformClass}
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col h-full p-6">

          {/* Header */}
          <div className={`flex items-center justify-between mb-10 ${headerOrder}`}>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="text-primary" />
              FlowRead
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {[
              { id: AppState.LIBRARY, label: 'Library', icon: Home },
              { id: AppState.BRAIN_BANK, label: 'Brain Bank', icon: Server },
              { id: AppState.PROFILE, label: 'Profile', icon: User },
              { id: AppState.STATS, label: 'Stats', icon: BarChart2 },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 font-medium ${currentPage === item.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                    : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.02]'
                  }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* New Settings Button */}
          <div className="mt-auto pt-6 border-t border-[var(--border-color)]">
            <button
              onClick={() => { onOpenSettings(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-medium"
            >
              <Settings size={20} />
              Settings & Preferences
            </button>

            <p className="text-center text-xs text-muted/40 mt-6 font-mono">v0.5.0 Beta</p>
          </div>

        </div>
      </div>
    </>
  );
};

export default Sidebar;