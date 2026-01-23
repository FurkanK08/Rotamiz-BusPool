import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { socketService } from '../../services/socket';
import { api } from '../../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Map, MapMarker, Polyline } from '../../components/Map';
import { AnimatedMarker } from '../../components/Map/AnimatedMarker';
import * as Location from 'expo-location';

export const PassengerTrackingScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { serviceId, userId, service } = route.params || {};

    // Driver and Passenger Location
    const [driverLocation, setDriverLocation] = useState({
        latitude: 41.0082,
        longitude: 28.9784,
    });

    const [passengerLocation, setPassengerLocation] = useState<any>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [serviceDestination, setServiceDestination] = useState<any>(null);
    const mapRef = React.useRef<any>(null);

    const [userLocation, setUserLocation] = useState<any>(null);

    // Get passenger's own location
    // Get passenger's own location
    useEffect(() => {
        const getPassengerLoc = async () => {
            try {
                // 1. Try to get from User Profile first (fastest & most accurate for pickup)
                const { tokenService } = require('../../services/api');
                const user = await tokenService.getUser();
                if (user?.pickupLocation) {
                    setUserLocation(user.pickupLocation);
                    setPassengerLocation(user.pickupLocation);

                    // If we have saved location, we might not need to force GPS immediately, 
                    // but let's try to get live GPS in background for "Blue Dot" accuracy if they move.
                }

                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    // 2. Try Last Known (fast)
                    const lastKnown = await Location.getLastKnownPositionAsync({});
                    if (lastKnown && !user?.pickupLocation) {
                        setPassengerLocation({
                            latitude: lastKnown.coords.latitude,
                            longitude: lastKnown.coords.longitude
                        });
                    }

                    // 3. Get Fresh GPS
                    const loc = await Location.getCurrentPositionAsync({});
                    setPassengerLocation({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    });
                }
            } catch (e) {
                // Sadece geliştirme ortamında veya hiç konum bulunamadıysa logla
                if (!passengerLocation && !userLocation) {
                    console.log('Location fetch failed (using defaults/fallback).');
                }
            }
        };
        getPassengerLoc();
    }, []);

    // Load service destination
    useEffect(() => {
        const loadDest = async () => {
            try {
                const services = await api.services.getPassengerServices(userId);
                const current = services.find((s: any) => s._id === serviceId);
                if (current?.destination) {
                    setServiceDestination(current.destination);
                }
            } catch (e) {
                console.log('Error loading destination:', e);
            }
        };
        loadDest();
    }, [serviceId]);

    // Fetch route from driver to passenger
    useEffect(() => {
        const fetchRoute = async () => {
            if (driverLocation && passengerLocation) {
                try {
                    const route = await api.routing.getRoadRoute(
                        driverLocation.latitude,
                        driverLocation.longitude,
                        passengerLocation.latitude,
                        passengerLocation.longitude
                    );
                    setRouteCoordinates(route);
                    console.log('📍 Passenger route fetched:', route.length, 'points');
                } catch (e) {
                    console.log('Route fetch error:', e);
                }
            }
        };

        // Fetch route with debounce
        const timer = setTimeout(fetchRoute, 1000);
        return () => clearTimeout(timer);
    }, [driverLocation, passengerLocation]);

    // Helper
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // ETA calculation helper
    const calculateETA = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
        // Use getDistance here
        const distance = getDistance(lat1, lon1, lat2, lon2);

        // Assume average speed of 30 km/h in city traffic
        const avgSpeed = 30;
        const timeInHours = distance / avgSpeed;
        const timeInMinutes = Math.round(timeInHours * 60);

        return timeInMinutes > 0 ? `${timeInMinutes} dk` : '< 1 dk';
    };

    const [eta, setEta] = React.useState('Hesaplanıyor...');

    // Listen for socket updates
    React.useEffect(() => {
        const effectiveServiceId = serviceId || '1'; // Fallback to mock ID if testing directly

        socketService.connect();
        socketService.joinService(effectiveServiceId);

        socketService.subscribeToLocationUpdates((newLocation) => {
            console.log('New Location Received:', newLocation);
            setDriverLocation(newLocation);
            // Calculate ETA (assuming passenger at a fixed mock location)
            const passengerLat = 41.0082;
            const passengerLon = 28.9784;
            const calculatedETA = calculateETA(passengerLat, passengerLon, newLocation.latitude, newLocation.longitude);
            setEta(calculatedETA);
        });

        socketService.subscribeToServiceStop(() => {
            Alert.alert('Bilgi', 'Şoför seferi sonlandırdı.', [
                { text: 'Tamam', onPress: () => navigation.goBack() }
            ]);
        });

        // Listen for location request from driver
        socketService.subscribeToLocationRequest(async () => {
            console.log('Driver requested location');
            const loc = {
                latitude: 41.0082 + (Math.random() * 0.01),
                longitude: 28.9784 + (Math.random() * 0.01)
            };

            const currentUserId = userId || 'unknown_passenger';
            socketService.sendPassengerLocation(effectiveServiceId, currentUserId, loc);
            Alert.alert('Bilgi', 'Konumunuz sürücü ile paylaşıldı.');
        });

        return () => {
            socketService.disconnect();
        };
    }, [serviceId, userId, userLocation]);

    // Zoom & Map Controls
    const handleRecenter = () => {
        if (driverLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const handleZoomIn = async () => {
        if (mapRef.current) {
            try {
                const camera = await mapRef.current.getCamera();
                if (camera) {
                    camera.altitude = camera.altitude ? camera.altitude / 2 : 1000;
                    camera.zoom = camera.zoom ? camera.zoom + 1 : 10;
                    mapRef.current.animateCamera(camera);
                }
            } catch (e) {
                console.log('Zoom error:', e);
            }
        }
    };

    const handleZoomOut = async () => {
        if (mapRef.current) {
            try {
                const camera = await mapRef.current.getCamera();
                if (camera) {
                    camera.altitude = camera.altitude ? camera.altitude * 2 : 4000;
                    camera.zoom = camera.zoom ? camera.zoom - 1 : 8;
                    mapRef.current.animateCamera(camera);
                }
            } catch (e) {
                console.log('Zoom error:', e);
            }
        }
    };

    const zoomToService = () => {
        if (mapRef.current && driverLocation) {
            try {
                const camera = {
                    center: {
                        latitude: driverLocation.latitude,
                        longitude: driverLocation.longitude,
                    },
                    zoom: 15,
                    pitch: 0,
                };
                mapRef.current.animateCamera(camera, { duration: 500 });
            } catch (e) {
                console.log('Zoom to service error:', e);
            }
        }
    };

    const zoomToSelf = () => {
        if (!passengerLocation) {
            Alert.alert('Hata', 'Konumunuz henüz belirlenemedi.');
            return;
        }
        if (mapRef.current) {
            try {
                const camera = {
                    center: {
                        latitude: passengerLocation.latitude,
                        longitude: passengerLocation.longitude,
                    },
                    zoom: 17, // Closer zoom for self
                    pitch: 0,
                };
                mapRef.current.animateCamera(camera, { duration: 500 });
            } catch (e) {
                console.log('Zoom to self error:', e);
            }
        }
    };

    const handleLeaveService = () => {
        Alert.alert(
            'Servisten Ayrıl',
            'Bu servisten kalıcı olarak ayrılmak istediğinize emin misiniz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Ayrıl',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!userId || !serviceId) {
                                Alert.alert('Hata', 'Kullanıcı veya Servis bilgisi eksik.');
                                return;
                            }
                            await api.services.removePassenger(serviceId, userId);
                            Alert.alert('Başarılı', 'Servisten ayrıldınız.', [
                                { text: 'Tamam', onPress: () => navigation.navigate('PassengerHome') }
                            ]);
                        } catch (error) {
                            Alert.alert('Hata', 'İşlem başarısız oldu.');
                            console.error(error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.mapContainer}>
                <View style={{ flex: 1 }}>
                    <Map
                        mapRef={mapRef}
                        style={styles.map}
                        location={driverLocation}
                    >
                        {/* Driver Marker - ANIMATED */}
                        <AnimatedMarker
                            coordinate={driverLocation}
                            heading={(driverLocation as any).heading || 0}
                            duration={2000} // Socket updates usually faster than polling
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={styles.busMarker}>
                                <Text style={{ fontSize: 32 }}>🚌</Text>
                            </View>
                        </AnimatedMarker>

                        {/* Passenger's Own Location (Blue Dot Style) */}
                        {passengerLocation && (
                            <MapMarker coordinate={passengerLocation} zIndex={2}>
                                <View style={styles.myLocationOuter}>
                                    <View style={styles.myLocationInner} />
                                </View>
                            </MapMarker>
                        )}

                        {/* Service Destination */}
                        {serviceDestination && (
                            <MapMarker coordinate={{
                                latitude: serviceDestination.latitude,
                                longitude: serviceDestination.longitude
                            }}>
                                <View style={styles.destinationMarker}>
                                    <Text style={{ fontSize: 20 }}>🏁</Text>
                                </View>
                            </MapMarker>
                        )}

                        {/* Route Polyline - Driver to Passenger */}
                        {routeCoordinates.length > 0 && (
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="#007AFF"
                                strokeWidth={4}
                            />
                        )}
                    </Map>

                    {/* Map Controls */}
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
            </View>

            <View style={styles.overlay}>
                <View style={styles.driverInfo}>
                    <View style={styles.avatar}>
                        <Text style={{ fontSize: 20 }}>👮‍♂️</Text>
                    </View>
                    <View>
                        <Text style={styles.driverName}>{service?.driver?.name || service?.name || 'Sürücü'}</Text>
                        <Text style={styles.plate}>{service?.plate || 'Plaka Yok'}</Text>
                    </View>
                    <View style={styles.etaContainer}>
                        <Text style={styles.etaTitle}>VARIŞ</Text>
                        <Text style={styles.etaTime}>{eta}</Text>
                        {driverLocation && service?.driver && (
                            <Text style={styles.distanceText}>
                                {getDistance(
                                    driverLocation.latitude,
                                    driverLocation.longitude,
                                    userLocation?.latitude || 0,
                                    userLocation?.longitude || 0
                                ).toFixed(1)} km
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.statusText}>
                    {service?.active === false ? "Servis henüz başlamadı." : "Servis durağınıza yaklaşıyor."}
                </Text>

                <View style={styles.actionButtons}>
                    <Button
                        title="Geri Dön"
                        variant="outline"
                        onPress={() => navigation.goBack()}
                        style={styles.actionBtn}
                    />

                    <Button
                        title="Servisten Ayrıl"
                        variant="danger"
                        onPress={handleLeaveService}
                        style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]}
                        textStyle={{ color: COLORS.error }}
                    />
                </View>
            </View>

            {/* Location Quick Jump Buttons - Top Left of Map */}
            <View style={styles.quickJumpButtons}>
                <TouchableOpacity style={styles.jumpBtn} onPress={zoomToService}>
                    <Text style={styles.jumpIcon}>🚌</Text>
                    <Text style={styles.jumpText}>Servise Git</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.jumpBtn} onPress={zoomToSelf}>
                    <Text style={styles.jumpIcon}>📍</Text>
                    <Text style={styles.jumpText}>Bana Git</Text>
                </TouchableOpacity>
            </View>
        </View>
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
    busMarker: {
        backgroundColor: COLORS.white,
        padding: 8,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    // New GPS Style Marker
    myLocationOuter: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 122, 255, 0.3)', // Semi-transparent blue
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.5)',
    },
    myLocationInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#007AFF', // Solid iOS blue
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    destinationMarker: {
        backgroundColor: COLORS.white,
        padding: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.error,
    },
    mapControls: {
        position: 'absolute',
        right: 20,
        top: 100,
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
        shadowColor: '#000',
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
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    driverName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    distanceText: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: 'bold',
        marginTop: 4
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: SPACING.m
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.s
    },
    actionBtn: {
        flex: 1,
        marginHorizontal: 5
    },
    plate: {
        color: COLORS.textLight,
    },
    etaContainer: {
        marginLeft: 'auto',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: SPACING.s,
        borderRadius: 12,
    },
    etaTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    etaTime: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    statusText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    // Quick Jump Buttons - Top Left
    quickJumpButtons: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'column',
        gap: 8,
        zIndex: 100,
        elevation: 5,
    },
    jumpBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 140,
    },
    jumpIcon: {
        fontSize: 20,
        marginRight: 6,
    },
    jumpText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
});
