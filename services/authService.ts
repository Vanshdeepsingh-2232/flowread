import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { logger } from "../utils/logger";
import { isPermissionDeniedError } from "../utils/firebaseErrors";

const GOOGLE_REDIRECT_PENDING_KEY = 'flowread-google-redirect-pending';

const isIosStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isStandaloneDisplayMode = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: minimal-ui)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches;
};

const shouldUseRedirectForGoogleSignIn = () => {
    if (typeof window === 'undefined') return false;

    const isStandalone = isStandaloneDisplayMode() || isIosStandalone();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    return isStandalone || isMobile;
};

const markGoogleRedirectPending = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
};

const clearGoogleRedirectPending = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
};

export const isGoogleRedirectPending = () => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1';
};

const ensureUserProfile = async (user: User) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        logger.info('AuthService', 'Creating missing user profile in Firestore', { uid: user.uid });
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Reader",
            createdAt: new Date(),
            stats: {
                booksRead: 0,
                totalChunksRead: 0,
                currentStreak: 0
            }
        });
        logger.success('AuthService', 'User profile created in Firestore', { uid: user.uid });
    }
};

// 1. Sign Up & Create User Profile
export const registerUser = async (email: string, password: string, displayName: string): Promise<User> => {
    logger.info('AuthService', `Registration attempt for email: ${email}`);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        logger.success('AuthService', `User created successfully`, { uid: user.uid, email });

        // Create the user document in Firestore immediately
        logger.info('AuthService', 'Creating user profile in Firestore');

        try {
            await ensureUserProfile({ ...user, displayName: displayName || user.displayName } as User);
        } catch (error: any) {
            if (isPermissionDeniedError(error)) {
                logger.warn('AuthService', 'User created but profile sync was skipped because Firestore permissions were unavailable', {
                    code: error.code,
                    message: error.message
                });
                return user;
            }

            throw error;
        }

        return user;
    } catch (error: any) {
        logger.error('AuthService', 'Registration failed', {
            code: error.code,
            message: error.message,
            email
        });
        throw error;
    }
};

// 2. Login
export const loginUser = (email: string, password: string) => {
    logger.info('AuthService', `Login attempt for email: ${email}`);

    return signInWithEmailAndPassword(auth, email, password)
        .then(result => {
            logger.success('AuthService', 'Login successful', { uid: result.user.uid, email });
            return result;
        })
        .catch(error => {
            logger.error('AuthService', 'Login failed', { code: error.code, message: error.message, email });
            throw error;
        });
};

// 3. Google Sign-In
export const signInWithGoogle = async (): Promise<User | void> => {
    logger.info('AuthService', 'Google sign-in initiated');

    try {
        const provider = new GoogleAuthProvider();

        if (shouldUseRedirectForGoogleSignIn()) {
            markGoogleRedirectPending();
            logger.info('AuthService', 'Using redirect-based Google sign-in for mobile/PWA context');
            await signInWithRedirect(auth, provider);
            return;
        }

        const userCredential = await signInWithPopup(auth, provider);

        try {
            await ensureUserProfile(userCredential.user);
        } catch (error: any) {
            if (isPermissionDeniedError(error)) {
                logger.warn('AuthService', 'Google sign-in succeeded, but profile sync was skipped because Firestore permissions were unavailable', {
                    code: error.code,
                    message: error.message
                });
            } else {
                throw error;
            }
        }

        logger.success('AuthService', 'Google sign-in successful', { uid: userCredential.user.uid, email: userCredential.user.email });
        return userCredential.user;
    } catch (error: any) {
        if (error?.code === 'auth/popup-blocked') {
            logger.warn('AuthService', 'Google popup blocked, retrying with redirect');
            const provider = new GoogleAuthProvider();
            markGoogleRedirectPending();
            await signInWithRedirect(auth, provider);
            return;
        }

        logger.error('AuthService', 'Google sign-in failed', {
            code: error.code,
            message: error.message
        });
        throw error;
    }
};

export const completeGoogleRedirectSignIn = async (): Promise<User | null> => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const result = await getRedirectResult(auth);

        if (!result) {
            if (isGoogleRedirectPending()) {
                logger.info('AuthService', 'Google redirect returned without a result; waiting for auth state listener');
            }
            return null;
        }

        logger.success('AuthService', 'Google redirect sign-in completed', {
            uid: result.user.uid,
            email: result.user.email
        });

        try {
            await ensureUserProfile(result.user);
        } catch (error: any) {
            if (isPermissionDeniedError(error)) {
                logger.warn('AuthService', 'Google redirect sign-in succeeded, but profile sync was skipped because Firestore permissions were unavailable', {
                    code: error.code,
                    message: error.message
                });
            } else {
                throw error;
            }
        }

        clearGoogleRedirectPending();
        return result.user;
    } catch (error: any) {
        clearGoogleRedirectPending();
        logger.error('AuthService', 'Google redirect sign-in failed', {
            code: error.code,
            message: error.message
        });
        throw error;
    }
};

// 4. Logout
export const logoutUser = () => {
    logger.info('AuthService', 'Logout initiated');

    return signOut(auth)
        .then(() => {
            logger.success('AuthService', 'Logout successful');
        })
        .catch(error => {
            logger.error('AuthService', 'Logout failed', error);
            throw error;
        });
};

// 5. Auth Listener (Use this in App.jsx to detect login state)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    logger.info('AuthService', 'Subscribing to auth state changes');

    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            logger.info('AuthService', 'Auth state changed: User logged in', { uid: user.uid, email: user.email });
            try {
                await ensureUserProfile(user);
            } catch (error) {
                if (isPermissionDeniedError(error)) {
                    logger.warn('AuthService', 'Skipped profile sync after auth change because Firestore permissions were unavailable', error);
                } else {
                    logger.error('AuthService', 'Failed to ensure user profile after auth change', error);
                }
            }
        } else {
            logger.info('AuthService', 'Auth state changed: User logged out');
        }
        callback(user);
    });
};
