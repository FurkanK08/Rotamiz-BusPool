import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

interface NotificationPreferences {
    serviceStart: boolean;
    serviceEnd: boolean;
    attendanceRequest: boolean;
    locationRequest: boolean;
    passengerResponse: boolean;
    promotional: boolean;
}

const defaultPreferences: NotificationPreferences = {
    serviceStart: true,
    serviceEnd: true,
    attendanceRequest: true,
    locationRequest: true,
    passengerResponse: true,
    promotional: false,
};

export const NotificationSettingsScreen = ({ navigation }: any) => {
    const { userId, role } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, [userId]);

    const fetchPreferences = async () => {
        if (!userId) return;
        try {
            const userData = await api.users.getProfile(userId);
            if (userData?.notificationPreferences) {
                setPreferences({ ...defaultPreferences, ...userData.notificationPreferences });
            }
        } catch (error) {
            console.error('Failed to fetch preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        setSaving(true);
        try {
            await api.users.updateNotificationPreferences(userId, newPreferences);
        } catch (error) {
            console.error('Failed to save preference:', error);
            Alert.alert('Hata', 'Tercih kaydedilemedi');
            // Revert on error
            setPreferences(preferences);
        } finally {
            setSaving(false);
        }
    };

    const SettingRow = ({
        icon,
        title,
        description,
        value,
        onValueChange,
        isDriver = false
    }: {
        icon: string;
        title: string;
        description: string;
        value: boolean;
        onValueChange: (val: boolean) => void;
        isDriver?: boolean;
    }) => {
        // Hide driver-only settings for passengers
        if (isDriver && role !== 'DRIVER') return null;

        return (
            <View style={styles.settingRow}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon as any} size={24} color={COLORS.primary} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.settingTitle}>{title}</Text>
                    <Text style={styles.settingDescription}>{description}</Text>
                </View>
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#767577', true: COLORS.primary + '50' }}
                    thumbColor={value ? COLORS.primary : '#f4f3f4'}
                />
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
                    <Text style={styles.headerSubtitle}>
                        Hangi bildirimleri almak istediğinizi seçin
                    </Text>
                    {saving && <Text style={styles.savingText}>Kaydediliyor...</Text>}
                </View>

                {/* Service Alerts Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🚌 Servis Bildirimleri</Text>

                    <SettingRow
                        icon="play-circle"
                        title="Servis Başladı"
                        description="Servisiniz yola çıktığında bildirim alın"
                        value={preferences.serviceStart}
                        onValueChange={(val) => updatePreference('serviceStart', val)}
                    />

                    <SettingRow
                        icon="stop-circle"
                        title="Servis Bitti"
                        description="Servis güzergahı tamamlandığında bildirim alın"
                        value={preferences.serviceEnd}
                        onValueChange={(val) => updatePreference('serviceEnd', val)}
                    />
                </View>

                {/* Interaction Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💬 Etkileşim Bildirimleri</Text>

                    <SettingRow
                        icon="clipboard"
                        title="Yoklama İsteği"
                        description="Sürücü yoklama aldığında bildirim alın"
                        value={preferences.attendanceRequest}
                        onValueChange={(val) => updatePreference('attendanceRequest', val)}
                    />

                    <SettingRow
                        icon="location"
                        title="Konum İsteği"
                        description="Sürücü konumunuzu istediğinde bildirim alın"
                        value={preferences.locationRequest}
                        onValueChange={(val) => updatePreference('locationRequest', val)}
                    />

                    <SettingRow
                        icon="chatbubble"
                        title="Yolcu Yanıtları"
                        description="Yolcular yoklamaya cevap verdiğinde bildirim alın"
                        value={preferences.passengerResponse}
                        onValueChange={(val) => updatePreference('passengerResponse', val)}
                        isDriver={true}
                    />
                </View>

                {/* Marketing Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📢 Diğer Bildirimler</Text>

                    <SettingRow
                        icon="megaphone"
                        title="Promosyon ve Duyurular"
                        description="Kampanya ve güncellemelerden haberdar olun"
                        value={preferences.promotional}
                        onValueChange={(val) => updatePreference('promotional', val)}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SPACING.m,
    },
    header: {
        marginBottom: SPACING.l,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },
    savingText: {
        fontSize: 12,
        color: COLORS.primary,
        marginTop: 4,
    },
    section: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        ...SHADOWS.light,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.m,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    textContainer: {
        flex: 1,
        marginRight: SPACING.s,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
    },
    settingDescription: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
});
