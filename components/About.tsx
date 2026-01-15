import React from 'react';
import { ArrowLeft, Code, Zap, User } from 'lucide-react';

interface AboutProps {
    onBack: () => void;
}

const About: React.FC<AboutProps> = ({ onBack }) => {
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
                        <h1 className="text-2xl font-bold text-text">About</h1>
                        <p className="text-xs text-muted">Our mission and technology</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-12 max-w-4xl mx-auto space-y-12">
                {/* Logo Hero */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/logo2.svg"
                        alt="FlowRead Logo"
                        className="h-24 w-24"
                    />
                </div>

                {/* Mission */}
                <section>
                    <h2 className="text-3xl font-bold text-text mb-4 text-center">Our Mission</h2>
                    <p className="text-lg text-muted leading-relaxed">
                        FlowRead is on a mission to revolutionize digital reading. We believe that books
                        deserve better than endless scrolling and cluttered interfaces. By combining
                        cutting-edge AI with thoughtful design, we're creating a reading experience
                        that's immersive, intuitive, and genuinely enjoyable.
                    </p>
                </section>

                {/* How It Works */}
                <section>
                    <h2 className="text-3xl font-bold text-text mb-6">How It Works</h2>
                    <div className="space-y-6">
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-primary font-bold">1</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-text mb-1">Upload Your Book</h3>
                                <p className="text-muted text-sm">
                                    Simply upload a PDF and let FlowRead do the rest
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-primary font-bold">2</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-text mb-1">AI Processing</h3>
                                <p className="text-muted text-sm">
                                    Google Gemini AI analyzes your book, understanding chapters, scenes, and narrative structure
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-primary font-bold">3</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-text mb-1">Immersive Reading</h3>
                                <p className="text-muted text-sm">
                                    Read through beautifully designed cards, one focused moment at a time
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technology Stack */}
                <section>
                    <h2 className="text-3xl font-bold text-text mb-6">Technology Stack</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-surface border border-[var(--border-color)] rounded-xl p-4">
                            <Code size={24} className="text-blue-500 mb-2" />
                            <h3 className="font-semibold text-text mb-1">React + TypeScript</h3>
                            <p className="text-xs text-muted">Modern, type-safe frontend</p>
                        </div>

                        <div className="bg-surface border border-[var(--border-color)] rounded-xl p-4">
                            <Zap size={24} className="text-purple-500 mb-2" />
                            <h3 className="font-semibold text-text mb-1">Google Gemini AI</h3>
                            <p className="text-xs text-muted">Advanced language understanding</p>
                        </div>

                        <div className="bg-surface border border-[var(--border-color)] rounded-xl p-4">
                            <User size={24} className="text-emerald-500 mb-2" />
                            <h3 className="font-semibold text-text mb-1">IndexedDB</h3>
                            <p className="text-xs text-muted">Local-first data storage</p>
                        </div>
                    </div>
                </section>

                {/* Developer */}
                <section>
                    <h2 className="text-3xl font-bold text-text mb-4">Developer</h2>
                    <div className="bg-surface border border-[var(--border-color)] rounded-xl p-6">
                        <p className="text-lg text-text mb-2">
                            Built with passion by <span className="font-bold text-primary">Vanshdeep Singh</span>
                        </p>
                        <p className="text-sm text-muted">
                            FlowRead is a solo project dedicated to making digital reading better for everyone.
                            Open to feedback and continuously improving based on user experience.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default About;
