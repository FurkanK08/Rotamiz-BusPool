import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/theme';

interface PulsingMarkerProps {
    color?: string;
    size?: number;
}

export const PulsingMarker: React.FC<PulsingMarkerProps> = ({
    color = COLORS.primary,
    size = 20
}) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 2.5,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.6,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, []);

    return (
        <View style={[styles.container, { width: size * 3, height: size * 3 }]}>
            <Animated.View
                style={[
                    styles.ring,
                    {
                        backgroundColor: color,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        opacity: opacity,
                        transform: [{ scale: scale }],
                    },
                ]}
            />
            <View
                style={[
                    styles.dot,
                    {
                        backgroundColor: color,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: 3,
                        borderColor: 'white',
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    ring: {
        position: 'absolute',
    },
    dot: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
});
