import React, { useEffect, useState } from 'react';
import { Platform, View, Animated } from 'react-native';
import { Marker, MapMarkerProps, AnimatedRegion } from 'react-native-maps';

interface LatLng {
    latitude: number;
    longitude: number;
    heading?: number | null;
}

interface AnimatedMarkerProps extends MapMarkerProps {
    coordinate: LatLng;
    duration?: number;
    heading?: number | null;
}

export const AnimatedMarker: React.FC<AnimatedMarkerProps> = ({
    coordinate,
    duration = 1000,
    heading = 0,
    children,
    ...props
}) => {
    // Initialize AnimatedRegion for Coordinate
    const [animatedCoordinate] = useState(new AnimatedRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0
    }));

    // Initialize Animated.Value for Heading (Rotation)
    const [animatedHeading] = useState(new Animated.Value(heading || 0));

    useEffect(() => {
        // Animate Coordinate
        const coordConfig: any = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            duration: duration,
            useNativeDriver: false, // Maps driver specific
        };

        if (Platform.OS === 'android') {
            animatedCoordinate.timing(coordConfig).start();
        } else {
            animatedCoordinate.timing(coordConfig).start();
        }

        // Animate Heading
        Animated.timing(animatedHeading, {
            toValue: heading || 0,
            duration: duration,
            useNativeDriver: false, // Provide false for View style transform compatibility on some Map versions or ensure true if safe
        }).start();

    }, [coordinate.latitude, coordinate.longitude, heading]);

    // Interpolate heading for rotation string
    const rotation = animatedHeading.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg']
    });

    return (
        <Marker.Animated
            {...props}
            coordinate={animatedCoordinate as any}
            anchor={{ x: 0.5, y: 0.5 }} // Center anchor
        >
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                {children}
            </Animated.View>
        </Marker.Animated>
    );
};
