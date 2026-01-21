import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { Button } from '../Button';

interface InteractiveNotificationProps {
    notification: any;
    onRespond: (response: string) => void;
}

export const InteractiveNotification: React.FC<InteractiveNotificationProps> = ({ notification, onRespond }) => {
    if (notification.response) {
        return (
            <View style={styles.respondedContainer}>
                <Text style={styles.respondedText}>Cevabınız: {notification.response}</Text>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            </View>
        );
    }

    return (
        <View style={styles.actionButtons}>
            <Button
                title="Geliyorum"
                onPress={() => onRespond('YES')}
                variant="primary"
                style={styles.smallButton}
                textStyle={{ fontSize: 12 }}
            />
            <View style={{ width: 8 }} />
            <Button
                title="Gelmiyorum"
                onPress={() => onRespond('NO')}
                variant="secondary"
                style={[styles.smallButton, { backgroundColor: COLORS.error }]}
                textStyle={{ fontSize: 12 }}
            />
            <View style={{ width: 8 }} />
            <Button
                title="5 dk Geciktim"
                onPress={() => onRespond('LATE_5')}
                variant="outline"
                style={styles.smallButton}
                textStyle={{ fontSize: 12 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    actionButtons: {
        flexDirection: 'row',
        marginTop: 4,
        flexWrap: 'wrap',
        gap: 8,
    },
    smallButton: {
        height: 32,
        paddingHorizontal: 12,
        minWidth: 80,
    },
    respondedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: '#e8f5e9',
        padding: 6,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    respondedText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: 'bold',
        marginRight: 4,
    },
});
