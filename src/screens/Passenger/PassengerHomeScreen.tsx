import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, RefreshControl, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { api } from '../../services/api';
import { ServiceRoute } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

export const PassengerHomeScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const paramsUserId = route.params?.userId;
    const [currentUserId, setCurrentUserId] = useState<string | null>(paramsUserId || null);
    const { unreadCount } = useNotifications();

    const [services, setServices] = useState<ServiceRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    React.useEffect(() => {
        const initializeUser = async () => {
            if (paramsUserId) {
                setCurrentUserId(paramsUserId);
            } else {
                // Fallback to storage
                const { tokenService } = require('../../services/api');
                const storedUser = await tokenService.getUser();
                if (storedUser && storedUser._id) {
                    setCurrentUserId(storedUser._id);
                }
            }
        };
        initializeUser();
    }, [paramsUserId]);

    const fetchServices = async () => {
        if (!currentUserId) return;
        // Don't set loading true on refresh to avoid screen flicker, only on initial load
        if (!refreshing) setLoading(true);
        try {
            console.log('Fetching passenger services for:', currentUserId);
            const data = await api.services.getPassengerServices(currentUserId);
            // Ensure data is an array before setting state
            if (Array.isArray(data)) {
                setServices(data);
            } else {
                console.warn('API returned non-array data for services:', data);
                setServices([]);
            }
        } catch (error) {
            console.error(error);
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

    // Refresh on focus
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

    const handleServiceSelect = (service: ServiceRoute) => {
        navigation.navigate('PassengerTracking', {
            serviceId: (service as any)._id,
            userId: currentUserId,
            service: service // Pass entire service object
        });
    };

    if (!loading && services.length === 0 && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emoji}>🚍</Text>
                    <Text style={styles.title}>Henüz bir servise kayıtlı değilsiniz.</Text>
                    <Text style={styles.subtitle}>Sürücünüzden alacağınız 4 haneli kod ile servise katılın.</Text>
                    <Button
                        title="Servise Katıl"
                        onPress={() => navigation.navigate('JoinService', { userId: currentUserId })}
                        style={styles.joinButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Merhaba, Yolcu 👋</Text>
                    <Text style={styles.subtext}>Kayıtlı {services.length} servisiniz var.</Text>
                </View>
                <TouchableOpacity
                    style={styles.settingsBtn}
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
                                borderColor: COLORS.background
                            }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text style={styles.sectionTitle}>Servislerim</Text>

                <Button
                    title="Biniş Durağımı Ayarla 📍"
                    onPress={() => navigation.navigate('PassengerLocation')}
                    variant="secondary"
                    style={{ marginBottom: SPACING.s, width: '100%' }}
                />

                <Button
                    title="Gelmeyeceğim Günler 📅"
                    onPress={() => navigation.navigate('PassengerAbsence', { serviceId: services[0]?._id, passengerId: currentUserId })}
                    variant="outline"
                    style={{ marginBottom: SPACING.m, width: '100%' }}
                />

                {services.map((srv: any) => (
                    <TouchableOpacity
                        key={srv._id}
                        style={styles.serviceCard}
                        onPress={() => handleServiceSelect(srv)}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 18 }}>{srv.name}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{srv.plate}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: COLORS.white, marginRight: 8 }}>⚡ Durum:</Text>
                            <Text style={{ color: srv.active ? '#4CAF50' : 'white', fontWeight: 'bold', backgroundColor: srv.active ? 'white' : 'rgba(255,255,255,0.2)', paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden' }}>
                                <Text style={{ color: srv.active ? COLORS.primary : 'white' }}>{srv.active ? 'Yolda' : 'Bekliyor'}</Text>
                            </Text>
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 10 }}>
                            Sürücü: {srv.driver?.name || 'Bilinmiyor'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Yeni Servis Ekle (+)"
                    variant="secondary"
                    onPress={() => navigation.navigate('JoinService', { userId: currentUserId })}
                />
            </View>
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
    },
    settingsBtn: {
        padding: SPACING.s,
    },
    content: {
        padding: SPACING.l,
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    emoji: {
        fontSize: 64,
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: SPACING.s,
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: COLORS.textLight,
        marginBottom: SPACING.xl,
    },
    joinButton: {
        width: '100%',
    },
    serviceCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: SPACING.l,
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.m,
        alignSelf: 'flex-start',
    },
    footer: {
        padding: SPACING.l,
        marginTop: 'auto',
    },
});
