import React, { memo } from 'react';
import MapView, { Marker, Polyline as RnPolyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

const INITIAL_REGION = {
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

// Deep comparison function for map props
const mapPropsAreEqual = (prevProps: any, nextProps: any) => {
    // Check location
    const prevLoc = prevProps.location;
    const nextLoc = nextProps.location;

    if (prevLoc !== nextLoc) {
        if (!prevLoc || !nextLoc) return false;
        if (
            prevLoc.latitude !== nextLoc.latitude ||
            prevLoc.longitude !== nextLoc.longitude ||
            prevLoc.latitudeDelta !== nextLoc.latitudeDelta ||
            prevLoc.longitudeDelta !== nextLoc.longitudeDelta
        ) {
            return false;
        }
    }

    // Check style
    if (JSON.stringify(prevProps.style) !== JSON.stringify(nextProps.style)) {
        return false;
    }

    // Check children (simple shallow check or length check)
    if (React.Children.count(prevProps.children) !== React.Children.count(nextProps.children)) {
        return false;
    }

    return true;
};

export const Map = memo(({ location, children, style, mapRef, ...props }: any) => {
    // Only update region if location explicitly changes significantly
    // This logic is handled by parent but memo prevents re-render on parent text input changes

    return (
        <MapView
            ref={mapRef}
            style={style}
            provider={PROVIDER_DEFAULT}
            initialRegion={INITIAL_REGION}
            // Use key to force re-integration if needed, but usually region prop is enough
            region={location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: location.latitudeDelta || 0.01,
                longitudeDelta: location.longitudeDelta || 0.01,
            } : undefined}
            {...props}
        >
            {children}
        </MapView>
    );
}, mapPropsAreEqual);

export const MapMarker = Marker;
export const Polyline = RnPolyline;
