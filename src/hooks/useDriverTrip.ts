import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { getOptimizedTrip } from '../services/osmTripService';
// We might switch this to Google Optimization if available/paid, but sticking to OSRM (existing) or Google Directions for now
// The prompt said "Google Routes", which implies using Google Directions API even for the driver.
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

            // Start Location Updates
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

    // 4. Route Calculation
    useEffect(() => {
        if (!location || passengers.length === 0) return;

        const calculateRoute = async () => {
            try {
                // Simple logic: 
                // Origin: Current Drive Location
                // Destination: Last Passenger
                // Waypoints: All others
                // Google Directions API will optimize if we tell it to, or we respect order.
                // DirectionsService acts as a wrapper.

                const activePassengers = passengers.filter(p => {
                    const date = new Date().toISOString().split('T')[0];
                    const record = attendance.find(r => r.passengerId === p._id && r.date === date);
                    const status = record ? record.status : 'BEKLIYOR';

                    if (status === 'BINDI' || status === 'GELMEYECEK') return false;

                    if (!p.pickupLocation) {
                        console.warn(`Passenger ${p._id} has no pickupLocation.`);
                        return false;
                    }
                    const { latitude, longitude } = p.pickupLocation;
                    if (latitude === 0 || longitude === 0) {
                        console.warn(`Passenger ${p._did} has invalid pickupLocation (0,0).`);
                        return false;
                    }
                    return true;
                });

                if (activePassengers.length === 0) {
                    setRouteCoordinates([]);
                    console.log('No active passengers for route calculation.');
                    return;
                }

                const destination = activePassengers[activePassengers.length - 1].pickupLocation;
                // Waypoints excluding the last one (which is destination)
                const waypoints = activePassengers.slice(0, activePassengers.length - 1).map(p => p.pickupLocation);

                console.log('Calculating Route...');
                console.log('Origin:', location.coords);
                console.log('Dest:', destination);
                console.log('Waypoints:', waypoints);

                const result = await DirectionsService.getRoute(
                    location.coords,
                    destination,
                    waypoints
                );

                if (result) {
                    setRouteCoordinates(result.points);
                }
            } catch (error) {
                console.error("Route calculation error:", error);
            }
        };

        // Calculate initially and when passenger status changes (attendance)
        // We debounce or throttle this in production to save costs. 
        // For now, let's run it on attendance change or initial load.
        calculateRoute();

    }, [attendance, passengers.length, !!location]); // Re-run when attendance changes or passengers loaded

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
