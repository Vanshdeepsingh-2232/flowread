import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { registerUser, loginUser, signInWithGoogle } from '../services/authService';
import { X } from 'lucide-react';
import { logger } from '../utils/logger';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const getFriendlyAuthError = (err: { code?: string; message?: string }) => {
    const currentHost = window.location.hostname;

    if (err.code === 'auth/wrong-password') return 'Incorrect password.';
    if (err.code === 'auth/user-not-found') return 'No account found with this email.';
    if (err.code === 'auth/email-already-in-use') return 'Email already in use.';
    if (err.code === 'auth/invalid-email') return 'Invalid email address.';
    if (err.code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    if (err.code === 'auth/popup-closed-by-user') return 'Sign-in cancelled.';
    if (err.code === 'auth/popup-blocked') return 'Pop-up blocked. Please allow pop-ups for this site.';
    if (err.code === 'auth/unauthorized-domain') {
        return `Google sign-in is not enabled for ${currentHost}. Add this domain in Firebase Console → Authentication → Settings → Authorized domains.`;
    }

    return `Error: ${err.code} - ${err.message}`;
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for signup
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await loginUser(email, password);
            } else {
                await registerUser(email, password, name);
            }
            // Reset state before closing to avoid unmount issues
            setLoading(false);
            setEmail('');
            setPassword('');
            setName('');
            onClose(); // Close modal on success
        } catch (err: any) {
            setLoading(false);
            setError(getFriendlyAuthError(err));
            logger.error('AuthModal', "Auth Error", err);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-6">
                <div
                    className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:max-h-[calc(100vh-3rem)] sm:p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted hover:text-primary transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Logo */}
                    <div className="mb-5 flex justify-center sm:mb-6">
                        <img
                            src="/logo2.svg"
                            alt="FlowRead"
                            className="h-16 w-16"
                        />
                    </div>

                    <h2 className="mb-2 text-center text-xl font-bold text-text sm:text-2xl">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="mb-5 text-center text-sm text-muted sm:mb-6">
                        {isLogin ? 'Sync your library across devices.' : 'Join FlowRead to save your progress.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-lg border border-[var(--border-color)] bg-background p-3 text-text outline-none transition-colors focus:border-primary"
                                    placeholder="Reader One"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-background p-3 text-text outline-none transition-colors focus:border-primary"
                                placeholder="hello@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-background p-3 text-text outline-none transition-colors focus:border-primary"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-primary py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                        <span className="text-xs text-muted">OR</span>
                        <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                    </div>

                    {/* Google Sign-In */}
                    <button
                        onClick={async () => {
                            setError('');
                            setLoading(true);
                            try {
                                await signInWithGoogle();
                            } catch (err: any) {
                                setError(getFriendlyAuthError(err));
                                logger.error('AuthModal', "Google Sign-In Error", err);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className="w-full rounded-lg border border-gray-300 bg-white py-3 font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                        <span className="flex items-center justify-center gap-3">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Continue with Google</span>
                        </span>
                    </button>

                    <div className="mt-5 text-center text-sm text-muted sm:mt-6">
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="font-medium text-primary hover:underline"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AuthModal;
