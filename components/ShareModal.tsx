import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Link as LinkIcon, Check, Share2 } from 'lucide-react';
import { Chunk, UserSettings } from '../types';

interface ShareModalProps {
    chunk: Chunk;
    bookId: string;
    bookTitle: string;
    onClose: () => void;
    currentTheme: UserSettings['theme'];
}

const ShareModal: React.FC<ShareModalProps> = ({ chunk, bookId, bookTitle, onClose, currentTheme }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // 1. Download as Image (for Instagram Stories)
    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
            const link = document.createElement('a');
            link.download = `flowread-story-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to generate image', err);
        } finally {
            setIsGenerating(false);
        }
    };

    // 2. Copy Link (using bookId for clean, robust deep linking)
    const handleCopyLink = () => {
        // Use bookId instead of title to avoid ugly filenames in URL
        const url = `${window.location.origin}/share?bookId=${bookId}&chunk=${chunk.index}`;
        navigator.clipboard.writeText(`"${chunk.text.substring(0, 50)}..." - ${url}`);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // Helper to get exact colors for the image generator (must be inline styles for html-to-image)
    const getThemeStyles = () => {
        switch (currentTheme) {
            case 'daylight':
                return {
                    bg: '#ffffff',
                    text: '#1e293b',
                    border: '#e2e8f0',
                    accent: '#3b82f6',
                    muted: '#64748b',
                    pillBg: '#f1f5f9',
                    pillText: '#334155',
                    decor1: '#3b82f6',
                    decor2: '#60a5fa'
                };
            case 'paper':
                return {
                    bg: '#efe6d5',
                    text: '#5c3d22',
                    border: '#dcc8a9',
                    accent: '#8b5e34',
                    muted: '#8b5e34',
                    pillBg: '#e6decb',
                    pillText: '#5c3d22',
                    decor1: '#d4a373',
                    decor2: '#8b5e34'
                };
            case 'midnight':
                return {
                    bg: '#0f172a',
                    text: '#f1f5f9',
                    border: '#1e293b',
                    accent: '#0ea5e9',
                    muted: '#94a3b8',
                    pillBg: '#1e293b',
                    pillText: '#e2e8f0',
                    decor1: '#0ea5e9',
                    decor2: '#38bdf8'
                };
            case 'textured':
                return {
                    bg: '#fdf6e3',
                    text: '#2d1e17',
                    border: '#e6d8c3',
                    accent: '#d97706',
                    muted: '#78350f',
                    pillBg: '#f5e6d0',
                    pillText: '#451a03',
                    decor1: '#d97706',
                    decor2: '#92400e'
                };
            case 'coffee':
                return {
                    bg: '#1a1612',
                    text: '#e5d9cc',
                    border: '#3d3229',
                    accent: '#d4a373',
                    muted: '#8e7d6f',
                    pillBg: '#28211a',
                    pillText: '#d4a373',
                    decor1: '#d4a373',
                    decor2: '#8e7d6f'
                };
            case 'slate':
            default:
                return {
                    bg: '#1e293b',
                    text: '#f8fafc',
                    border: '#334155',
                    accent: '#94a3b8',
                    muted: '#64748b',
                    pillBg: '#334155',
                    pillText: '#cbd5e1',
                    decor1: '#64748b',
                    decor2: '#475569'
                };
        }
    };

    const styles = getThemeStyles();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-surface border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
                    <h3 className="font-bold flex items-center gap-2">
                        <Share2 size={18} className="text-primary" />
                        Share Quote
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Preview Area (Scrollable for User) */}
                <div className="p-8 flex justify-center bg-dots-pattern relative overflow-auto">
                    <p className="absolute top-2 left-0 right-0 text-center text-[10px] text-muted opacity-50 uppercase tracking-widest">Preview</p>

                    {/* This is the Actual Card showing to the user (can scroll) */}
                    <div
                        className="w-[600px] p-12 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[350px] shrink-0"
                        style={{
                            fontFamily: '"Quicksand", sans-serif',
                            backgroundColor: styles.bg,
                            color: styles.text,
                            borderColor: styles.border,
                            borderWidth: '1px'
                        }}
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-[80px] rounded-full" style={{ backgroundColor: styles.decor1 }} />
                        <div className="absolute bottom-0 left-0 w-80 h-80 opacity-5 blur-[100px] rounded-full" style={{ backgroundColor: styles.decor2 }} />

                        {/* Text Texture Overlay */}
                        {currentTheme === 'textured' && (
                            <div
                                className="absolute inset-0 z-0 pointer-events-none"
                                style={{
                                    backgroundImage: "url('/paper-texture.jpg')",
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: '500px',
                                    mixBlendMode: 'multiply',
                                    opacity: 0.6
                                }}
                            />
                        )}

                        {/* Context Label */}
                        {/* Same logic as below... */}
                        <div
                            className="mb-6 px-6 py-2 rounded-full text-[14px] uppercase tracking-[0.2em] font-bold shadow-sm"
                            style={{
                                backgroundColor: styles.pillBg,
                                color: styles.pillText,
                                border: `1px solid ${styles.border}`
                            }}
                        >
                            {bookTitle.length > 50 ? bookTitle.substring(0, 50) + '...' : bookTitle}
                        </div>

                        {/* Quote Text */}
                        <div className="text-2xl leading-[1.6] font-medium text-center mb-8 relative z-10 px-8 italic">
                            "{chunk.text}"
                        </div>

                        {/* Footer */}
                        <div className="mt-auto flex flex-col items-center gap-3 w-full">
                            <div className="h-[1px] w-24 opacity-30 mb-2" style={{ backgroundColor: styles.muted }} />
                            <div className="flex items-center gap-2 opacity-70">
                                <span className="text-[12px] font-mono uppercase tracking-widest" style={{ color: styles.muted }}>Read on FlowRead</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GHOST CARD for Capture (Hidden, Full Size, No Scroll) */}
                <div className="fixed top-0 left-[-9999px] overflow-visible">
                    <div
                        ref={cardRef} // CAPTURE THIS ONE
                        className="w-[600px] p-12 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]"
                        style={{
                            fontFamily: '"Quicksand", sans-serif',
                            backgroundColor: styles.bg,
                            color: styles.text,
                            borderColor: styles.border,
                            borderWidth: '1px'
                            // scale: 2 // Potential HD boost if needed
                        }}
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-[80px] rounded-full" style={{ backgroundColor: styles.decor1 }} />
                        <div className="absolute bottom-0 left-0 w-80 h-80 opacity-5 blur-[100px] rounded-full" style={{ backgroundColor: styles.decor2 }} />

                        {/* Text Texture Overlay */}
                        {currentTheme === 'textured' && (
                            <div
                                className="absolute inset-0 z-0 pointer-events-none"
                                style={{
                                    backgroundImage: "url('/paper-texture.jpg')",
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: '500px',
                                    mixBlendMode: 'multiply',
                                    opacity: 0.6
                                }}
                            />
                        )}

                        {/* Context Label */}
                        <div
                            className="mb-6 px-6 py-2 rounded-full text-[14px] uppercase tracking-[0.2em] font-bold shadow-sm"
                            style={{
                                backgroundColor: styles.pillBg,
                                color: styles.pillText,
                                border: `1px solid ${styles.border}`
                            }}
                        >
                            {bookTitle.length > 50 ? bookTitle.substring(0, 50) + '...' : bookTitle}
                        </div>

                        {/* Quote Text */}
                        <div className="text-2xl leading-[1.6] font-medium text-center mb-8 relative z-10 px-8 italic">
                            "{chunk.text}"
                        </div>

                        {/* Footer */}
                        <div className="mt-auto flex flex-col items-center gap-3 w-full">
                            <div className="h-[1px] w-24 opacity-30 mb-2" style={{ backgroundColor: styles.muted }} />
                            <div className="flex items-center gap-2 opacity-70">
                                <span className="text-[12px] font-mono uppercase tracking-widest" style={{ color: styles.muted }}>Read on FlowRead</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-surface-accent flex gap-3">
                    <button
                        onClick={handleCopyLink}
                        className="flex-1 py-3 bg-surface border border-[var(--border-color)] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition"
                    >
                        {copiedLink ? <Check size={18} className="text-green-500" /> : <LinkIcon size={18} />}
                        Copy Link
                    </button>

                    <button
                        onClick={handleDownloadImage}
                        disabled={isGenerating}
                        className="flex-1 py-3 bg-primary text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download size={18} />
                        )}
                        Save Image
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ShareModal;
