import React from 'react';
import MapView, { Marker, Polyline as RnPolyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

interface MapProps {
    location: { latitude: number; longitude: number } | null;
    children?: React.ReactNode;
    style?: any;
}

export const Map = ({ location, children, style, mapRef, ...props }: any) => {
    return (
        <MapView
            ref={mapRef}
            style={style}
            provider={PROVIDER_DEFAULT}
            region={location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: location.latitudeDelta || 0.01,
                longitudeDelta: location.longitudeDelta || 0.01,
            } : {
                latitude: 41.0082,
                longitude: 28.9784,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}
            {...props}
        >
            {children}
        </MapView>
    );
};

export const MapMarker = Marker;
export const Polyline = RnPolyline;
