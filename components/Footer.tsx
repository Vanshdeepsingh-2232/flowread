import React from 'react';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-surface border-t border-[var(--border-color)] py-4 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted">
                <div className="flex items-center gap-1">
                    <span>Made with</span>
                    <Heart size={10} className="text-red-500 fill-red-500" />
                    <span>by <span className="font-semibold text-primary">Vanshdeep Singh</span></span>
                </div>

                <div className="text-center">
                    <p>© {currentYear} FlowRead. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
