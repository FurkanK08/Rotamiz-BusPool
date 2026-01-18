import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
    userId: string;
    role: string;
    setAuth: (userId: string, role: string) => void;
    clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
    userId: '',
    role: '',
    setAuth: () => { },
    clearAuth: () => { },
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

    return (
        <AuthContext.Provider value={{ userId, role, setAuth, clearAuth }}>
            {children}
        </AuthContext.Provider>
    );
};
