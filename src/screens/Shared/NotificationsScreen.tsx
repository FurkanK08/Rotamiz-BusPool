import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { InteractiveNotification } from '../../components/NotificationTypes/InteractiveNotification';
import { LocationNotification } from '../../components/NotificationTypes/LocationNotification';

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
                setNotifications(prev =>
                    prev.map(n => n._id === item._id ? { ...n, isRead: true } : n)
                );
            } catch (error) {
                console.error('Failed to mark read', error);
            }
        }

        // Navigation Logic based on Type
        if (item.type === 'DRIVER_LOCATION_STARTED' || item.type === 'PASSENGER_LOCATION_SHARED') {
            // Navigate directly to PassengerTracking with serviceId from notification data
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
