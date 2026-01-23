import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const { userId } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = async () => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }

        try {
            // Optimization: Ideally backend should have a /count endpoint.
            // For now we fetch all and filter. 
            // TODO: Refactor to api.notifications.getUnreadCount(userId) in future.
            const allNotifications = await api.notifications.getAll(userId);
            const count = allNotifications.filter((n: any) => !n.isRead).length;
            setUnreadCount(count);
        } catch (error) {
            console.error('Error refreshing notification count:', error);
        }
    };

    // Initial load and sync with userId changes
    useEffect(() => {
        refreshUnreadCount();
    }, [userId]);

    // real-time listener to increment count or refresh
    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(() => {
            refreshUnreadCount();
        });
        return () => subscription.remove();
    }, [userId]); // Re-bind if userId changes

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
