import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    { borderColor: error ? COLORS.error : '#E0E0E0' },
                    style,
                ]}
                placeholderTextColor={COLORS.textLight}
                {...props}
            />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
    },
    label: {
        marginBottom: SPACING.xs,
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        fontSize: 16,
        color: COLORS.text,
        backgroundColor: COLORS.white,
    },
    error: {
        marginTop: SPACING.xs,
        fontSize: 12,
        color: COLORS.error,
    },
});
