import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TopBannerProps {
    message: string;
    visible: boolean;
    onHide: () => void;
    type?: 'success' | 'info' | 'error';
}

export const TopBanner = ({ message, visible, onHide, type = 'info' }: TopBannerProps) => {
    const [slideAnim] = useState(new Animated.Value(-100));

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                hide();
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onHide());
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return '#4CAF50';
            case 'error': return '#F44336';
            default: return '#2196F3';
        }
    };

    if (!visible) return null;

    return (
        <Animated.View style={[
            styles.container,
            { transform: [{ translateY: slideAnim }], backgroundColor: getBackgroundColor() }
        ]}>
            <SafeAreaView edges={['top']}>
                <View style={styles.content}>
                    <Text style={styles.text}>{message}</Text>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: SPACING.m,
        ...SHADOWS.medium,
    },
    content: {
        padding: SPACING.m,
        alignItems: 'center',
    },
    text: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
