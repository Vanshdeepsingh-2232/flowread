import React from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

interface OfflineViewProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  message?: string;
  title?: string;
  offlineAvailableFeatures?: string[];
  onlineRequiredFeatures?: string[];
}

const OfflineView: React.FC<OfflineViewProps> = ({ 
  onRetry, 
  onGoHome, 
  title = "Connection Lost", 
  message = "You're offline, but local reading still works. Internet is only required for cloud and processing features.",
  offlineAvailableFeatures = [
    'Open the app shell',
    'Browse your local library',
    'Read already processed books',
    'View saved highlights in Brain Bank',
    'Use saved visual settings'
  ],
  onlineRequiredFeatures = [
    'Sign in / sign up',
    'Cloud sync and remote uploads',
    'Semantic chunking and analysis',
    'Web article fetching'
  ]
}) => {
  return (
    <div className="fixed inset-0 z-100 bg-background flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon with animated pulses */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping duration-3000" />
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse duration-2000 scale-150" />
          <div className="relative bg-surface p-8 rounded-full shadow-2xl border border-white/5">
            <WifiOff size={64} className="text-primary" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-4xl font-serif font-bold text-text tracking-tight">
            {title}
          </h1>
          <p className="text-muted leading-relaxed">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="bg-surface/70 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-400 font-bold mb-2">Works Offline</p>
            <ul className="space-y-1.5">
              {offlineAvailableFeatures.map((item) => (
                <li key={item} className="text-xs text-muted">• {item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-surface/70 border border-amber-500/20 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-400 font-bold mb-2">Needs Internet</p>
            <ul className="space-y-1.5">
              {onlineRequiredFeatures.map((item) => (
                <li key={item} className="text-xs text-muted">• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-8 py-3 bg-primary text-slate-900 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              Try Reconnecting
            </button>
          )}
          
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-8 py-3 bg-surface border border-white/10 text-text rounded-full font-bold shadow-md hover:bg-surface/80 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Home size={18} />
              Back to Library
            </button>
          )}
        </div>

        {/* Support Text */}
        <p className="text-[10px] text-muted/50 uppercase tracking-[0.2em] font-mono">
          Chunking services require a cloud connection
        </p>
      </div>
    </div>
  );
};

export default OfflineView;
