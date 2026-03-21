import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithRedirect,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { logger } from "../utils/logger";

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
        await ensureUserProfile({ ...user, displayName: displayName || user.displayName } as User);
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
export const signInWithGoogle = async (): Promise<void> => {
    logger.info('AuthService', 'Google sign-in initiated');

    try {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
    } catch (error: any) {
        logger.error('AuthService', 'Google sign-in failed', {
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
                logger.error('AuthService', 'Failed to ensure user profile after auth change', error);
            }
        } else {
            logger.info('AuthService', 'Auth state changed: User logged out');
        }
        callback(user);
    });
};
