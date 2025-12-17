import React from 'react';

interface HeaderProps {
    onNavigate: (page: 'features' | 'about') => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    return (
        <header className="w-full bg-surface/50 backdrop-blur-md border-b border-[var(--border-color)] py-4 px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-text">FlowRead</h1>
                        <p className="text-xs text-muted">AI-powered immersive reading</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-6 text-sm text-muted">
                    <button onClick={() => onNavigate('features')} className="hover:text-primary transition-colors">Features</button>
                    <button onClick={() => onNavigate('about')} className="hover:text-primary transition-colors">About</button>
                </div>
            </div>
        </header>
    );
};

export default Header;
