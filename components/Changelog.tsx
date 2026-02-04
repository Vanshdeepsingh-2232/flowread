import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import changelogText from '../CHANGELOG.md?raw';

interface ChangelogProps {
    onBack: () => void;
}

const Changelog: React.FC<ChangelogProps> = ({ onBack }) => {
    const [markdown, setMarkdown] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Vite's ?raw import gives us the string directly
        setMarkdown(changelogText);
        setLoading(false);
    }, []);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center gap-4 max-w-4xl mx-auto">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-text" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Changelog</h1>
                        <p className="text-xs text-muted">Recent updates and improvements</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-12 max-w-4xl mx-auto">
                <div className="bg-surface border border-[var(--border-color)] rounded-2xl p-6 md:p-10 shadow-lg">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <p className="text-muted italic">Gathering history...</p>
                        </div>
                    ) : (
                        <div className="prose prose-slate dark:prose-invert max-w-none 
                            prose-headings:text-text prose-p:text-muted prose-li:text-muted
                            prose-h1:text-3xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-primary
                            prose-a:text-primary hover:prose-a:underline
                            prose-strong:text-text prose-code:text-primary
                        ">
                            <ReactMarkdown>{markdown}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Changelog;
