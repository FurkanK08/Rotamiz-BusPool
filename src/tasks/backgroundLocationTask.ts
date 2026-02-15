import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../services/socket';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task in global scope
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error('[BackgroundLocation] Task Error:', error);
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0]; // Get the latest location

        if (location) {
            try {
                // Retrieve the active service ID set by the driver
                const serviceId = await AsyncStorage.getItem('activeServiceId');

                if (serviceId) {
                    console.log('[BackgroundLocation] Sending location for service:', serviceId);

                    // Parameters to send
                    const payload = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        heading: location.coords.heading,
                        speed: location.coords.speed
                    };

                    // Ensure socket is connected (it might be disconnected in background)
                    if (!socketService.socket?.connected) {
                        console.log('[BackgroundLocation] Socket disconnected, attempting reconnect...');
                        const token = await AsyncStorage.getItem('auth_token');
                        socketService.connect(token || undefined);
                        // Give it a moment or just emit (socket.io buffers usually)
                    }

                    // Emit location update
                    socketService.sendLocation(serviceId, payload);
                }
            } catch (err) {
                console.error('[BackgroundLocation] Process Error:', err);
            }
        }
    }
});
