import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthChanges } from "../services/authService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { User } from "firebase/auth";
import { logger } from "../utils/logger";

interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    createdAt: any;
    stats: {
        booksRead: number;
        totalChunksRead: number;
        currentStreak: number;
    };
}

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    isAuthenticated: boolean;
    loading: boolean;
    connectionStatus: 'connecting' | 'connected' | 'offline';
    updateUserProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    logger.info('AuthContext', 'AuthProvider initialized');

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

    useEffect(() => {
        let mounted = true;

        // Safety timeout: If Firebase doesn't respond within 800ms, show the app anyway
        const timeoutId = setTimeout(() => {
            if (mounted) {
                logger.warn('AuthContext', 'Auth initialization timed out after 800ms - UI proceeding');
                setConnectionStatus('offline');
                setLoading(false);
            }
        }, 800);

        // Listen for Firebase Auth changes (Login/Logout)
        const unsubscribe = subscribeToAuthChanges(async (user) => {
            if (!mounted) return;

            clearTimeout(timeoutId);
            setConnectionStatus('connected');
            logger.success('AuthContext', 'Firebase connected successfully');
            setCurrentUser(user);

            if (user) {
                // If logged in, fetch extra profile data from Firestore
                logger.info('AuthContext', 'Fetching user profile from Firestore', { uid: user.uid });
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data() as UserProfile);
                        logger.success('AuthContext', 'User profile loaded', { displayName: docSnap.data().displayName });
                    } else {
                        logger.warn('AuthContext', 'User profile not found in Firestore', { uid: user.uid });
                    }
                } catch (err) {
                    logger.error('AuthContext', 'Error fetching profile from Firestore', err);
                }
            } else {
                setUserProfile(null);
                logger.info('AuthContext', 'No user logged in, cleared userProfile');
            }

            setLoading(false);
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    const updateUserProfile = (updatedData: Partial<UserProfile>) => {
        setUserProfile(prev => prev ? { ...prev, ...updatedData } : null);
    };

    const value = {
        currentUser,
        userProfile,
        isAuthenticated: !!currentUser,
        loading,
        connectionStatus,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
