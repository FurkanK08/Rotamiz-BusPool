import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TouchableOpacity, ActivityIndicator, Platform, Animated, PanResponder, Image } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CommonMap } from '../../components/CommonMap';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons'; // Assuming Expo environment

// Uber-like Premium UI Constants
const { width, height } = Dimensions.get('window');
const EXPANDED_HEIGHT = 350;
const COLLAPSED_HEIGHT = 110;

export const PassengerTrackingScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { serviceId, userId, service } = route.params || {};
    const mapRef = useRef<any>(null);

    // 1. Logic Extracted to Custom Hook (Clean Architecture)
    const {
        driverLocation,
        passengerLocation,
        routeCoordinates,
        eta,
        distance,
        isLoadingRoute,
        isServiceStopped
    } = useLiveTracking(serviceId, userId);

    // Handle Service Stop
    useEffect(() => {
        if (isServiceStopped) {
            Alert.alert(
                'Sefer Bitti',
                'Sürücü seferi sonlandırdı.',
                [
                    { text: 'Tamam', onPress: () => navigation.navigate('PassengerHome') }
                ]
            );
        }
    }, [isServiceStopped]);

    // 2. Bottom Sheet Animation
    const panY = useRef(new Animated.Value(0)).current;

    // PanResponder for Bottom Sheet Drag
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const newY = gestureState.dy;
                // Allow dragging down (positive Y) to collapse
                // Limit dragging up (negative Y)
                if (newY > 0) {
                    panY.setValue(newY);
                } else {
                    // Resistance when dragging up past expanded state
                    panY.setValue(newY / 3);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    // Dragged down significantly -> Collapse
                    Animated.spring(panY, {
                        toValue: EXPANDED_HEIGHT - COLLAPSED_HEIGHT,
                        useNativeDriver: true
                    }).start();
                    setIsCollapsed(true);
                } else {
                    // Snap back to Expanded
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true
                    }).start();
                    setIsCollapsed(false);
                }
            }
        })
    ).current;

    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSheet = () => {
        const toValue = isCollapsed ? 0 : EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
        Animated.spring(panY, {
            toValue,
            useNativeDriver: true
        }).start();
        setIsCollapsed(!isCollapsed);
    };


    // 3. Camera Controls
    const handleFocusDriver = () => {
        if (driverLocation && mapRef.current) {
            mapRef.current.animateCamera({
                center: driverLocation,
                zoom: 17,
                pitch: 0
            });
        } else {
            Alert.alert('Bekleniyor', 'Sürücü konumu henüz alınamadı.');
        }
    };

    const handleFocusUser = () => {
        if (passengerLocation && mapRef.current) {
            mapRef.current.animateCamera({
                center: passengerLocation,
                zoom: 17,
                pitch: 0
            });
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
                            if (!userId || !serviceId) return;
                            await api.services.removePassenger(serviceId, userId);
                            navigation.navigate('PassengerHome');
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Map Area */}
            <View style={styles.mapContainer}>
                <CommonMap
                    role="PASSENGER"
                    driverLocation={driverLocation}
                    userLocation={passengerLocation}
                    routeCoordinates={routeCoordinates}
                    mapRef={mapRef}
                />

                {/* Header Gradient / Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                {/* Focus Buttons (Floating Right) */}
                <View style={styles.focusContainer}>
                    <TouchableOpacity
                        style={[styles.focusBtn, { backgroundColor: '#FFC107' }]} // Amber/Gold for Driver
                        onPress={handleFocusDriver}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="bus" size={20} color="black" style={{ marginRight: 6 }} />
                        <Text style={styles.focusBtnText}>Servise Git</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.focusBtn, { backgroundColor: '#2196F3', marginTop: 10 }]} // Blue for User
                        onPress={handleFocusUser}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="navigate" size={20} color="white" style={{ marginRight: 6 }} />
                        <Text style={[styles.focusBtnText, { color: 'white' }]}>Bana Git</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Draggable Bottom Sheet */}
            <Animated.View
                style={[
                    styles.bottomSheet,
                    { transform: [{ translateY: panY }] }
                ]}
                {...panResponder.panHandlers}
            >
                {/* Visual Indicator for Pulling */}
                <View style={styles.dragHandleContainer}>
                    <View style={styles.dragHandle} />
                </View>

                {/* Main Content */}
                <TouchableOpacity activeOpacity={1} onPress={toggleSheet} style={{ flex: 1 }}>

                    {/* Header: Service Name & ETA */}
                    <View style={styles.sheetHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.serviceTitle}>{service?.name || 'Servis Aracı'}</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, { backgroundColor: driverLocation ? '#4CAF50' : '#FF9800' }]} />
                                <Text style={styles.statusText}>
                                    {driverLocation ? 'Sürücü yolda' : 'Konum bekleniyor...'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.etaContainer}>
                            <Text style={styles.etaValue}>{eta ? eta.split(' ')[0] : '--'}</Text>
                            <Text style={styles.etaUnit}>dk</Text>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>PLAKA</Text>
                            <Text style={styles.statValue}>{service?.plate || '34 AWE 342'}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>MESAFE</Text>
                            <Text style={styles.statValue}>{distance || '--'}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>KAPASİTE</Text>
                            <Text style={styles.statValue}>{service?.seats || '--'}</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                        <Button
                            title="İptal / Ayrıl"
                            onPress={handleLeaveService}
                            variant="danger" // Using danger variant for red outline/text usually
                            style={styles.cancelButton}
                            textStyle={{ color: '#F44336' }}
                        />
                        <Button
                            title="Sürücüyü Ara"
                            onPress={() => Alert.alert('Arama', 'Sürücü aranıyor...')}
                            style={styles.callButton}
                        />
                    </View>

                    {isLoadingRoute && (
                        <View style={{ alignItems: 'center', marginTop: 10 }}>
                            <Text style={{ color: '#999', fontSize: 12 }}>Rota hesaplanıyor...</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    mapContainer: {
        flex: 1,
        // Ensure map goes under the sheet
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        width: 44,
        height: 44,
        backgroundColor: 'white',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 10,
    },
    focusContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 90,
        right: 20,
        zIndex: 10,
        alignItems: 'flex-end',
    },
    focusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minWidth: 130,
        justifyContent: 'center',
    },
    focusBtnText: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#000',
    },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: EXPANDED_HEIGHT,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 20,
        zIndex: 100,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    dragHandleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 20,
        paddingTop: 8,
    },
    dragHandle: {
        width: 48,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 2.5,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    serviceTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    etaContainer: {
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        minWidth: 70,
    },
    etaValue: {
        color: '#FFEA00', // Bright Yellow
        fontSize: 20,
        fontWeight: 'bold',
    },
    etaUnit: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F7', // Very light grey background for stats
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 8,
    },
    statLabel: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    actionContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#FFCDD2', // Light red border
    },
    callButton: {
        flex: 1,
        backgroundColor: '#1a1a1a', // Black
    },
});
