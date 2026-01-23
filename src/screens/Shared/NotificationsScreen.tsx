import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { InteractiveNotification } from '../../components/NotificationTypes/InteractiveNotification';
import { LocationNotification } from '../../components/NotificationTypes/LocationNotification';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '../../navigation';
import { useNotifications } from '../../context/NotificationContext';

// Define Notification Type
interface Notification {
    _id: string;
    title: string;
    body: string;
    type: 'INFO' | 'ALERT' | 'PASSENGER_ABSENCE_REQUEST' | 'DRIVER_LOCATION_STARTED' | 'PASSENGER_LOCATION_SHARED' | 'INTERACTIVE';
    isRead: boolean;
    response?: string | null;
    createdAt: string;
    data?: any;
}

export const NotificationsScreen = ({ navigation }: any) => {
    const { userId } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const { refreshUnreadCount } = useNotifications();

    // Header Actions
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={handleMarkAllRead}
                        style={{ marginRight: 16 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="checkmark-done-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleDeleteAll}
                        style={{ marginRight: 16 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('NotificationSettings')}
                        style={{ marginRight: 16 }}
                    >
                        <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, userId, notifications]);

    // Real-time listener for new notifications
    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log("New notification received while in screen, refreshing...");
            fetchNotifications();
            refreshUnreadCount();
        });
        return () => subscription.remove();
    }, [userId]);

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

    const handleMarkAllRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
            if (unreadIds.length === 0) {
                Alert.alert("Bilgi", "Okunmamış bildirim yok.");
                return;
            }

            await Promise.all(unreadIds.map(id => api.notifications.markAsRead(id)));

            Alert.alert("Başarılı", "Tüm bildirimler okundu olarak işaretlendi.");
            fetchNotifications();
            refreshUnreadCount();
        } catch (e) {
            console.error(e);
            Alert.alert("Hata", "İşlem sırasında bir hata oluştu.");
        }
    };

    const handleDeleteAll = async () => {
        if (notifications.length === 0) return;

        Alert.alert(
            "Tümünü Sil",
            "Tüm bildirimleri silmek istediğinize emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil", style: "destructive", onPress: async () => {
                        try {
                            const ids = notifications.map(n => n._id);
                            await Promise.all(ids.map(id => api.notifications.delete(id)));
                            setNotifications([]); // Clear local immediately
                            Alert.alert("Başarılı", "Bildirimler temizlendi.");
                            refreshUnreadCount();
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Hata", "Silme işleminde hata oluştu.");
                            fetchNotifications(); // Revert/Refresh
                        }
                    }
                }
            ]
        );
    };

    const handleNotificationPress = async (item: Notification) => {
        if (!item.isRead) {
            try {
                await api.notifications.markAsRead(item._id);
                setNotifications(prev =>
                    prev.map(n => n._id === item._id ? { ...n, isRead: true } : n)
                );
                refreshUnreadCount();
            } catch (error) {
                console.error('Failed to mark read', error);
            }
        }

        // Navigation Logic based on Type
        if (item.type === 'DRIVER_LOCATION_STARTED' || item.type === 'PASSENGER_LOCATION_SHARED') {
            const serviceId = item.data?.serviceId;
            if (serviceId) {
                navigation.navigate('PassengerTracking', { serviceId });
            } else {
                Alert.alert("Hata", "Servis bilgisi bulunamadı.");
            }
        }
    };

    const handleResponse = async (item: Notification, responseValue: string) => {
        try {
            await api.notifications.respond(item._id, responseValue);
            setNotifications(prev =>
                prev.map(n => n._id === item._id ? { ...n, response: responseValue, isRead: true } : n)
            );
            refreshUnreadCount(); // Just in case responding marks as read backend side (usually it does)
            Alert.alert("Cevap Kaydedildi", `Cevabınız: ${responseValue}`);
        } catch (error) {
            Alert.alert("Hata", "Cevap gönderilemedi");
        }
    };

    const renderActionButtons = (item: Notification) => {
        switch (item.type) {
            case 'PASSENGER_ABSENCE_REQUEST':
            case 'INTERACTIVE':
                return (
                    <InteractiveNotification
                        notification={item}
                        onRespond={(val) => handleResponse(item, val)}
                    />
                );
            case 'DRIVER_LOCATION_STARTED':
            case 'PASSENGER_LOCATION_SHARED':
                return (
                    <LocationNotification
                        notification={item}
                        onPress={() => handleNotificationPress(item)}
                    />
                );
            default:
                return null;
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[
                styles.itemUrl,
                !item.isRead && styles.unreadItem,
                item.response && styles.respondedItem
            ]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.9}
        >
            <View style={styles.row}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={
                            item.type === 'ALERT' ? 'warning' :
                                item.type === 'DRIVER_LOCATION_STARTED' ? 'navigate' :
                                    'notifications'
                        }
                        size={24}
                        color={item.type === 'ALERT' ? COLORS.error : COLORS.primary}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.body}>{item.body}</Text>
                    <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>

                    {/* Render Actions underneath body */}
                    {renderActionButtons(item)}
                </View>
                {!item.isRead && <View style={styles.dot} />}
            </View>
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
                contentContainerStyle={{ paddingBottom: 20 }}
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
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    row: {
        flexDirection: 'row',
    },
    unreadItem: {
        backgroundColor: '#e6f7ff', // Light blue highlight
    },
    respondedItem: {
        backgroundColor: '#f9f9f9', // Slightly grayed out
    },
    iconContainer: {
        marginRight: 16,
        marginTop: 4,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 16,
        color: COLORS.text,
        flex: 1,
    },
    body: {
        color: '#666',
        marginBottom: 8,
        fontSize: 14,
    },
    time: {
        fontSize: 11,
        color: '#999',
        marginBottom: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        marginLeft: 8,
        marginTop: 6,
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
