import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
}) => {
    const getBackgroundColor = () => {
        if (disabled) return COLORS.textLight;
        switch (variant) {
            case 'primary': return COLORS.primary;
            case 'secondary': return COLORS.secondary;
            case 'danger': return COLORS.error;
            case 'outline': return 'transparent';
            default: return COLORS.primary;
        }
    };

    const getTextColor = () => {
        if (variant === 'outline') return COLORS.primary;
        return COLORS.white;
    };

    const getBorderColor = () => {
        if (variant === 'outline') return COLORS.primary;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
