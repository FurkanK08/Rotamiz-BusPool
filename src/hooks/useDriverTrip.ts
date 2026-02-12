import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../services/socket';
import { api } from '../services/api';
// We stick to Google Directions for consistency
import { DirectionsService } from '../services/googleMaps/DirectionsService';

// Task name must match what was registered
const LOCATION_TASK_NAME = 'background-location-task';

export const useDriverTrip = (serviceId: string, driverId: string) => {
    // State
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [passengers, setPassengers] = useState<any[]>([]);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [service, setService] = useState<any>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Refs for accessing latest state in intervals/callbacks
    const locationRef = useRef<Location.LocationObject | null>(null);
    const passengersRef = useRef<any[]>([]);
    const attendanceRef = useRef<any[]>([]);

    useEffect(() => { locationRef.current = location; }, [location]);
    useEffect(() => { passengersRef.current = passengers; }, [passengers]);
    useEffect(() => { attendanceRef.current = attendance; }, [attendance]);

    // 1. Initial Data Load
    useEffect(() => {
        const load = async () => {
            try {
                const s = await api.services.getDriverServices(driverId);
                const current = s.find((x: any) => x._id === serviceId);
                if (current) {
                    setService(current);
                    setPassengers(current.passengers || []);
                    setAttendance(current.attendance || []);
                }
            } catch (e) {
                console.error("Load service error", e);
            }
        };
        load();

        // Polling for updates (simplified)
        const poll = setInterval(load, 15000);
        return () => clearInterval(poll);
    }, [serviceId, driverId]);

    // 2. Timer
    useEffect(() => {
        const timer = setInterval(() => setElapsedSeconds(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // 3. Location & Background Task
    useEffect(() => {
        const startTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            await Location.requestBackgroundPermissionsAsync();

            // Set ID for background task
            await AsyncStorage.setItem('activeServiceId', serviceId);

            // Connect Socket
            socketService.connect();
            socketService.joinService(serviceId);
            api.services.updateService(serviceId, { active: true });

            // Start Location Updates (Background)
            const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (!started) {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 20, // More frequent for smooth driver map
                    timeInterval: 2000,
                    foregroundService: {
                        notificationTitle: "Servis Aktif 🚐",
                        notificationBody: "Konum paylaşılıyor...",
                        notificationColor: '#000000'
                    },
                    showsBackgroundLocationIndicator: true
                });
            }

            // Foreground Watcher for UI
            const sub = await Location.watchPositionAsync({
                accuracy: Location.Accuracy.High,
                distanceInterval: 10
            }, (loc) => {
                setLocation(loc);
                // Also emit immediately for responsiveness
                socketService.sendLocation(serviceId, {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    heading: loc.coords.heading,
                    speed: loc.coords.speed
                });
            });

            return () => {
                sub.remove();
            };
        };

        const cleanup = startTracking();

        return () => {
            // We do NOT stop background updates here automatically on unmount 
            // because the driver might just background the app.
            // Explicit stop is needed (endTrip).
        };
    }, [serviceId]);

    // 4. Route Calculation Logic
    const calculateRoute = useCallback(async () => {
        const loc = locationRef.current;
        const pas = passengersRef.current;
        const att = attendanceRef.current;

        if (!loc || pas.length === 0) return;

        try {
            // 1. Filter Active Passengers
            const activePassengers = pas.filter(p => {
                const date = new Date().toISOString().split('T')[0];
                const record = att.find(r => r.passengerId === p._id && r.date === date);
                const status = record ? record.status : 'BEKLIYOR';

                // Skip passengers who already boarded or won't come
                if (status === 'BINDI' || status === 'GELMEYECEK') return false;

                if (!p.pickupLocation || !p.pickupLocation.latitude) {
                    return false;
                }
                return true;
            });

            if (activePassengers.length === 0) {
                setRouteCoordinates([]);
                return;
            }

            // 2. Determine Destination & Waypoints
            // Logic: Assume last active passenger is destination for now
            // Ideally, we should optimize or have a fixed destination (school/work)
            const destination = activePassengers[activePassengers.length - 1].pickupLocation;
            const waypoints = activePassengers.slice(0, activePassengers.length - 1).map(p => p.pickupLocation);

            // 3. Call Directions API
            console.log('[useDriverTrip] Requesting Route:', {
                origin: loc.coords,
                destination,
                waypointsCount: waypoints.length
            });

            const result = await DirectionsService.getRoute(
                loc.coords,
                destination,
                waypoints
            );

            if (result) {
                setRouteCoordinates(result.points);
            }
        } catch (error) {
            console.error("Route calculation error:", error);
        }
    }, []);

    // 5. Trigger Route Calculation
    useEffect(() => {
        // Calculate initially when data is ready
        if (location && passengers.length > 0) {
            calculateRoute();
        }

        // Re-calculate periodically (every 60s) to update ETA/Route from current location
        const interval = setInterval(() => {
            calculateRoute();
        }, 60000);

        return () => clearInterval(interval);
    }, [
        // Dependencies for effect re-run (not for calculation, refs handle that)
        // We re-run if attendance changes to update waypoints immediately
        attendance,
        passengers.length,
        // We add location existence check to start interval only when location is available
        !!location
    ]);

    return {
        location,
        passengers,
        routeCoordinates,
        elapsedSeconds,
        service,
        attendance,
        setAttendance, // to update manually
        setRouteCoordinates // to update manually
    };
};
