import React, { useState } from 'react';
import { X, Moon, Sun, Type, Smartphone, HardDrive, Download, Trash2, Eye, EyeOff, Minus, Plus, Globe, ArrowRight } from 'lucide-react';
import { UserSettings, Theme, FontFamily, ScrollMode, DensityMode, ProgressBarStyle } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    onUpdateSettings: (newSettings: UserSettings) => void;
    onClearCache: () => void;
    onExportHighlights: () => void;
    storageUsedMB: number;
    onTriggerWebReader?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, settings, onUpdateSettings, onClearCache, onExportHighlights, storageUsedMB, onTriggerWebReader
}) => {
    if (!isOpen) return null;

    const update = (key: keyof UserSettings, value: any) => {
        onUpdateSettings({ ...settings, [key]: value });
    };

    const themes: { id: Theme; label: string; color: string }[] = [
        { id: 'midnight', label: 'Midnight', color: 'bg-[#020617]' },
        { id: 'slate', label: 'Slate', color: 'bg-[#1a1c1e]' },
        { id: 'paper', label: 'Paper', color: 'bg-[#fdfbf7]' },
        { id: 'daylight', label: 'Daylight', color: 'bg-[#ffffff]' },
        { id: 'coffee', label: 'Coffee', color: 'bg-[#1a1612]' },
        { id: 'textured', label: 'Textured', color: 'bg-[#f4e4d4]' },
    ];

    const fonts: { id: FontFamily; label: string }[] = [
        { id: 'quicksand', label: 'Quicksand' },
        { id: 'sans', label: 'Modern Sans' },
        { id: 'serif', label: 'Classic Serif' },
        { id: 'dyslexic', label: 'Dyslexic' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-md bg-surface h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="sticky top-0 bg-surface/90 backdrop-blur z-10 p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <SettingsIcon className="text-primary" /> Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-8 pb-20">

                    {/* 1. Visual Experience */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Visual Experience</h3>

                        <div className="space-y-6">
                            {/* Theme */}
                            <div>
                                <label className="text-sm font-semibold block mb-3">Theme</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {themes.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => update('theme', t.id)}
                                            className={`
                        h-16 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all
                        ${settings.theme === t.id ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}
                      `}
                                            title={t.label}
                                        >
                                            <div className={`w-6 h-6 rounded-full border border-black/10 shadow-sm ${t.color}`} />
                                            <span className="text-[10px] font-medium">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Family */}
                            <div>
                                <label className="text-sm font-semibold block mb-3">Font Family</label>
                                <div className="flex bg-surface/50 p-1 rounded-xl border border-[var(--border-color)]">
                                    {fonts.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => update('fontFamily', f.id)}
                                            className={`
                        flex-1 py-2 rounded-lg text-sm font-medium transition-all
                        ${settings.fontFamily === f.id ? 'bg-primary text-white shadow' : 'text-muted hover:text-text'}
                      `}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Text Size */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-semibold">Text Size</label>
                                    <span className="text-xs text-muted bg-surface/50 px-2 py-0.5 rounded border border-[var(--border-color)]">Level {settings.textSize}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs">Aa</span>
                                    <input
                                        type="range" min="1" max="5" step="1"
                                        value={settings.textSize}
                                        onChange={(e) => update('textSize', Number(e.target.value))}
                                        className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <span className="text-xl">Aa</span>
                                </div>
                            </div>

                            {/* Bold Text Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Bold Text</span>
                                <Toggle
                                    checked={settings.isBold}
                                    onChange={(checked) => update('isBold', checked)}
                                />
                            </div>
                        </div>
                    </section>

                    <hr className="border-[var(--border-color)]" />

                    {/* 2. Reading Flow */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Reading Flow</h3>

                        <div className="space-y-6">
                            {/* Density Mode */}
                            <div>
                                <label className="text-sm font-semibold block mb-3">Chunk Density</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['focus', 'standard', 'dense'] as DensityMode[]).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => update('density', mode)}
                                            className={`
                          py-3 px-2 rounded-xl text-xs font-bold border transition-all capitalize
                          ${settings.density === mode
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-surface border-[var(--border-color)] text-muted hover:border-slate-400'}
                        `}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted mt-2">
                                    {settings.density === 'focus' && "Large text, fewer sentences per card."}
                                    {settings.density === 'standard' && "Balanced readability."}
                                    {settings.density === 'dense' && "More content per card."}
                                </p>
                            </div>

                            {/* Scroll Direction */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Scroll Direction</span>
                                <div className="flex bg-surface/50 p-1 rounded-lg border border-[var(--border-color)]">
                                    {(['vertical', 'horizontal'] as ScrollMode[]).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => update('scrollMode', mode)}
                                            className={`px-3 py-1 rounded text-xs font-bold capitalize transition ${settings.scrollMode === mode ? 'bg-white shadow text-black' : 'text-muted'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-[var(--border-color)]" />

                    {/* 3. Interface & HUD */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Interface & HUD</h3>

                        <div className="space-y-4">
                            {/* Progress Bar */}
                            <div>
                                <label className="text-sm font-semibold block mb-2">Progress Bar Style</label>
                                <select
                                    value={settings.progressBarStyle}
                                    onChange={(e) => update('progressBarStyle', e.target.value)}
                                    className="w-full bg-surface border border-[var(--border-color)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                                >
                                    <option value="segmented">Segmented Bar (Smart)</option>
                                    <option value="minimal">Minimal Line</option>
                                    <option value="hidden">Hidden</option>
                                </select>
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Smartphone size={16} className="text-muted" />
                                    <span className="text-sm font-medium">Haptics</span>
                                </div>
                                <Toggle
                                    checked={settings.hapticsEnabled}
                                    onChange={(checked) => update('hapticsEnabled', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye size={16} className="text-muted" />
                                    <span className="text-sm font-medium">Show Context Tags</span>
                                </div>
                                <Toggle
                                    checked={settings.showContextTags}
                                    onChange={(checked) => update('showContextTags', checked)}
                                />
                            </div>
                        </div>
                    </section>

                    <hr className="border-[var(--border-color)]" />

                    {/* 4. Data & Storage */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Data & Storage</h3>

                        <div className="bg-surface border border-[var(--border-color)] rounded-2xl p-4 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold flex items-center gap-2"><HardDrive size={14} /> Storage Usage</span>
                                    <span className="text-xs font-mono text-muted">{storageUsedMB.toFixed(1)} MB</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[20%]" />
                                    {/* Fake % for now, real calculation would be better */}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={onExportHighlights}
                                    className="flex items-center justify-center gap-2 py-2 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border-color)] rounded-xl text-xs font-bold transition"
                                >
                                    <Download size={14} /> Export Data
                                </button>
                                <button
                                    onClick={onClearCache}
                                    className="flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition"
                                >
                                    <Trash2 size={14} /> Clear Cache
                                </button>
                            </div>
                        </div>
                    </section>

                    <hr className="border-[var(--border-color)]" />

                    {/* 5. New Features */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">New Features</h3>
                        <button
                            onClick={() => {
                                onClose();
                                if (onTriggerWebReader) {
                                    onTriggerWebReader();
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 rounded-xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
                                    <Globe size={18} />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-sm">Article Mode</h4>
                                    <p className="text-[10px] text-muted">Read web articles distraction-free</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-muted group-hover:text-indigo-500 transition-colors" />
                        </button>
                    </section>

                    <hr className="border-[var(--border-color)]" />

                    {/* 6. Developer Options */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Developer</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold">Debug Mode</span>
                                    <p className="text-[10px] text-muted">Enable text selection & analysis tools</p>
                                </div>
                                <Toggle
                                    checked={settings.debugMode}
                                    onChange={(checked) => update('debugMode', checked)}
                                />
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

// Simple Toggle Component
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

// Simple Settings Icon
const SettingsIcon = ({ className, size = 24 }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className}
    >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
)

export default SettingsModal;
