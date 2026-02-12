import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

export const PassengerAbsenceScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { serviceId, passengerId } = route.params;

    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Generate next 30 days (memoized to avoid recalculation on every render)
    const days = useMemo(() => {
        const result = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
            result.push({ date: dateStr, label: dayName, fullDate: d });
        }
        return result;
    }, []);

    const toggleDate = (date: string) => {
        if (selectedDates.includes(date)) {
            setSelectedDates(selectedDates.filter(d => d !== date));
        } else {
            setSelectedDates([...selectedDates, date]);
        }
    };

    const handleSubmit = async () => {
        if (selectedDates.length === 0) {
            Alert.alert('Uyarı', 'Lütfen en az bir gün seçiniz.');
            return;
        }

        setLoading(true);
        try {
            await api.services.updateFutureAttendance(serviceId, passengerId, selectedDates, 'GELMEYECEK');
            Alert.alert('Başarılı', 'Seçilen günlerde servis kullanmayacağınız bildirildi.', [
                { text: 'Tamam', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'İşlem başarısız oldu.');
        } finally {
            setLoading(false);
        }
    };

    const renderDay = ({ item }: { item: any }) => {
        const isSelected = selectedDates.includes(item.date);
        const isWeekend = item.fullDate.getDay() === 0 || item.fullDate.getDay() === 6;

        return (
            <TouchableOpacity
                style={[
                    styles.dayCard,
                    isSelected && styles.dayCardSelected,
                    isWeekend && styles.dayCardWeekend
                ]}
                onPress={() => toggleDate(item.date)}
            >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {item.label}
                </Text>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Gelmeyeceğim Günler</Text>
                <Text style={styles.subtitle}>
                    Önümüzdeki günlerde servisi kullanmayacaksanız lütfen tarihleri seçip bildirin.
                </Text>
            </View>

            <FlatList
                data={days}
                renderItem={renderDay}
                keyExtractor={item => item.date}
                contentContainerStyle={styles.listContent}
                numColumns={2}
            />

            <View style={styles.footer}>
                <Button
                    title={loading ? "Kaydediliyor..." : "Seçimi Kaydet"}
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading || selectedDates.length === 0}
                />
            </View>
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
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        color: COLORS.textLight,
        marginTop: SPACING.s,
        fontSize: 14
    },
    listContent: {
        padding: SPACING.m,
    },
    dayCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        margin: SPACING.xs,
        padding: SPACING.m,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        height: 80,
        ...SHADOWS.light
    },
    dayCardSelected: {
        backgroundColor: '#FFEBEE', // Light red for "Absent" context
        borderColor: COLORS.error,
    },
    dayCardWeekend: {
        backgroundColor: '#f9f9f9',
        opacity: 0.8
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center'
    },
    dayTextSelected: {
        color: COLORS.error,
        fontWeight: 'bold'
    },
    checkMark: {
        fontSize: 16,
        color: COLORS.error,
        marginTop: 4,
        fontWeight: 'bold'
    },
    footer: {
        padding: SPACING.l,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    }
});
