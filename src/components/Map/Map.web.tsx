import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css'; // REMOVED to prevent Metro crash
import L from 'leaflet';

// Fix for Leaflet marker icons in React
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    location: { latitude: number; longitude: number } | null;
    children?: React.ReactNode;
    style?: any;
}

export const Map = ({ location, children, style }: MapProps) => {
    useEffect(() => {
        if (Platform.OS === 'web') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            return () => {
                // optional cleanup
                // document.head.removeChild(link);
            };
        }
    }, []);

    const center = location
        ? [location.latitude, location.longitude]
        : [41.0082, 28.9784];

    if (!location) {
        return (
            <View style={[style, styles.loading]}>
                <Text>Harita Yükleniyor...</Text>
            </View>
        )
    }

    return (
        <View style={style}>
            {/* @ts-ignore */}
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={center as [number, number]}>
                    <Popup>
                        Şu an buradasınız.
                    </Popup>
                </Marker>
                {/* Note: Children markers from Native won't directly map to Leaflet Markers here without conversion. 
                 For MVP, we just show the main location. */}
            </MapContainer>
        </View>
    );
};

// No-op for web since we use Leaflet markers inside
export const MapMarker = ({ children }: any) => null;

const styles = StyleSheet.create({
    loading: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0'
    }
});
