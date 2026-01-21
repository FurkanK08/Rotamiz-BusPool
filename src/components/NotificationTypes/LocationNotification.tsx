import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../Button';

interface LocationNotificationProps {
    notification: any;
    onPress: () => void;
}

export const LocationNotification: React.FC<LocationNotificationProps> = ({ notification, onPress }) => {
    return (
        <View style={styles.actionButtons}>
            <Button
                title="Haritada Gör 🗺️"
                onPress={onPress}
                variant="secondary"
                style={styles.fullWidthButton}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    actionButtons: {
        marginTop: 8,
    },
    fullWidthButton: {
        height: 36,
        width: '100%',
    },
});
