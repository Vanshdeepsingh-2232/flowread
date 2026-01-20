import React, { useState } from 'react';
import { ArrowLeft, Globe, ArrowRight, Loader } from 'lucide-react';

interface WebReaderInputProps {
    onBack: () => void;
    onSubmit: (url: string) => void;
    processing: boolean;
}

const WebReaderInput: React.FC<WebReaderInputProps> = ({ onBack, onSubmit, processing }) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        try {
            new URL(url); // Simple validation
            onSubmit(url);
        } catch (e) {
            setError('Please enter a valid URL (include http:// or https://)');
        }
    };

    return (
        <div className="min-h-screen bg-background text-text flex flex-col pt-20 px-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="max-w-2xl mx-auto w-full mb-12">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-6"
                >
                    <ArrowLeft size={16} /> Back to Library
                </button>
                <h1 className="text-3xl font-bold mb-2">Read from Web</h1>
                <p className="text-muted">Paste an article URL below to read it in FlowRead.</p>
            </div>

            {/* Input Card */}
            <div className="max-w-2xl mx-auto w-full bg-surface border border-[var(--border-color)] rounded-2xl p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Article URL</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Globe size={18} className="text-muted" />
                            </div>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://medium.com/..."
                                className="w-full pl-11 pr-4 py-4 bg-background border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                autoFocus
                                disabled={processing}
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs mt-2 pl-1 animate-in slide-in-from-left-2">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !url}
                        className={`
                            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                            ${processing || !url
                                ? 'bg-slate-200 dark:bg-slate-800 text-muted cursor-not-allowed'
                                : 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20 hover:scale-[1.02]'}
                        `}
                    >
                        {processing ? (
                            <>
                                <Loader size={18} className="animate-spin" /> Extracting content...
                            </>
                        ) : (
                            <>
                                Read Article <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Tips */}
                <div className="mt-8 pt-8 border-t border-[var(--border-color)] text-sm text-muted">
                    <h3 className="font-semibold mb-2 text-text">Works best with:</h3>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Long-form articles and blog posts</li>
                        <li>News websites and essays</li>
                        <li>Substack, Medium, and technical documentation</li>
                    </ul>
                    <p className="mt-4 text-[10px] opacity-70">
                        Note: Does not bypass paywalls. Some websites may be blocked by security policies.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WebReaderInput;
