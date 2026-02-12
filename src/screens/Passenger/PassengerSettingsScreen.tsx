import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const PassengerSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { userId, serviceId } = route.params || {};
    const { logout } = useAuth();

    const handleLeaveService = () => {
        Alert.alert(
            'Servisten Ayrıl',
            'Bu servisten ayrılmak istediğinize emin misiniz? Tekrar katılmak için koda ihtiyacınız olacak.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Ayrıl',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (serviceId && userId) {
                                await api.services.removePassenger(serviceId, userId);
                                Alert.alert('Başarılı', 'Servisten ayrıldınız.');
                                navigation.navigate('PassengerHome');
                            }
                        } catch (error) {
                            Alert.alert('Hata', 'İşlem başarısız.');
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Çıkış Yap',
            'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkış Yap',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            // Fallback: even if logout fails, reset navigation
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Ayarlar</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hesap</Text>
                <View style={styles.card}>
                    <Text style={styles.label}>Kullanıcı ID</Text>
                    <Text style={styles.value}>{userId}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Servis Yönetimi</Text>
                <Button
                    title="Mevcut Servisten Ayrıl"
                    variant="outline"
                    onPress={handleLeaveService}
                    style={{ marginBottom: SPACING.m }}
                />
            </View>

            <View style={styles.footer}>
                <Button
                    title="Çıkış Yap"
                    variant="danger"
                    onPress={handleLogout}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: SPACING.l,
    },
    header: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.m,
    },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 12,
        ...SHADOWS.light,
    },
    label: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    footer: {
        marginTop: 'auto',
    },
});
