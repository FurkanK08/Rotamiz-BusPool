import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Fixed path
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

// Define Notification Type
interface Notification {
    _id: string;
    title: string;
    body: string;
    type: 'INFO' | 'ALERT' | 'INTERACTIVE';
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export const NotificationsScreen = ({ navigation }: any) => {
    const { userId } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await api.notifications.getAll(userId);
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [userId]);

    const handleNotificationPress = async (item: Notification) => {
        if (!item.isRead) {
            try {
                await api.notifications.markAsRead(item._id);
                // Update local state to reflect read status
                setNotifications(prev =>
                    prev.map(n => n._id === item._id ? { ...n, isRead: true } : n)
                );
            } catch (error) {
                console.error('Failed to mark read', error);
            }
        }

        // Handle Deep Linking / Actions based on 'type'
        if (item.type === 'INTERACTIVE') {
            // TODO: Show action sheet or navigate
            alert(`Action required: ${item.title}`);
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[styles.itemUrl, !item.isRead && styles.unreadItem]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.iconContainer}>
                <Ionicons
                    name={item.type === 'ALERT' ? 'warning' : 'notifications'}
                    size={24}
                    color={item.type === 'ALERT' ? COLORS.error : COLORS.primary}
                />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchNotifications} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>Henüz bildirim yok</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    itemUrl: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: '#e6f7ff', // Light blue highlight
    },
    iconContainer: {
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 4,
        fontSize: 16,
    },
    body: {
        color: '#666',
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        color: '#999',
        fontSize: 16,
    }
});
