import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Animated, Platform } from 'react-native';
import { socketService } from '../services/socket';
import { DirectionsService } from '../services/googleMaps/DirectionsService';
import { ETAService } from '../services/googleMaps/ETAService';
import * as Location from 'expo-location';

// Helper for interpolation (simple linear)
// For production transparency, one might use react-native-maps-animated-marker or similar
// But we will stick to a simple ref-based approach or state updates for now.

export const useLiveTracking = (serviceId: string, userId: string, initialUserLocation?: any) => {
    const [driverLocation, setDriverLocation] = useState<any>(null);
    const [passengerLocation, setPassengerLocation] = useState<any>(initialUserLocation || null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [eta, setEta] = useState<string | null>(null);
    const [distance, setDistance] = useState<string | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    // Animated value for smooth marker movement
    // We'll use a standard state for coordinates but could upgrade to Animated.ValueXY
    // for true 60fps native driver animation if needed.
    // For now, let's just react to state updates.

    // 1. Initialize Passenger Location
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const startLocationWatch = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                // Watch position for "Blue Dot"
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 10, // Update every 10 meters
                    },
                    (loc) => {
                        setPassengerLocation({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        });
                    }
                );
            } catch (e) {
                console.log('Location watch error:', e);
            }
        };

        if (!initialUserLocation) {
            startLocationWatch();
        }

        return () => {
            if (subscription) subscription.remove();
        };
    }, []); // Run once

    // 2. Socket Connection & Driver Updates
    useEffect(() => {
        if (!serviceId) return;

        socketService.connect();
        socketService.joinService(serviceId);

        const handleLocationUpdate = (newLocation: any) => {
            console.log('📍 Driver Update:', newLocation);
            setDriverLocation(newLocation);
        };

        socketService.subscribeToLocationUpdates(handleLocationUpdate);

        return () => {
            socketService.disconnect();
        };
    }, [serviceId]);

    // 3. Route & ETA Calculation (Debounced)
    // We only recalculate route if driver moves significantly or passenger moves significantly
    // For simplicity, we'll recirculate on significant driver updates or periodically.
    useEffect(() => {
        if (!driverLocation || !passengerLocation) return;

        // Debounce logic or simple interval could be applied here.
        // For now, let's fetch route if we don't have one, or update ETA periodically.

        const updateRouteAndEta = async () => {
            setIsLoadingRoute(true);

            // Fetch precise route from Google Directions
            const routeResult = await DirectionsService.getRoute(driverLocation, passengerLocation);
            if (routeResult) {
                setRouteCoordinates(routeResult.points);
                // setDistance(routeResult.distance); // Use Distance Matrix for better traffic data
            }

            // Fetch accurate ETA from Google Distance Matrix
            const etaResult = await ETAService.getETA(driverLocation, passengerLocation);
            if (etaResult) {
                setEta(etaResult.duration);
                setDistance(etaResult.distance);
            }

            setIsLoadingRoute(false);
        };

        // Initial fetch
        updateRouteAndEta();

        // Set up an interval to refresh ETA every 60 seconds (save API quotas)
        const interval = setInterval(updateRouteAndEta, 60000);

        return () => clearInterval(interval);

    }, [
        // Dependencies: if these change significantly, we might want to re-fetch
        // But to save API calls, maybe only trigger manually or on large shifts
        // For this demo, let's rely on the interval and initial load
        // We add them to deps to trigger on first valid pair
        driverLocation?.latitude,
        driverLocation?.longitude,
        passengerLocation?.latitude,
        passengerLocation?.longitude
    ]);

    return {
        driverLocation,
        passengerLocation,
        routeCoordinates,
        eta,
        distance,
        isLoadingRoute
    };
};
