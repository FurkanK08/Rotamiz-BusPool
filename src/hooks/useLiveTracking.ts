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
    const [isServiceStopped, setIsServiceStopped] = useState(false);

    // Refs for throttling & socket access
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

    // 2. Socket Connection & Event Handling
    useEffect(() => {
        if (!serviceId) return;

        socketService.connect();
        socketService.joinService(serviceId);

        // Location Updates
        const locSub = socketService.subscribeToLocationUpdates((newLocation) => {
            setDriverLocation(newLocation);
        });

        // Service Stopped
        const stopSub = socketService.subscribeToServiceStop(() => {
            setIsServiceStopped(true);
        });

        // Location Request
        const reqSub = socketService.subscribeToLocationRequest(() => {
            const loc = passengerLocationRef.current;
            if (loc && userId) {
                console.log('[LiveTracking] Auto-sharing location per driver request');
                socketService.sendPassengerLocation(serviceId, userId, loc);
            }
        });

        return () => {
            locSub?.unsubscribe();
            stopSub?.unsubscribe();
            reqSub?.unsubscribe();
            socketService.disconnect();
        };
    }, [serviceId, userId]);

    // 3. Route & ETA Calculation (Throttled)
    const updateRouteAndEta = useCallback(async () => {
        const driver = driverLocationRef.current;
        const passenger = passengerLocationRef.current;

        if (!driver || !passenger) return;

        // Throttle logic
        const now = Date.now();
        // If calculated recently (within 30s) AND it's not the initial calculation (0), skip
        if (now - lastRouteCalcTime.current < ROUTE_THROTTLE_MS && lastRouteCalcTime.current !== 0) return;

        lastRouteCalcTime.current = now;
        setIsLoadingRoute(true);

        try {
            // Parallel Fetch
            const [routeResult, etaResult] = await Promise.all([
                DirectionsService.getRoute(driver, passenger),
                ETAService.getETA(driver, passenger)
            ]);

            if (routeResult) {
                setRouteCoordinates(routeResult.points);
            }

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

    // Trigger update on location change (throttled inside function) or interval
    useEffect(() => {
        if (!driverLocation || !passengerLocation) return;

        // Attempt update (will be throttled if too frequent)
        updateRouteAndEta();

        // Backup Interval (e.g. traffic changes even if location same)
        const interval = setInterval(updateRouteAndEta, 60000);

        return () => clearInterval(interval);
    }, [driverLocation, passengerLocation, updateRouteAndEta]);

    return {
        driverLocation,
        passengerLocation,
        routeCoordinates,
        eta,
        distance,
        isLoadingRoute,
        isServiceStopped
    };
};
