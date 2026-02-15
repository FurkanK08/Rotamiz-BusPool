import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenService } from '../services/api';

interface AuthContextType {
    userId: string;
    role: string;
    isLoading: boolean;
    setAuth: (userId: string, role: string) => void;
    clearAuth: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    userId: '',
    role: '',
    isLoading: true,
    setAuth: () => { },
    clearAuth: () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from AsyncStorage on app start
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const token = await tokenService.getToken();
                const user = await tokenService.getUser();

                if (token && user && user._id && user.role) {
                    setUserId(user._id);
                    setRole(user.role);
                    console.log('[AuthContext] Session restored for user:', user._id);
                } else {
                    console.log('[AuthContext] No valid session found');
                }
            } catch (error) {
                console.error('[AuthContext] Failed to restore session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

    const setAuth = (newUserId: string, newRole: string) => {
        setUserId(newUserId);
        setRole(newRole);
    };

    const clearAuth = () => {
        setUserId('');
        setRole('');
    };

    const logout = async () => {
        await tokenService.clearAll();
        clearAuth();
    };

    return (
        <AuthContext.Provider value={{ userId, role, isLoading, setAuth, clearAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
