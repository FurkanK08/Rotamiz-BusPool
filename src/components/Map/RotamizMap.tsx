import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import MapView, { PROVIDER_DEFAULT, MapViewProps, Region } from 'react-native-maps';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { CLEAN_MAP_STYLE } from './mapStyle';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface LatLng {
    latitude: number;
    longitude: number;
}

interface RotamizMapProps extends MapViewProps {
    fitToElements?: boolean;
    fitPadding?: { top: number; right: number; bottom: number; left: number };
    elementsToFit?: LatLng[]; // Array of coordinates to include in view
    showFollowButton?: boolean;
    onFollowPress?: () => void;
    isFollowing?: boolean;
}

export interface RotamizMapRef {
    animateToRegion: (region: Region, duration?: number) => void;
    fitToCoordinates: (coordinates: LatLng[], options?: any) => void;
    animateCamera: (camera: any, options?: any) => void;
    map: MapView | null;
}

export const RotamizMap = forwardRef<RotamizMapRef, RotamizMapProps>(({
    style,
    children,
    fitToElements,
    fitPadding = { top: 50, right: 20, bottom: 20, left: 20 },
    elementsToFit,
    showFollowButton,
    onFollowPress,
    isFollowing,
    ...props
}, ref) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
        animateToRegion: (region, duration) => mapRef.current?.animateToRegion(region, duration),
        fitToCoordinates: (coords, options) => mapRef.current?.fitToCoordinates(coords, options),
        animateCamera: (camera, options) => mapRef.current?.animateCamera(camera, options),
        map: mapRef.current,
    }));

    // Auto-fit logic
    useEffect(() => {
        if (fitToElements && elementsToFit && elementsToFit.length >= 2 && !isFollowing) {
            // Valid coordinates only
            const validCoords = elementsToFit.filter(c => c && c.latitude && c.longitude);
            if (validCoords.length > 0) {
                mapRef.current?.fitToCoordinates(validCoords, {
                    edgePadding: fitPadding,
                    animated: true,
                });
            }
        }
    }, [elementsToFit, fitToElements, isFollowing]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={[styles.map, style]}
                provider={PROVIDER_DEFAULT}
                customMapStyle={CLEAN_MAP_STYLE}
                showsPointsOfInterest={false}
                showsBuildings={false}
                rotateEnabled={true}
                pitchEnabled={true}
                {...props}
            >
                {children}
            </MapView>

            {showFollowButton && (
                <TouchableOpacity
                    style={[styles.followButton, isFollowing && styles.followingActive]}
                    onPress={onFollowPress}
                >
                    <Ionicons
                        name={isFollowing ? "navigate" : "navigate-outline"}
                        size={24}
                        color={isFollowing ? COLORS.white : COLORS.text}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    followButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: COLORS.white,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        zIndex: 10,
    },
    followingActive: {
        backgroundColor: COLORS.primary,
    }
});
