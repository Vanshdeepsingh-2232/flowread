import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { logger } from "../utils/logger";

// 1. Sign Up & Create User Profile
export const registerUser = async (email: string, password: string, displayName: string): Promise<User> => {
    logger.info('AuthService', `Registration attempt for email: ${email}`);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        logger.success('AuthService', `User created successfully`, { uid: user.uid, email });

        // Create the user document in Firestore immediately
        logger.info('AuthService', 'Creating user profile in Firestore');
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: displayName || "Reader",
            createdAt: new Date(),
            stats: {
                booksRead: 0,
                totalChunksRead: 0,
                currentStreak: 0
            }
        });

        logger.success('AuthService', 'User profile created in Firestore', { uid: user.uid });
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
export const signInWithGoogle = async (): Promise<User> => {
    logger.info('AuthService', 'Google sign-in initiated');

    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        logger.success('AuthService', 'Google sign-in successful', { uid: user.uid, email: user.email });

        // Check if user profile exists, if not create it (for first-time Google users)
        const { doc: docFunc, getDoc, setDoc: setDocFunc } = await import("firebase/firestore");
        const userDocRef = docFunc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            logger.info('AuthService', 'First-time Google user, creating profile');

            // First-time Google sign-in, create profile
            await setDocFunc(userDocRef, {
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

            logger.success('AuthService', 'Google user profile created', { uid: user.uid });
        } else {
            logger.info('AuthService', 'Returning Google user, profile exists');
        }

        return user;
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

    return onAuthStateChanged(auth, (user) => {
        if (user) {
            logger.info('AuthService', 'Auth state changed: User logged in', { uid: user.uid, email: user.email });
        } else {
            logger.info('AuthService', 'Auth state changed: User logged out');
        }
        callback(user);
    });
};
