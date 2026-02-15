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
                // 1. Fetch Service & Passengers
                const s = await api.services.getDriverServices(driverId);
                const current = s.find((x: any) => x._id === serviceId);

                if (current) {
                    setService(current);
                    setPassengers(current.passengers || []);

                    // 2. Fetch Attendance Separately (New Architecture)
                    const today = new Date().toISOString().split('T')[0];
                    const attRecords = await api.services.getAttendance(serviceId, today);
                    setAttendance(attRecords || []);
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

    // 2. Timer with persistence
    useEffect(() => {
        const initTimer = async () => {
            const savedStart = await AsyncStorage.getItem(`trip_start_${serviceId}`);
            const startTime = savedStart ? parseInt(savedStart) : Date.now();
            if (!savedStart) {
                await AsyncStorage.setItem(`trip_start_${serviceId}`, startTime.toString());
            }
            // O8 FIX: Calculate elapsed from saved start time
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        };
        initTimer();

        const timer = setInterval(() => setElapsedSeconds(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, [serviceId]);

    // 3. Location & Background Task
    useEffect(() => {
        let cleanupFn: (() => void) | null = null;

        const startTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            await Location.requestBackgroundPermissionsAsync();

            // Set ID for background task
            await AsyncStorage.setItem('activeServiceId', serviceId);

            // Connect Socket with auth token
            const token = await AsyncStorage.getItem('auth_token');
            socketService.connect(token || undefined);
            socketService.joinService(serviceId);
            api.services.updateService(serviceId, { active: true });

            // Start Location Updates (Background)
            const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (!started) {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 20,
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
                socketService.sendLocation(serviceId, {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    heading: loc.coords.heading,
                    speed: loc.coords.speed
                });
            });

            // K5 FIX: Store cleanup ref so useEffect return can call it
            cleanupFn = () => sub.remove();
        };

        startTracking();

        return () => {
            // K5 FIX: properly remove foreground watcher on unmount
            if (cleanupFn) cleanupFn();
        };
    }, [serviceId]);

    // 6. Socket Listener for Real-time Passenger Updates
    useEffect(() => {
        const sub = socketService.subscribeToPassengerLocation((data) => {
            const { passengerId, location: newLoc } = data;
            console.log(`[useDriverTrip] Real-time location update for ${passengerId}`);

            setPassengers(prev => prev.map(p => {
                if (p._id === passengerId) {
                    return { ...p, pickupLocation: { ...p.pickupLocation, ...newLoc } }; // Update location
                }
                return p;
            }));
        });
        return () => sub.unsubscribe();
    }, []);

    // 4. Route Calculation Logic
    const [activePassengers, setActivePassengers] = useState<any[]>([]);

    const calculateRoute = useCallback(async () => {
        const loc = locationRef.current;
        const pas = passengersRef.current;
        const att = attendanceRef.current;

        if (!loc || pas.length === 0) return;

        try {
            // 1. Filter Active Passengers
            const currentActive = pas.filter(p => {
                const date = new Date().toISOString().split('T')[0];
                const record = att.find(r => {
                    // K5 FIX: Normalize date comparison (Backend returns ISO, local is YYYY-MM-DD)
                    const rDate = typeof r.date === 'string' ? r.date.split('T')[0] : r.date;
                    return r.passengerId === p._id && rDate === date;
                });
                const status = record ? record.status : 'BEKLIYOR';

                // Debug Log
                if (status !== 'BEKLIYOR') {
                    console.log(`[useDriverTrip] Filtering passenger ${p.name} (${p._id}) - Status: ${status}`);
                }

                // Skip passengers who already boarded OR marked as BINMEDI OR GELMEYECEK
                if (status === 'BINDI' || status === 'GELMEYECEK' || status === 'BINMEDI') return false;

                if (!p.pickupLocation || !p.pickupLocation.latitude) {
                    return false;
                }
                return true;
            });

            console.log(`[useDriverTrip] Active Passengers Count: ${currentActive.length}/${pas.length}`);

            if (currentActive.length === 0) {
                setActivePassengers([]);
                setRouteCoordinates([]);
                return;
            }

            // O1 FIX: Use service destination as route endpoint
            const svc = service;
            const destination = (svc && svc.destination && svc.destination.latitude)
                ? svc.destination
                : currentActive[currentActive.length - 1].pickupLocation;

            // Pass *original* active list to get waypoints
            const waypoints = currentActive.map(p => p.pickupLocation);

            // 3. Call Directions API
            const result = await DirectionsService.getRoute(
                loc.coords,
                destination,
                waypoints
            );

            if (result) {
                setRouteCoordinates(result.points);

                // TSP Sorting: Reorder activePassengers based on waypointOrder
                if (result.waypointOrder && result.waypointOrder.length > 0) {
                    const sorted = result.waypointOrder.map(index => currentActive[index]);
                    setActivePassengers(sorted);
                } else {
                    // Fallback if no order returned (e.g. 0 or 1 waypoint)
                    setActivePassengers(currentActive);
                }
            } else {
                setActivePassengers(currentActive);
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
        activePassengers, // New exposed field
        routeCoordinates,
        elapsedSeconds,
        service,
        attendance,
        setAttendance, // to update manually
        setRouteCoordinates // to update manually
    };
};
