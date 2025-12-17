import React from 'react';
import { ArrowLeft, Sparkles, Brain, BookOpen, BarChart3, Heart, Palette } from 'lucide-react';

interface FeaturesProps {
    onBack: () => void;
}

const Features: React.FC<FeaturesProps> = ({ onBack }) => {
    const features = [
        {
            icon: <Brain size={28} className="text-purple-500" />,
            title: "AI-Powered Chunking",
            description: "Smart content segmentation using Google Gemini AI for optimal reading flow"
        },
        {
            icon: <BookOpen size={28} className="text-blue-500" />,
            title: "Semantic Reading",
            description: "Context-aware organization that understands chapter structure and narrative flow"
        },
        {
            icon: <Sparkles size={28} className="text-amber-500" />,
            title: "Immersive Cards",
            description: "Distraction-free card-based interface that keeps you in the reading zone"
        },
        {
            icon: <BarChart3 size={28} className="text-emerald-500" />,
            title: "Reading Analytics",
            description: "Track your progress, maintain streaks, and visualize your reading journey"
        },
        {
            icon: <Heart size={28} className="text-pink-500" />,
            title: "Brain Bank",
            description: "Save and organize your favorite passages and insights in one place"
        },
        {
            icon: <Palette size={28} className="text-indigo-500" />,
            title: "Customizable Themes",
            description: "Choose from multiple reading modes: Midnight, Slate, Paper, and Daylight"
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center gap-4 max-w-6xl mx-auto">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-text" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Features</h1>
                        <p className="text-xs text-muted">Transform your reading experience</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-12 max-w-6xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-text mb-4">
                        Reading, Reimagined
                    </h2>
                    <p className="text-lg text-muted max-w-2xl mx-auto">
                        FlowRead combines artificial intelligence with thoughtful design to create
                        an immersive reading experience that helps you focus, retain, and enjoy your books.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-surface border border-[var(--border-color)] rounded-2xl p-6 hover:border-primary/50 transition-all hover:shadow-lg"
                        >
                            <div className="mb-4">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-bold text-text mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-muted leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <button
                        onClick={onBack}
                        className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg"
                    >
                        Start Reading
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Features;
