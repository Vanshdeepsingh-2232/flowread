import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { registerUser, loginUser, signInWithGoogle } from '../services/authService';
import { X } from 'lucide-react';
import { logger } from '../utils/logger';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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
            // Friendly error messages
            if (err.code === 'auth/wrong-password') setError('Incorrect password.');
            else if (err.code === 'auth/user-not-found') setError('No account found with this email.');
            else if (err.code === 'auth/email-already-in-use') setError('Email already in use.');
            else if (err.code === 'auth/invalid-email') setError('Invalid email address.');
            else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
            else setError(`Error: ${err.code} - ${err.message}`);
            logger.error('AuthModal', "Auth Error", err);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted hover:text-primary transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <img
                        src="/logo2.svg"
                        alt="FlowRead"
                        className="h-16 w-16"
                    />
                </div>

                <h2 className="text-2xl font-bold text-text mb-2 text-center">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-muted mb-6 text-sm text-center">
                    {isLogin ? 'Sync your library across devices.' : 'Join FlowRead to save your progress.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs text-muted mb-1 font-medium">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-background border border-[var(--border-color)] rounded-lg p-3 text-text focus:border-primary outline-none transition-colors"
                                placeholder="Reader One"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-muted mb-1 font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-[var(--border-color)] rounded-lg p-3 text-text focus:border-primary outline-none transition-colors"
                            placeholder="hello@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-muted mb-1 font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-[var(--border-color)] rounded-lg p-3 text-text focus:border-primary outline-none transition-colors"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                    <span className="text-xs text-muted">OR</span>
                    <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                </div>

                {/* Google Sign-In */}
                <button
                    onClick={async () => {
                        setError('');
                        setLoading(true);
                        try {
                            await signInWithGoogle();
                            onClose();
                        } catch (err: any) {
                            if (err.code === 'auth/popup-closed-by-user') setError('Sign-in cancelled.');
                            else if (err.code === 'auth/popup-blocked') setError('Pop-up blocked. Please allow pop-ups for this site.');
                            else setError(`Error: ${err.code} - ${err.message}`);
                            logger.error('AuthModal', "Google Sign-In Error", err);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 border border-gray-300"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <div className="mt-6 text-center text-sm text-muted">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-primary hover:underline font-medium"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AuthModal;
