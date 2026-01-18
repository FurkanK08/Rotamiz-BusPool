import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';

interface AppBarProps {
    title?: string;
    showBack?: boolean;
    showNotification?: boolean;
}

export const AppBar = ({ title, showBack = false, showNotification = true }: AppBarProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.container}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                )}
                {title && <Text style={styles.title}>{title}</Text>}
                {!title && <Text style={styles.logo}>Spinning Eagle 🦅</Text>}
            </View>

            {showNotification && (
                <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <Text style={styles.notificationIcon}>🔔</Text>
                    <View style={styles.badge} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        ...SHADOWS.light,
        zIndex: 100,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: SPACING.s,
        marginRight: SPACING.s,
    },
    backButtonText: {
        fontSize: 24,
        color: COLORS.text,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    logo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
        fontStyle: 'italic',
    },
    notificationButton: {
        padding: SPACING.s,
        position: 'relative',
    },
    notificationIcon: {
        fontSize: 24,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'red',
    }
});
