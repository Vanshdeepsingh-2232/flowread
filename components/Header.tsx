import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { User as UserIcon, LogOut, Cloud, CloudOff, Menu } from 'lucide-react';
import AuthModal from './AuthModal';

interface HeaderProps {
    onNavigate: (page: 'features' | 'about') => void;
    onNavigateToProfile?: () => void;
    onOpenSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, onNavigateToProfile, onOpenSidebar }) => {
    const { currentUser, userProfile, connectionStatus } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Auto-close modal when logged in
    React.useEffect(() => {
        if (currentUser) {
            setShowAuthModal(false);
        }
    }, [currentUser]);

    return (
        <header className="w-full bg-surface/50 backdrop-blur-md border-b border-[var(--border-color)] py-4 px-6 z-50 sticky top-0">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Logo + Brand */}
                    <img
                        src="/logo2.svg"
                        alt="FlowRead Logo"
                        className="h-8 w-8"
                    />
                    <div>
                        <h1 className="text-xl font-bold text-text">FlowRead</h1>
                        <p className="hidden sm:block text-xs text-muted leading-tight">AI-powered immersive reading</p>
                    </div>

                    {/* Connection Status Indicator */}
                    {connectionStatus === 'connected' && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full ml-2" title="Cloud Connected">
                            <Cloud size={10} className="text-green-500" />
                            <span className="text-[9px] font-medium text-green-500">Cloud</span>
                        </div>
                    )}
                    {connectionStatus === 'offline' && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full ml-2" title="Offline Mode">
                            <CloudOff size={10} className="text-yellow-500" />
                            <span className="text-[9px] font-medium text-yellow-500">Offline</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm text-muted">
                        <button onClick={() => onNavigate('features')} className="hover:text-primary transition-colors">Features</button>
                        <button onClick={() => onNavigate('about')} className="hover:text-primary transition-colors">About</button>
                    </div>

                    {/* Auth Controls & Menu Toggle */}
                    <div className="flex items-center gap-2 pl-3 sm:pl-6 border-l border-[var(--border-color)]">
                        {onOpenSidebar && (
                            <button
                                onClick={onOpenSidebar}
                                className="p-2 hover:bg-primary/10 rounded-full transition-colors text-text border border-transparent hover:border-primary/20"
                                title="Open Menu"
                            >
                                <Menu size={20} />
                            </button>
                        )}

                        {currentUser ? (
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* User Info & Avatar */}
                                <button
                                    onClick={onNavigateToProfile}
                                    className="flex items-center gap-2 sm:gap-3 bg-surface border border-[var(--border-color)] rounded-full pl-1 pr-2 sm:pr-4 py-1 hover:border-primary/50 hover:bg-surface/80 transition-all cursor-pointer"
                                >
                                    {/* Avatar Circle */}
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                        {currentUser.photoURL ? (
                                            <img
                                                src={currentUser.photoURL}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-bold text-primary">
                                                {userProfile?.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : (currentUser.email?.[0].toUpperCase() || 'U')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Text Info */}
                                    <div className="text-left hidden sm:block leading-none">
                                        <p className="text-xs font-bold text-text mb-0.5">{userProfile?.displayName || "Reader"}</p>
                                        <p className="text-[9px] text-muted truncate max-w-[100px]">{currentUser.email}</p>
                                    </div>
                                </button>

                                <button
                                    onClick={logoutUser}
                                    className="p-2 bg-surface hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors border border-[var(--border-color)] hidden sm:flex"
                                    title="Logout"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                            >
                                <UserIcon size={16} />
                                <span className="hidden sm:inline">Sign In</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </header>
    );
};

export default Header;
