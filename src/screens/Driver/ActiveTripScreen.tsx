import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, AppState, Modal, FlatList, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { socketService } from '../../services/socket';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Map, MapMarker, Polyline } from '../../components/Map';
import { AnimatedMarker } from '../../components/Map/AnimatedMarker';
import { TopBanner } from '../../components/TopBanner';
import { api } from '../../services/api';
import { getOptimizedTrip } from '../../services/osmTripService';

const LOCATION_TASK_NAME = 'background-location-task';

// Haversine distance helper (returns km)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ... (TaskManager definition remains the same)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location Task Error:', error);
        return;
    }
    if (data) {
        const { locations } = data as any;
        const location = locations[0];

        if (location) {
            try {
                const serviceId = await AsyncStorage.getItem('activeServiceId');
                if (serviceId) {
                    if (!socketService.socket?.connected) {
                        socketService.connect();
                    }
                    const payload = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        speed: location.coords.speed,
                        heading: location.coords.heading
                    };
                    socketService.sendLocation(serviceId, payload);
                }
            } catch (err) {
                console.error('Background Task Error:', err);
            }
        }
    }
});

export const ActiveTripScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { serviceId, driverId } = route.params;

    // Timer State
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Location State
    const [location, setLocation] = useState<Location.LocationObject | null>(null);

    // Notification State
    const [bannerVisible, setBannerVisible] = useState(false);
    const [bannerMessage, setBannerMessage] = useState('');

    // Request Logic State
    const [lastRequestTime, setLastRequestTime] = useState(0);

    // Passenger & Attendance State
    const [passengers, setPassengers] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        // Start Timer
        const timerInterval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        const loadServiceData = async () => {
            try {
                // Fetch Service Details (Passengers & Attendance)
                const services = await api.services.getDriverServices(driverId);
                const currentService = services.find((s: any) => s._id === serviceId || s.id === serviceId);

                if (currentService) {
                    console.log('✅ Initial Service Data Loaded. Passengers:', currentService.passengers?.length);
                    setPassengers(currentService.passengers || []);
                    setAttendance(currentService.attendance || []);
                }
            } catch (e) {
                console.log("Initial data load error:", e);
            }
        };

        const startBackgroundTracking = async () => {
            // 1. Permissions
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            if (fgStatus !== 'granted') {
                Alert.alert('İzin Gerekli', 'Konum izni olmadan takip yapılamaz.');
                return;
            }

            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus !== 'granted') {
                Alert.alert(
                    'Arka Plan İzni',
                    'Konum paylaşımının ekran kapalıyken de çalışması için ayarlardan "Her zaman izin ver" seçeneğini seçmelisiniz.',
                    [{ text: 'Ayarları Aç', onPress: () => Location.enableNetworkProviderAsync() }]
                );
            }

            // 2. Initial Location & Service Data
            try {
                // Try last known first for immediate UI
                const lastKnown = await Location.getLastKnownPositionAsync({});
                if (lastKnown) {
                    setLocation(lastKnown);
                }

                // Get fresh for accuracy
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setLocation(loc);

            } catch (e) {
                console.log('Initial setup error:', e);
                // Fallback default
                setLocation({
                    coords: { latitude: 41.0082, longitude: 28.9784, accuracy: 0, altitude: 0, heading: 0, speed: 0 },
                    timestamp: Date.now()
                } as any);
            }

            // 3. Setup active service ID for background task
            await AsyncStorage.setItem('activeServiceId', serviceId);

            // 4. Connect Socket && Set Active Status
            socketService.connect();
            socketService.joinService(serviceId);

            try {
                await api.services.updateService(serviceId, { active: true });
            } catch (err) {
                console.warn('Failed to set service active:', err);
            }

            // 5. Start Background Updates with OPTIMIZED battery settings
            try {
                const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                if (!hasStarted) {
                    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                        // Battery Optimization: Balanced accuracy
                        accuracy: Location.Accuracy.Balanced,
                        // Only update if moved 50m (was 10m)
                        distanceInterval: 50,
                        // Maximum every 5 seconds (was 2s)
                        timeInterval: 5000,
                        foregroundService: {
                            notificationTitle: "Servis Konum Paylaşıyor 📍",
                            notificationBody: "Konumu görüntülemek için dokunun.",
                            notificationColor: COLORS.primary
                        },
                        showsBackgroundLocationIndicator: true,
                        pausesUpdatesAutomatically: false
                    });
                }
            } catch (err) {
                console.error('Failed to start background location:', err);
                Alert.alert('Hata', 'Arka plan takibi başlatılamadı: ' + (err as any).message);
            }
        };

        loadServiceData(); // Call immediately
        startBackgroundTracking();

        // 6. Listen for Passenger Updates
        const sub = socketService.subscribeToPassengerLocation((data) => {
            console.log('Passenger Location:', data);
            setBannerMessage(`Yolcu ${data.passengerId} konumu alındı! 📍`);
            setBannerVisible(true);
        });

        // --- SIMULATION MODE FOR TESTING ---
        // If Service Code is 'TEST', simulate movement locally
        let simInterval: NodeJS.Timeout;
        const checkSimulation = async () => {
            const services = await api.services.getDriverServices(driverId);
            const currentService = services.find((s: any) => s._id === serviceId);

            if (currentService?.code === 'TEST') {
                console.log('🧪 TEST MODE DETECTED: Starting internal simulation...');
                Alert.alert('Test Modu', 'Test servisi algılandı. Sürüş simülasyonu başlatılıyor.');

                // Start from Merter/Zeytinburnu (West of passengers)
                let lat = 41.0110;
                let lon = 28.9150;

                simInterval = setInterval(() => {
                    // Move East/North-East along E5 roughly
                    lat += 0.00005; // Slower latitude change
                    lon += 0.00015; // Faster longitude change (moving East)

                    const newLoc = {
                        coords: {
                            latitude: lat,
                            longitude: lon,
                            accuracy: 10,
                            altitude: 0,
                            heading: 0,
                            speed: 10, // 10 m/s ~ 36 km/h
                        },
                        timestamp: Date.now(),
                    };

                    setLocation(newLoc as any);

                    // CRITICAL FIX: Emit location via socket (was missing!)
                    socketService.sendLocation(serviceId, {
                        latitude: lat,
                        longitude: lon,
                    });

                    console.log('🧪 Simulated location:', lat, lon);
                }, 3000); // Every 3 seconds
            }
        };

        checkSimulation();

        // Polling for Service Updates (incase new passengers join)
        const pollInterval = setInterval(async () => {
            try {
                const services = await api.services.getDriverServices(driverId);
                const current = services.find((s: any) => s._id === serviceId);
                if (current) {
                    // Update passengers if changed
                    if (JSON.stringify(current.passengers) !== JSON.stringify(passengers)) {
                        console.log('👥 Passenger list updated:', current.passengers.length);
                        setPassengers(current.passengers || []);
                    }
                    // Update attendance if changed (and not locally modified pending save - simplified here)
                    if (JSON.stringify(current.attendance) !== JSON.stringify(attendance)) {
                        setAttendance(current.attendance || []);
                    }
                }
            } catch (e) {
                console.log('Service poll error:', e);
            }
        }, 10000); // Poll every 10 seconds

        // Cleanup
        return () => {
            clearInterval(timerInterval);
            clearInterval(pollInterval);
            if (simInterval) clearInterval(simInterval);
            socketService.disconnect();

            Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then(started => {
                if (started) {
                    Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(e => console.log('Stop ignored in cleanup:', e));
                }
            });
        };
    }, []); // Check dependencies carefully. Effectively empty here as we use refs/fresh fetches inside.

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        if (mins < 1) return 'Az önce başladı';
        return `${mins} dk'dır yolda`;
    };

    const handleRequestLocation = () => {
        const now = Date.now();
        if (now - lastRequestTime < 10000) {
            Alert.alert('Bekleyiniz', 'Çok sık istek gönderiyorsunuz.');
        } else {
            socketService.requestPassengerLocation(serviceId);
            setLastRequestTime(now);
            setBannerMessage('Yolculara konum isteği gönderildi 📡');
            setBannerVisible(true);
        }
    };

    const handleAttendance = async (passengerId: string, status: 'BINDI' | 'BINMEDI') => {
        await submitAttendance(passengerId, status);
    };

    const submitAttendance = async (passengerId: string, status: 'BINDI' | 'BINMEDI') => {
        try {
            const date = new Date().toISOString().split('T')[0];
            const updatedList = await api.services.updateAttendance(serviceId, passengerId, status, date);
            setAttendance(updatedList);
        } catch (e) {
            Alert.alert('Hata', 'Durum güncellenemedi');
        }
    };

    const handleEndTrip = async () => {
        Alert.alert(
            'Seferi Bitir',
            'Seferi sonlandırmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Bitir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const date = new Date().toISOString().split('T')[0];
                            await api.services.resetAttendance(serviceId, date);
                            await api.services.updateService(serviceId, { active: false }).catch((err: any) => console.log('Update active failed', err));

                            try {
                                const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                                if (hasStarted) {
                                    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                                }
                            } catch (e) {
                                console.log('Stop Location Error (Ignored):', e);
                            }

                            await AsyncStorage.removeItem('activeServiceId');
                            socketService.stopService(serviceId);
                            navigation.navigate('DriverDashboard', { userId: driverId });
                        } catch (err) {
                            console.error('Error stopping service:', err);
                            navigation.navigate('DriverDashboard', { userId: driverId });
                        }
                    }
                }
            ]
        );
    };

    const getPassengerStatus = (id: string) => {
        const date = new Date().toISOString().split('T')[0];
        const record = attendance.find(r => r.passengerId === id && r.date === date);
        return record ? record.status : 'BEKLIYOR';
    };

    // Sort passengers by distance for routing
    const getSortedPassengers = () => {
        if (!location?.coords || !passengers.length) return passengers;

        const driverLat = location.coords.latitude;
        const driverLon = location.coords.longitude;

        return [...passengers].sort((a, b) => {
            if (!a.pickupLocation || !b.pickupLocation) return 0;
            const distA = getDistance(driverLat, driverLon, a.pickupLocation.latitude, a.pickupLocation.longitude);
            const distB = getDistance(driverLat, driverLon, b.pickupLocation.latitude, b.pickupLocation.longitude);
            // Push absent passengers to the end
            const aAbsent = getPassengerStatus(a._id) === 'GELMEYECEK';
            const bAbsent = getPassengerStatus(b._id) === 'GELMEYECEK';
            if (aAbsent && !bAbsent) return 1;
            if (!aAbsent && bAbsent) return -1;
            return distA - distB;
        });
    };

    const sortedPassengers = getSortedPassengers();

    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [serviceDestination, setServiceDestination] = useState<any>(null);

    // Initial load: Get destination
    useEffect(() => {
        const loadServiceDetails = async () => {
            try {
                const services = await api.services.getDriverServices(driverId);
                const current = services.find((s: any) => s._id === serviceId);
                if (current?.destination) {
                    setServiceDestination(current.destination);
                }
            } catch (e) {
                console.log("Error loading service dest", e);
            }
        };
        loadServiceDetails();
    }, [serviceId]);

    // Calculate OPTIMIZED Route using OSRM Trip Service (TSP Solver)
    useEffect(() => {
        const fetchRoute = async () => {
            if (!location?.coords || passengers.length === 0) return;

            // 1. Filter Active Passengers
            const activePassengers = passengers.filter(p => getPassengerStatus(p._id) !== 'GELMEYECEK' && p.pickupLocation);
            if (activePassengers.length === 0 && !serviceDestination) return;

            try {
                // 2. Build waypoints for OSRM Trip
                const waypoints = [
                    // Start: Driver's current location
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    },
                    // Middle: All active passengers
                    ...activePassengers.map(p => ({
                        latitude: p.pickupLocation.latitude,
                        longitude: p.pickupLocation.longitude,
                        id: p._id // Keep reference
                    })),
                    // End: Service destination (if exists)
                    ...(serviceDestination ? [{
                        latitude: serviceDestination.latitude,
                        longitude: serviceDestination.longitude
                    }] : [])
                ];

                // Short-circuit if only driver + destination
                if (waypoints.length === 2 && serviceDestination) {
                    const directRoute = await api.routing.getRoadRoute(
                        waypoints[0].latitude,
                        waypoints[0].longitude,
                        waypoints[1].latitude,
                        waypoints[1].longitude
                    );
                    setRouteCoordinates(directRoute);
                    console.log('📍 Direct route (no passengers):', directRoute.length, 'points');
                    return;
                }

                // 3. Call OSRM Trip Service for TSP optimization
                const optimizedTrip = await getOptimizedTrip(waypoints, {
                    source: 'first',           // Driver is always starting point
                    destination: serviceDestination ? 'last' : 'any', // Destination if set
                    roundtrip: false           // One-way trip
                });

                if (optimizedTrip) {
                    // Use the optimized route coordinates
                    setRouteCoordinates(optimizedTrip.routeCoordinates);

                    console.log('🎯 OSRM Trip Optimization SUCCESS');
                    console.log('  Waypoints:', waypoints.length);
                    console.log('  Total Distance:', optimizedTrip.distance, 'm');
                    console.log('  Total Duration:', optimizedTrip.duration, 's');
                    console.log('  Route Points:', optimizedTrip.routeCoordinates.length);


                    // Log the optimized order (for verification)
                    const order = optimizedTrip.waypoints.map((wp: any, idx: number) => {
                        if (idx === 0) return 'Driver (start)';
                        if (serviceDestination && idx === optimizedTrip.waypoints.length - 1) {
                            return 'Destination (end)';
                        }
                        return `Passenger ${idx}`;
                    });
                    console.log('  Optimized Order:', order.join(' → '));
                } else {
                    // Fallback: If OSRM fails, use simple greedy as backup
                    console.warn('⚠️ OSRM Trip failed, using greedy fallback');
                    await fallbackGreedyRoute(activePassengers);
                }
            } catch (e) {
                console.error('OSRM Trip error:', e);
                console.log('🔄 Falling back to greedy algorithm');
                await fallbackGreedyRoute(activePassengers);
            }
        };

        // Fallback Greedy algorithm (previous implementation)
        const fallbackGreedyRoute = async (activePassengers: any[]) => {
            let fullRoute: any[] = [];
            let currentLat = location!.coords.latitude;
            let currentLon = location!.coords.longitude;

            // Greedy Sort (Nearest Neighbor)
            let remaining = [...activePassengers];
            const orderedPoints = [];
            let curr = { latitude: currentLat, longitude: currentLon };

            while (remaining.length > 0) {
                let nearestIdx = -1;
                let minDist = Infinity;

                for (let i = 0; i < remaining.length; i++) {
                    const p = remaining[i];
                    const d = getDistance(curr.latitude, curr.longitude, p.pickupLocation.latitude, p.pickupLocation.longitude);
                    if (d < minDist) {
                        minDist = d;
                        nearestIdx = i;
                    }
                }

                if (nearestIdx !== -1) {
                    const nextPassenger = remaining[nearestIdx];
                    orderedPoints.push(nextPassenger);
                    curr = {
                        latitude: nextPassenger.pickupLocation.latitude,
                        longitude: nextPassenger.pickupLocation.longitude
                    };
                    remaining.splice(nearestIdx, 1);
                } else {
                    break;
                }
            }

            // Fetch OSRM Route Segments
            try {
                if (orderedPoints.length > 0) {
                    const p1 = orderedPoints[0];
                    const seg1 = await api.routing.getRoadRoute(
                        location!.coords.latitude,
                        location!.coords.longitude,
                        p1.pickupLocation.latitude,
                        p1.pickupLocation.longitude
                    );
                    fullRoute = [...fullRoute, ...seg1];

                    for (let i = 0; i < orderedPoints.length - 1; i++) {
                        const start = orderedPoints[i];
                        const end = orderedPoints[i + 1];
                        const seg = await api.routing.getRoadRoute(
                            start.pickupLocation.latitude, start.pickupLocation.longitude,
                            end.pickupLocation.latitude, end.pickupLocation.longitude
                        );
                        fullRoute = [...fullRoute, ...seg];
                    }

                    if (serviceDestination) {
                        const last = orderedPoints[orderedPoints.length - 1];
                        const segLast = await api.routing.getRoadRoute(
                            last.pickupLocation.latitude, last.pickupLocation.longitude,
                            serviceDestination.latitude, serviceDestination.longitude
                        );
                        fullRoute = [...fullRoute, ...segLast];
                    }
                } else if (serviceDestination) {
                    const seg = await api.routing.getRoadRoute(
                        location!.coords.latitude, location!.coords.longitude,
                        serviceDestination.latitude, serviceDestination.longitude
                    );
                    fullRoute = [...fullRoute, ...seg];
                }

                setRouteCoordinates(fullRoute);
                console.log('🔄 Greedy fallback route:', fullRoute.length, 'points');
            } catch (e) {
                console.log('Greedy route fetch error:', e);
            }
        };

        const timer = setTimeout(() => {
            fetchRoute();
        }, 1000);

        return () => clearTimeout(timer);

    }, [passengers.length, attendance, serviceDestination]); // removed 'location.coords' to avoid spam, reruns when list changes.

    const mapRef = React.useRef<any>(null);

    const handleRecenter = () => {
        if (location?.coords && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const handleZoomIn = async () => {
        if (mapRef.current) {
            const camera = await mapRef.current.getCamera();
            camera.altitude /= 2;
            camera.zoom += 1;
            mapRef.current.animateCamera(camera);
        }
    };

    const handleZoomOut = async () => {
        if (mapRef.current) {
            const camera = await mapRef.current.getCamera();
            camera.altitude *= 2;
            camera.zoom -= 1;
            mapRef.current.animateCamera(camera);
        }
    };

    // Zoom to specific passenger location
    const handleZoomToPassenger = (passenger: any) => {
        if (mapRef.current && passenger.pickupLocation) {
            setModalVisible(false); // Close modal first
            setTimeout(() => {
                try {
                    const camera = {
                        center: {
                            latitude: passenger.pickupLocation.latitude,
                            longitude: passenger.pickupLocation.longitude,
                        },
                        zoom: 16,
                        pitch: 0,
                    };
                    mapRef.current.animateCamera(camera, { duration: 500 });
                } catch (e) {
                    console.log('Zoom to passenger error:', e);
                }
            }, 300); // Small delay for modal close animation
        }
    };

    // Helper for initials
    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.split(' ').filter(n => n.length > 0);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <View style={styles.container}>
            <TopBanner
                message={bannerMessage}
                visible={bannerVisible}
                onHide={() => setBannerVisible(false)}
            />
            {/* ... Map Container Code ... */}
            <View style={styles.mapContainer}>
                {location ? (
                    <View style={{ flex: 1 }}>
                        <Map
                            mapRef={mapRef}
                            style={styles.map}
                            location={location.coords}
                        // Removing controlled region to allow pan/zoom
                        // region={{...}} 
                        >
                            {/* Driver Marker */}
                            {/* Driver Marker - ANIMATED */}
                            {location && (
                                <AnimatedMarker
                                    coordinate={location.coords}
                                    heading={location.coords.heading || 0}
                                    duration={4000} // Slightly less than update interval (5000)
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View style={[styles.busMarker]}>
                                        {/* Rotate the inner view or container based on heading */}
                                        <Text style={{ fontSize: 20 }}>🚌</Text>
                                    </View>
                                </AnimatedMarker>
                            )}

                            {/* Route Line */}
                            {routeCoordinates.length > 0 && (
                                <Polyline
                                    coordinates={routeCoordinates}
                                    strokeColor={COLORS.primary}
                                    strokeWidth={4}
                                />
                            )}

                            {/* Passenger Markers */}
                            {passengers.map(p => {
                                const status = getPassengerStatus(p._id);
                                if (status === 'GELMEYECEK') return null;

                                return p.pickupLocation ? (
                                    <MapMarker
                                        key={p._id}
                                        coordinate={{
                                            latitude: p.pickupLocation.latitude,
                                            longitude: p.pickupLocation.longitude
                                        }}
                                    >
                                        <View style={[styles.passengerMarker, status === 'BINDI' && styles.passengerMarkerActive]}>
                                            <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>{getInitials(p.name)}</Text>
                                        </View>
                                    </MapMarker>
                                ) : null;
                            })}
                        </Map>

                        {/* Map Controls (Top Right) */}
                        <View style={styles.mapControls}>
                            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn}>
                                <Text style={styles.controlText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut}>
                                <Text style={styles.controlText}>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.controlBtn, { marginTop: 10 }]} onPress={handleRecenter}>
                                <Text style={styles.controlText}>🎯</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.loadingContainer}>
                        <Text>Konum alınıyor...</Text>
                    </View>
                )}
            </View>

            {/* Passenger List Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.passengerListContainer}>
                    <View style={styles.dragHandle} />
                    <Text style={styles.listTitle}>Yolcu Listesi ({passengers.length})</Text>

                    <FlatList
                        data={sortedPassengers} // Use sorted list
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => {
                            const status = getPassengerStatus(item._id);
                            const isAbsent = status === 'GELMEYECEK';

                            // Calculate distance
                            let distStr = '-';
                            let timeStr = '';
                            if (location && item.pickupLocation) {
                                const d = getDistance(
                                    location.coords.latitude,
                                    location.coords.longitude,
                                    item.pickupLocation.latitude,
                                    item.pickupLocation.longitude
                                );
                                distStr = d.toFixed(1) + ' km';

                                // Estimate time: assume average speed 30km/h inside city if speed is low
                                const speedKmh = (location.coords.speed || 0) * 3.6;
                                const effectiveSpeed = speedKmh > 10 ? speedKmh : 30;
                                const minutes = (d / effectiveSpeed) * 60;
                                timeStr = `(~${Math.ceil(minutes)} dk)`;
                            }

                            return (
                                <View style={[styles.passengerRow, isAbsent && { opacity: 0.5 }]}>
                                    <View style={styles.passengerInfo}>
                                        <Text style={styles.passengerName}>{item.name || item.phoneNumber}</Text>
                                        <Text style={[styles.passengerStatus, isAbsent && { color: COLORS.error, fontWeight: 'bold' }]}>
                                            {isAbsent ? 'GELMEYECEK (İzinli)' : `${status} • ${distStr} ${timeStr}`}
                                        </Text>
                                    </View>
                                    {!isAbsent && (
                                        <View style={styles.buttonContainer}>
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity
                                                    style={[styles.statusBtn, styles.btnIn, status === 'BINDI' && styles.btnActive]}
                                                    onPress={() => handleAttendance(item._id, 'BINDI')}
                                                >
                                                    <Text style={styles.btnText}>Bindi</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusBtn, styles.btnOut, status === 'BINMEDI' && styles.btnActive]}
                                                    onPress={() => handleAttendance(item._id, 'BINMEDI')}
                                                >
                                                    <Text style={styles.btnText}>Yok</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {item.pickupLocation && (
                                                <TouchableOpacity
                                                    style={[styles.locationBtn]}
                                                    onPress={() => handleZoomToPassenger(item)}
                                                >
                                                    <Text style={styles.locationBtnText}>📍 Konuma Git</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        }}
                    />
                </View>
            </Modal>

            <View style={styles.overlay}>
                <View style={styles.statusHeader}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.dot} />
                        <Text style={styles.liveText}>CANLI YAYIN</Text>
                    </View>
                    <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
                </View>

                <View style={[styles.controls, { marginBottom: 10 }]}>
                    <Button
                        title={`Yoklama Listesi (${passengers.filter(p => getPassengerStatus(p._id) !== 'BEKLIYOR').length}/${passengers.length})`}
                        onPress={() => setModalVisible(true)}
                        variant="secondary"
                        style={{ flex: 1 }}
                    />
                </View>

                <View style={styles.controls}>
                    <Button
                        title="Yolcu Konumu İste"
                        onPress={handleRequestLocation}
                        variant="primary" // Changed to primary to distinguish
                        style={{ flex: 1, marginRight: SPACING.s }}
                    />
                    <Button
                        title="Seferi Bitir"
                        onPress={handleEndTrip}
                        variant="danger"
                        style={{ flex: 1, marginLeft: SPACING.s }}
                    />
                </View>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    busMarker: {
        backgroundColor: COLORS.white,
        padding: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    mapControls: {
        position: 'absolute',
        right: 20,
        top: 100, // Safe top position
        alignItems: 'center',
    },
    controlBtn: {
        backgroundColor: 'white',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    controlText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    passengerMarker: {
        backgroundColor: COLORS.error,
        padding: 5,
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'white'
    },
    passengerMarkerActive: {
        backgroundColor: COLORS.success,
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.l,
        paddingBottom: SPACING.xl,
        ...SHADOWS.medium,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: SPACING.m,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginRight: 6,
    },
    liveText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 12,
    },
    timer: {
        color: COLORS.textLight,
        fontWeight: '600',
    },
    controls: {
        flexDirection: 'row',
    },
    // Modal Styles
    modalView: {
        flex: 1,
        marginTop: 100,
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text
    },
    closeButton: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16
    },
    passengerRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    passengerInfo: {
        marginBottom: 8,
    },
    passengerName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text
    },
    passengerStatus: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2
    },
    buttonContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 8
    },
    btnIn: {
        backgroundColor: '#e0e0e0'
    },
    btnOut: {
        backgroundColor: '#ffebee'
    },
    btnActive: {
        backgroundColor: COLORS.success, // or error for Out
        borderWidth: 1,
        borderColor: COLORS.text
    },
    btnLocation: {
        backgroundColor: COLORS.primary,
    },
    btnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.text
    },
    locationBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
    },
    locationBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    passengerListContainer: {
        flex: 1,
        marginTop: 100,
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 10
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
        textAlign: 'center'
    }
});
