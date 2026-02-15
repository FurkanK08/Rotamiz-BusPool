import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { api } from '../../services/api';

export const ServiceDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { service: initialService } = route.params;
    const [service, setService] = useState(initialService);
    const [loading, setLoading] = useState(false);

    // Fetch fresh service data whenever screen is focused
    useFocusEffect(
        useCallback(() => {
            const fetchService = async () => {
                try {
                    const freshService = await api.services.getById(initialService._id);
                    if (freshService) {
                        setService(freshService);
                    }
                } catch (error) {
                    console.error('Servis verisi güncellenemedi:', error);
                    // Keep showing stale data as fallback
                }
            };
            fetchService();
        }, [initialService._id])
    );

    // Add Passenger State
    const [modalVisible, setModalVisible] = useState(false);
    const [newPassengerPhone, setNewPassengerPhone] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    const handleAddPassenger = async () => {
        if (!newPassengerPhone || newPassengerPhone.length < 10) {
            Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin.');
            return;
        }

        setAddLoading(true);
        try {
            const updatedService = await api.services.addPassenger(service._id, newPassengerPhone);
            setService(updatedService);
            setModalVisible(false);
            setNewPassengerPhone('');
            Alert.alert('Başarılı', 'Yolcu servise eklendi.');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Hata', error.message || 'Yolcu eklenemedi.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleRemovePassenger = async (passengerId: string, passengerName: string) => {
        Alert.alert(
            'Yolcuyu Çıkar',
            `${passengerName} isimli yolcuyu servisten çıkarmak istiyor musunuz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.services.removePassenger(service._id, passengerId);

                            // Update local state locally for instant feedback
                            const updatedPassengers = service.passengers.filter((p: any) => p._id !== passengerId);
                            setService({ ...service, passengers: updatedPassengers });

                            Alert.alert('Başarılı', 'Yolcu çıkarıldı.');
                        } catch (error) {
                            Alert.alert('Hata', 'Yolcu çıkarılamadı.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteService = () => {
        Alert.alert(
            'Servisi Sil',
            'Bu servisi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.services.deleteService(service._id);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Hata', 'Servis silinemedi.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderPassenger = ({ item }: { item: any }) => (
        <View style={styles.passengerCard}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{item.name}</Text>
                <Text style={styles.passengerPhone}>{item.phoneNumber}</Text>
            </View>
            <TouchableOpacity
                onPress={() => handleRemovePassenger(item._id, item.name)}
                style={styles.removeButton}
            >
                <Text style={styles.removeButtonText}>🗑️</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{service.name}</Text>
                    <Text style={styles.subtitle}>{service.plate}</Text>
                </View>
                <TouchableOpacity
                    style={styles.codeContainer}
                    onPress={async () => {
                        try {
                            const { Clipboard } = require('react-native');
                            Clipboard.setString(service.code);
                            Alert.alert('Kopyalandı', `Davet kodu panoya kopyalandı: ${service.code}`);
                        } catch {
                            Alert.alert('Davet Kodu', `${service.code}`);
                        }
                    }}
                >
                    <Text style={styles.codeLabel}>KOD (Kopyala)</Text>
                    <Text style={styles.code}>{service.code}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Yolcular ({service.passengers.length})</Text>
                    <TouchableOpacity
                        style={styles.addPassengerButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.addPassengerButtonText}>+ Ekle</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={service.passengers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderPassenger}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Henüz yolcu yok.</Text>
                    }
                    contentContainerStyle={styles.listContent}
                />
            </View>

            <View style={styles.footer}>
                <Button
                    title={service.active ? "Sefere Devam Et (Aktif)" : "Seferi Başlat"}
                    onPress={() => {
                        if (service.active) {
                            // If already active, just navigate without resetting anything or triggering start logic again logic if any
                            navigation.navigate('ActiveTrip', { serviceId: service._id, driverId: service.driver });
                        } else {
                            navigation.navigate('ActiveTrip', { serviceId: service._id, driverId: service.driver });
                        }
                    }}
                    variant={service.active ? 'secondary' : 'primary'}
                    style={{ marginBottom: SPACING.s }}
                />
                <Button
                    title="Servisi Sil"
                    variant="danger"
                    onPress={handleDeleteService}
                    disabled={loading}
                />
            </View>

            {/* Add Passenger Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yolcu Ekle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDesc}>
                            Eklemek istediğiniz yolcunun telefon numarasını girin. Yolcunun uygulamaya kayıtlı olması gerekir.
                        </Text>

                        <Input
                            placeholder="Telefon No (5XX...)"
                            value={newPassengerPhone}
                            onChangeText={setNewPassengerPhone}
                            keyboardType="phone-pad"
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="İptal"
                                onPress={() => setModalVisible(false)}
                                variant="outline"
                                style={{ flex: 1, marginRight: SPACING.s }}
                            />
                            <Button
                                title="Ekle"
                                onPress={handleAddPassenger}
                                loading={addLoading}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.l,
        paddingTop: SPACING.xl,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    codeContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: SPACING.s,
        borderRadius: 8,
        alignItems: 'center',
    },
    codeLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: 'bold',
    },
    code: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        padding: SPACING.l,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    addPassengerButton: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.m,
        paddingVertical: 6,
        borderRadius: 20,
    },
    addPassengerButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    listContent: {
        paddingBottom: SPACING.l,
    },
    passengerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.s,
        ...SHADOWS.light,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    passengerPhone: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    removeButton: {
        padding: SPACING.s,
    },
    removeButtonText: {
        fontSize: 18,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textLight,
        marginTop: SPACING.l,
    },
    footer: {
        padding: SPACING.l,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        ...SHADOWS.medium,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    closeButton: {
        fontSize: 24,
        color: COLORS.textLight,
        padding: 4,
    },
    modalDesc: {
        color: COLORS.textLight,
        marginBottom: SPACING.l,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: SPACING.m,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0
    }
});
