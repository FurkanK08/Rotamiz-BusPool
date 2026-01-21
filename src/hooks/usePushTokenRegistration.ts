import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Basic configuration for notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const usePushTokenRegistration = () => {
    const { userId } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
    const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response received:', response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    // Sync token with backend when user logs in or token changes
    useEffect(() => {
        if (expoPushToken && userId) {
            console.log(`Syncing push token for user ${userId}`);
            api.users.updatePushToken(userId, expoPushToken)
                .then(() => console.log('Push token sent to backend successfully'))
                .catch(err => console.error('Failed to send push token to backend', err));
        }
    }, [expoPushToken, userId]);

    return { expoPushToken, notification };
};

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        let finalStatus = 'undetermined';
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
        } catch (e) {
            console.log("Error getting push permissions (likely Expo Go limitation):", e);
            // Don't return here, let it proceed to mock token generation
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification (Permissions not granted)');
            // Check if we should fallback to mock token anyway for dev
            // return; 
        }

        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                try {
                    token = (await Notifications.getExpoPushTokenAsync()).data;
                } catch (e) {
                    console.log("Expo Go SDK 54 limit hit. Using Mock Token.");
                    token = "ExponentPushToken[MockTokenForDev]";
                }
            } else {
                try {
                    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                } catch (e) {
                    console.log("Expo Go SDK 54 limit hit. Using Mock Token.");
                    token = "ExponentPushToken[MockTokenForDev]";
                }
            }
        } catch (e) {
            console.log("Expo Go SDK 54 limit hit. Using Mock Token.");
            token = "ExponentPushToken[MockTokenForDev]";
        }

        console.log("Token:", token);
    } else {
        // Alert.alert('Must use physical device for Push Notifications');
        // Commented out to avoid annoying alert on emulator during dev
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
