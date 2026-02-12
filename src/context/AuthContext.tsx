import React, { createContext, useContext, useState, ReactNode } from 'react';
import { tokenService } from '../services/api';

interface AuthContextType {
    userId: string;
    role: string;
    setAuth: (userId: string, role: string) => void;
    clearAuth: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    userId: '',
    role: '',
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
        <AuthContext.Provider value={{ userId, role, setAuth, clearAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
