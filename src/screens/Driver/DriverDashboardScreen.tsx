import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, tokenService } from '../../services/api';
import { ServiceRoute } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const DriverDashboardScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const paramsUserId = route.params?.userId;
    const { unreadCount } = useNotifications();
    const { logout } = useAuth();
    const [userName, setUserName] = useState('Kaptan');

    const [services, setServices] = useState<ServiceRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(paramsUserId || null);

    // Initialize user ID from params or storage
    React.useEffect(() => {
        const initializeUser = async () => {
            if (paramsUserId) {
                setCurrentUserId(paramsUserId);
            } else {
                // M4 FIX: Use imported tokenService instead of require()
                const storedUser = await tokenService.getUser();
                if (storedUser && storedUser._id) {
                    setCurrentUserId(storedUser._id);
                    // D6 FIX: Show user's actual name
                    if (storedUser.name) setUserName(storedUser.name);
                }
            }
        };
        initializeUser();
    }, [paramsUserId]);

    const fetchServices = async () => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            console.log('Fetching services for driver:', currentUserId);
            const data = await api.services.getDriverServices(currentUserId);
            console.log('Fetched services count:', data?.length);
            setServices(data || []);
        } catch (error) {
            console.error('Fetch services error:', error);
            Alert.alert('Hata', 'Servisler yüklenemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchServices();
        setRefreshing(false);
    }, [currentUserId]);

    // Refresh when screen comes into focus using the latest currentUserId
    React.useEffect(() => {
        if (currentUserId) {
            fetchServices();
        }

        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUserId) {
                fetchServices();
            }
        });
        return unsubscribe;
    }, [navigation, currentUserId]);


    const handleCreateService = () => {
        navigation.navigate('CreateService', { driverId: currentUserId });
    };

    const handleStartTrip = (serviceId: string) => {
        // Navigate to Active Trip Screen (Map)
        console.log('Starting trip for', serviceId);
        navigation.navigate('ActiveTrip', { serviceId, driverId: currentUserId });
    };

    const renderServiceCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ServiceDetail', { service: item })}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.plate}>{item.plate}</Text>
                </View>
                <View style={[styles.badge, item.active && { backgroundColor: '#E8F5E9' }]}>
                    {item.active ? (
                        <Text style={[styles.badgeText, { color: '#2E7D32' }]}>🟢 Konum Paylaşılıyor</Text>
                    ) : (
                        <Text style={styles.badgeText}>{item.schedules && item.schedules[0] ? item.schedules[0] : 'N/A'}</Text>
                    )}
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>Kod:</Text>
                    <Text style={styles.codeValue}>{item.code}</Text>
                </View>
                <Button
                    title={item.active ? "Konumu Göster" : "Seferi Başlat"}
                    onPress={() => handleStartTrip(item._id)}
                    style={{ height: 40, width: item.active ? 150 : 120 }}
                    textStyle={{ fontSize: 14 }}
                    variant={item.active ? 'secondary' : 'primary'}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Merhaba, {userName} 👋</Text>
                    <Text style={styles.subtext}>Bugün {services.length} kayıtlı servisiniz var.</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {/* M7 FIX: Logout button */}
                    <TouchableOpacity
                        onPress={() => Alert.alert('Çıkış', 'Çıkış yapmak istiyor musunuz?', [
                            { text: 'İptal', style: 'cancel' },
                            { text: 'Çıkış Yap', style: 'destructive', onPress: logout }
                        ])}
                    >
                        <Text style={{ fontSize: 22 }}>🚪</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <View>
                            <Text style={{ fontSize: 24 }}>🔔</Text>
                            {unreadCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    right: -2,
                                    top: -2,
                                    backgroundColor: COLORS.error,
                                    borderRadius: 8,
                                    width: 16,
                                    height: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 1.5,
                                    borderColor: COLORS.white
                                }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={services}
                renderItem={renderServiceCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Henüz bir servisiniz yok.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={handleCreateService}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.l,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtext: {
        color: COLORS.textLight,
        marginTop: SPACING.xs,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.light,
    },
    listContent: {
        padding: SPACING.m,
        paddingBottom: 100, // For FAB space
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        ...SHADOWS.light,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    plate: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 2,
    },
    badge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.s,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    codeLabel: {
        color: COLORS.textLight,
    },
    codeValue: {
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 1,
    },
    fab: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    fabIcon: {
        fontSize: 32,
        color: COLORS.white,
        marginTop: -4,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textLight,
    },
});
