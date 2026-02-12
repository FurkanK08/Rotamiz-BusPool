import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Animated, Platform } from 'react-native';
import { socketService } from '../services/socket';
import { DirectionsService } from '../services/googleMaps/DirectionsService';
import { ETAService } from '../services/googleMaps/ETAService';
import * as Location from 'expo-location';

// Minimum interval between route recalculations (ms)
const ROUTE_THROTTLE_MS = 30000; // 30 seconds

export const useLiveTracking = (serviceId: string, userId: string, initialUserLocation?: any) => {
    const [driverLocation, setDriverLocation] = useState<any>(null);
    const [passengerLocation, setPassengerLocation] = useState<any>(initialUserLocation || null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [eta, setEta] = useState<string | null>(null);
    const [distance, setDistance] = useState<string | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    // Refs for throttling
    const lastRouteCalcTime = useRef<number>(0);
    const driverLocationRef = useRef<any>(null);
    const passengerLocationRef = useRef<any>(null);

    // Keep refs in sync with state
    useEffect(() => { driverLocationRef.current = driverLocation; }, [driverLocation]);
    useEffect(() => { passengerLocationRef.current = passengerLocation; }, [passengerLocation]);

    // 1. Initialize Passenger Location
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const startLocationWatch = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 10,
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
    }, []);

    // 2. Socket Connection & Driver Updates
    useEffect(() => {
        if (!serviceId) return;

        socketService.connect();
        socketService.joinService(serviceId);

        const handleLocationUpdate = (newLocation: any) => {
            setDriverLocation(newLocation);
        };

        socketService.subscribeToLocationUpdates(handleLocationUpdate);

        return () => {
            socketService.disconnect();
        };
    }, [serviceId]);

    // 3. Route & ETA Calculation (Throttled)
    // Uses a fixed interval instead of reacting to every location change
    const updateRouteAndEta = useCallback(async () => {
        const driver = driverLocationRef.current;
        const passenger = passengerLocationRef.current;

        if (!driver || !passenger) return;

        // Throttle: skip if called too recently
        const now = Date.now();
        if (now - lastRouteCalcTime.current < ROUTE_THROTTLE_MS) return;
        lastRouteCalcTime.current = now;

        setIsLoadingRoute(true);

        try {
            // Fetch route from Google Directions
            const routeResult = await DirectionsService.getRoute(driver, passenger);
            if (routeResult) {
                setRouteCoordinates(routeResult.points);
            }

            // Fetch ETA from Google Distance Matrix
            const etaResult = await ETAService.getETA(driver, passenger);
            if (etaResult) {
                setEta(etaResult.duration);
                setDistance(etaResult.distance);
            }
        } catch (error) {
            console.warn('Route/ETA calculation error:', error);
        } finally {
            setIsLoadingRoute(false);
        }
    }, []);

    useEffect(() => {
        if (!driverLocation || !passengerLocation) return;

        // Initial calculation (bypass throttle for first load)
        if (lastRouteCalcTime.current === 0) {
            lastRouteCalcTime.current = Date.now();
            updateRouteAndEta();
        }

        // Refresh ETA every 60 seconds
        const interval = setInterval(updateRouteAndEta, 60000);

        return () => clearInterval(interval);
    }, [
        // Only re-run effect when we get first valid pair
        !!driverLocation,
        !!passengerLocation
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
