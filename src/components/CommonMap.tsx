import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Map, MapMarker, Polyline } from './Map'; // Existing wrapper
import mapStyle from '../constants/mapStyle.json';
import { COLORS, SHADOWS } from '../constants/theme';

interface CommonMapProps {
    role: 'DRIVER' | 'PASSENGER';
    driverLocation: any | null;
    userLocation?: any | null; // Passenger's own location or null
    passengers?: any[]; // For driver to see all
    routeCoordinates?: any[];
    onMapReady?: () => void;
    mapRef?: any;
}

export const CommonMap: React.FC<CommonMapProps> = ({
    role,
    driverLocation,
    userLocation,
    passengers = [],
    routeCoordinates = [],
    onMapReady,
    mapRef
}) => {
    // Internal ref fallback if not provided
    const internalRef = useRef<any>(null);
    const validRef = mapRef || internalRef;

    // Prevent camera from jumping around on every update
    const hasFittedRef = useRef(false);

    // Camera Logic
    useEffect(() => {
        if (!validRef.current) return;

        if (role === 'PASSENGER' && driverLocation && userLocation && !hasFittedRef.current) {
            // Passenger View: Fit Driver & Self ONLY ONCE initially
            validRef.current.fitToCoordinates([driverLocation, userLocation], {
                edgePadding: { top: 100, right: 50, bottom: 350, left: 50 }, // Bottom padding for card
                animated: true,
            });
            hasFittedRef.current = true;
        }

        // Driver logic is usually manual or "Follow Mode", handled by parent or different logic
        // But we can add a default "Follow Driver" if desired.
        // For now, we leave Driver camera control to the parent (ActiveTripScreen) to avoid fighting.

    }, [driverLocation, userLocation, role]);


    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.split(' ').filter(n => n.length > 0);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <Map
            mapRef={validRef}
            style={StyleSheet.absoluteFillObject}
            location={userLocation || driverLocation || { latitude: 41.0082, longitude: 28.9784, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            customMapStyle={mapStyle}
            showsUserLocation={false}
            onMapReady={onMapReady}
        >
            {/* Route Polyline - Black for Premium/Uber feel */}
            {routeCoordinates.length > 0 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#000000"
                    strokeWidth={4}
                />
            )}

            {/* Driver Marker - Bus Icon */}
            {driverLocation && (
                <MapMarker coordinate={driverLocation} zIndex={100} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.busMarker}>
                        <Text style={{ fontSize: 24 }}>🚐</Text>
                    </View>
                </MapMarker>
            )}

            {/* Passenger View: My Location */}
            {role === 'PASSENGER' && userLocation && (
                <MapMarker coordinate={userLocation} zIndex={50} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.myLocationOuter}>
                        <View style={styles.myLocationInner} />
                    </View>
                </MapMarker>
            )}

            {/* Driver View: All Passengers */}
            {role === 'DRIVER' && passengers.map(p => {
                if (!p.pickupLocation) return null;
                // Determine status (passed from parent usually, but here we assume 'p' has status or visual cue)
                // For now, simple marker
                return (
                    <MapMarker
                        key={p._id || p.id}
                        coordinate={{ latitude: p.pickupLocation.latitude, longitude: p.pickupLocation.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.passengerPin}>
                            <Text style={styles.passengerInitials}>{getInitials(p.name)}</Text>
                        </View>
                    </MapMarker>
                );
            })}
        </Map>
    );
};

const styles = StyleSheet.create({
    busMarker: {
        backgroundColor: '#FFC107', // Gold background
        padding: 6,
        borderRadius: 20, // Reduced radius
        borderWidth: 2,
        borderColor: 'black', // Stronger contrast
        ...SHADOWS.medium,
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        overflow: 'visible' // Ensure emoji isn't clipped
    },
    myLocationOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(33, 150, 243, 0.2)', // Blue halo
        justifyContent: 'center',
        alignItems: 'center',
    },
    myLocationInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#2196F3', // Blue dot
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    passengerPin: {
        backgroundColor: '#fff',
        borderColor: '#000',
        borderWidth: 1,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.light
    },
    passengerInitials: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000'
    }
});
