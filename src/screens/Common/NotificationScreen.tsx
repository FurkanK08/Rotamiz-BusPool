import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '../../components/AppBar';
import { COLORS, SPACING } from '../../constants/theme';

const MOCK_NOTIFICATIONS = [
    { id: '1', title: 'Servis Başladı', msg: 'Sabah Servisi - Fabrika yola çıktı.', time: '1 dk önce' },
    { id: '2', title: 'Hoşgeldiniz', msg: 'Uygulamayı kullanmaya başladınız.', time: '2 gün önce' },
];

export const NotificationScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <AppBar title="Bildirimler" showBack />
            <FlatList
                data={MOCK_NOTIFICATIONS}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.content}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.msg}>{item.msg}</Text>
                        </View>
                        <Text style={styles.time}>{item.time}</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.m,
    },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    msg: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    time: {
        fontSize: 12,
        color: COLORS.textLight,
        marginLeft: SPACING.m,
    }
});
