import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { Alert } from 'react-native';

export const RoleSelectionScreen = () => {
    const [name, setName] = useState('');
    const [selectedRole, setSelectedRole] = useState<'DRIVER' | 'PASSENGER' | null>(null);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { userId } = route.params || {};
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!selectedRole) return;

        setLoading(true);
        try {
            // Update profile in backend
            if (userId) {
                await api.auth.updateProfile(userId, name, selectedRole);
            } else {
                // If checking in dev mode without passing props, just warn but allow proceed
                console.warn('No userId found provided to RoleSelection.');
            }

            if (selectedRole === 'DRIVER') {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'DriverDashboard', params: { userId } }],
                });
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'PassengerHome', params: { userId } }],
                });
            }
        } catch (error) {
            Alert.alert('Hata', 'Profil güncellenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const RoleCard = ({ role, title, icon }: { role: 'DRIVER' | 'PASSENGER', title: string, icon: string }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedRole(role)}
            style={[
                styles.card,
                selectedRole === role && styles.selectedCard,
            ]}
        >
            <View style={styles.cardContent}>
                <Text style={styles.cardIcon}>{icon}</Text>
                <Text style={[styles.cardTitle, selectedRole === role && styles.selectedText]}>{title}</Text>
            </View>
            {selectedRole === role && (
                <View style={styles.checkIcon}>
                    <Text style={{ color: COLORS.white }}>✓</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profilinizi Tamamlayın</Text>
                    <Text style={styles.subtitle}>Size hitap edebilmemiz için isminizi öğrenelim.</Text>
                </View>

                <Input
                    label="Adınız Soyadınız"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={name}
                    onChangeText={setName}
                />

                <Text style={styles.sectionTitle}>Hangi amaçla kullanacaksınız?</Text>

                <View style={styles.roleContainer}>
                    <RoleCard role="PASSENGER" title="Yolcuyum" icon="🎒" />
                    <RoleCard role="DRIVER" title="Sürücüyüm" icon="🚌" />
                </View>

                <View style={styles.footer}>
                    <Button
                        title="Devam Et"
                        onPress={handleContinue}
                        loading={loading}
                        disabled={!name || !selectedRole}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: SPACING.l,
    },
    header: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: SPACING.l,
        marginBottom: SPACING.m,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: SPACING.m,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        ...SHADOWS.light,
    },
    selectedCard: {
        borderColor: COLORS.primary,
        backgroundColor: '#F0F7FF',
    },
    cardContent: {
        alignItems: 'center',
    },
    cardIcon: {
        fontSize: 40,
        marginBottom: SPACING.s,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    selectedText: {
        color: COLORS.primary,
    },
    checkIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        marginTop: 'auto',
    },
});
