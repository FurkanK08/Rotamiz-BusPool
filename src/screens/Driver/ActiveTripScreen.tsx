import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TouchableOpacity, ActivityIndicator, FlatList, Platform, Animated, PanResponder, TextInput } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TopBanner } from '../../components/TopBanner';
import { CommonMap } from '../../components/CommonMap';
import { useDriverTrip } from '../../hooks/useDriverTrip';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Premium UI Constants
const { width, height } = Dimensions.get('window');
const EXPANDED_HEIGHT = height * 0.75;
const COLLAPSED_HEIGHT = 160;

// Helper distance 
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const ActiveTripScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { serviceId, driverId } = route.params;

    // Use Custom Hook for Logic
    const {
        location,
        passengers,
        activePassengers,
        routeCoordinates,
        elapsedSeconds,
        attendance,
        setAttendance,
        service
    } = useDriverTrip(serviceId, driverId);

    const mapRef = useRef<any>(null);
    const [bannerVisible, setBannerVisible] = useState(false);
    const [bannerMessage, setBannerMessage] = useState('');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        const sub = socketService.subscribeToPassengerLocation((data) => {
            setBannerMessage(`Yolcu ${data.passengerId} konumu alındı! 📍`);
            setBannerVisible(true);
        });
        return () => sub?.unsubscribe?.();
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Bottom Sheet Logic ---
    // We want the sheet to start COLAPSED (visible header only).
    // range represents the hidden amount (positive value pushes sheet down)
    const range = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;

    // Initial State: Collapsed (translated down by 'range')
    const panY = useRef(new Animated.Value(range)).current;
    const [isExpanded, setIsExpanded] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (_, gestureState) => {
                // Ignore small unintentional drags
                return Math.abs(gestureState.dy) > 10;
            },
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: () => {
                panY.extractOffset();
            },
            onPanResponderMove: (_, gestureState) => {
                const newY = gestureState.dy;
                // panY tracks the gesture.
                // If we are Collapsed (offset = range):
                //   - Dragging UP (negative) -> value decreases (moves towards 0/Expanded)
                //   - Dragging DOWN (positive) -> Limit it (don't go off screen)

                // If we are Expanded (offset = 0):
                //   - Dragging DOWN (positive) -> value increases (moves towards range/Collapsed)
                //   - Dragging UP (negative) -> Limit it

                // We basically just let it move, checking bounds in Release, 
                // but we can add resistance or limits here if strictness is needed.
                // For now, let's just create a raw move and rely on spring snap.

                panY.setValue(newY);
            },
            onPanResponderRelease: (_, gestureState) => {
                panY.flattenOffset();

                // Current value determines where we are.
                // 0 = Expanded
                // range = Collapsed

                // Current mocked "value" includes the offset. 
                // Since we don't have easy access to the exact current value without a listener,
                // we infer intention from gesture direction/velocity.

                if (isExpanded) {
                    // Was Expanded (at 0).
                    // Dragged Down (> 50) or fast
                    if (gestureState.dy > 50 || gestureState.vy > 0.5) {
                        collapseSheet();
                    } else {
                        expandSheet();
                    }
                } else {
                    // Was Collapsed (at range).
                    // Dragged Up (< -50) or fast
                    if (gestureState.dy < -50 || gestureState.vy < -0.5) {
                        expandSheet();
                    } else {
                        collapseSheet();
                    }
                }
            }
        })
    ).current;

    const expandSheet = () => {
        Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 30,
            friction: 8
        }).start();
        setIsExpanded(true);
    };

    const collapseSheet = () => {
        Animated.spring(panY, {
            toValue: range,
            useNativeDriver: true,
            tension: 30,
            friction: 8
        }).start();
        setIsExpanded(false);
    };

    const toggleSheet = () => {
        if (isExpanded) collapseSheet();
        else expandSheet();
    };

    // --- Actions ---

    const handleFocusPassenger = (pLocation: any) => {
        if (pLocation && mapRef.current) {
            collapseSheet();
            mapRef.current.animateCamera({
                center: {
                    latitude: pLocation.latitude,
                    longitude: pLocation.longitude,
                },
                zoom: 18,
                pitch: 0
            });
        } else {
            Alert.alert('Konum Eksik', 'Bu yolcunun konum bilgisi bulunamadı.');
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
                            await api.services.updateService(serviceId, { active: false });

                            const hasStarted = await Location.hasStartedLocationUpdatesAsync('background-location-task');
                            if (hasStarted) await Location.stopLocationUpdatesAsync('background-location-task');

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

    const handleAttendance = async (passengerId: string, status: 'BINDI' | 'BINMEDI') => {
        try {
            console.log(`[UI] Marking ${passengerId} as ${status}`);
            const date = new Date().toISOString().split('T')[0];

            // Optimistic update
            setAttendance(prev => {
                // Ensure we are working with string ID
                const pId = typeof passengerId === 'object' ? (passengerId as any)._id : passengerId;

                // Create temp record
                const tempRecord = {
                    passengerId: pId,
                    serviceId,
                    status,
                    date,
                    _id: 'temp-' + Date.now()
                };

                const index = prev.findIndex(item => {
                    const itemPId = typeof item.passengerId === 'object' ? item.passengerId._id : item.passengerId;
                    return itemPId.toString() === pId.toString() && item.date === date;
                });

                if (index > -1) {
                    const newArr = [...prev];
                    newArr[index] = { ...newArr[index], status };
                    return newArr;
                } else {
                    return [...prev, tempRecord];
                }
            });

            const updatedRecord = await api.services.updateAttendance(serviceId, passengerId, status, date);
            console.log('[UI] Server response:', updatedRecord);

            // Re-sync with server response
            setAttendance(prev => {
                const pId = typeof passengerId === 'object' ? (passengerId as any)._id : passengerId;
                const index = prev.findIndex(item => {
                    const itemPId = typeof item.passengerId === 'object' ? item.passengerId._id : item.passengerId;
                    return itemPId.toString() === pId.toString() && item.date === date;
                });

                if (index > -1) {
                    const newArr = [...prev];
                    newArr[index] = updatedRecord;
                    return newArr;
                } else {
                    return [...prev, updatedRecord];
                }
            });

        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Durum güncellenemedi');
            // Revert on error could be implemented here
        }
    };

    const getPassengerStatus = (id: string) => {
        const date = new Date().toISOString().split('T')[0];
        const record = attendance.find(r => r.passengerId === id && r.date === date);
        return record ? record.status : 'BEKLIYOR';
    };

    // Filter and Sort Passengers
    const filteredPassengers = useMemo(() => {
        // Use activePassengers from hook (which is TSP sorted and filtered by attendance)
        // If we want to show ALL passengers (including BINDI/GELMEYECEK) in the list, we should use 'passengers'
        // But the user requested "map operations... incorrect details".
        // Usually driver wants to see who is NEXT.

        let result = activePassengers;

        // If we want to show completed passengers at the bottom, we can merge
        // But for now, let's stick to the active ones for the "Next Stop" logic
        // Or better: Show Active first (Sorted), then Others.

        // Let's use the 'passengers' list but sort it: Active (TSP Order) -> BINDI/Others
        // Actually, 'activePassengers' is strictly "Those who need to be picked up".
        // Let's rely on that for the main view.

        if (searchText) {
            result = result.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()));
        }

        return result;
    }, [activePassengers, searchText]);


    const handleRecenter = () => {
        if (location?.coords && mapRef.current) {
            mapRef.current.animateCamera({
                center: location.coords,
                zoom: 17,
                pitch: 0
            });
        }
    };

    return (
        <View style={styles.container}>
            <TopBanner
                message={bannerMessage}
                visible={bannerVisible}
                onHide={() => setBannerVisible(false)}
            />

            {/* Map */}
            <View style={styles.mapContainer}>
                {location ? (
                    <CommonMap
                        mapRef={mapRef}
                        role="DRIVER"
                        driverLocation={location.coords}
                        routeCoordinates={routeCoordinates}
                        passengers={activePassengers}
                    />
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 10 }}>Konum bekleniyor...</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                <View style={styles.focusContainer}>
                    <TouchableOpacity style={styles.focusBtn} onPress={handleRecenter}>
                        <Ionicons name="navigate" size={22} color="black" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Collapsible Bottom Sheet */}
            <Animated.View
                style={[
                    styles.bottomSheet,
                    { transform: [{ translateY: panY }] }
                ]}
            >
                {/* Header / Drag Area */}
                <View
                    style={styles.sheetHeader}
                    {...panResponder.panHandlers}
                >
                    {/* Drag Handle & Collapse Toggle */}
                    <TouchableOpacity onPress={toggleSheet} style={styles.handleContainer}>
                        <View style={styles.dragHandle} />
                        {isExpanded && (
                            <Ionicons name="chevron-down" size={20} color="#BDBDBD" style={{ marginTop: -8 }} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.headerContent}>
                        <View>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>CANLI SEFER</Text>
                            </View>
                            <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{passengers.length}</Text>
                                <Text style={styles.statLabel}>TOPLAM</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{attendance.filter(a => a.status === 'BINDI').length}</Text>
                                <Text style={styles.statLabel}>BİNEN</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* List Content */}
                <View style={[styles.listContainer, { height: EXPANDED_HEIGHT - 80 }]}>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9E9E9E" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Yolcu ara..."
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholderTextColor="#9E9E9E"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color="#9E9E9E" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.sectionTitle}>Yolcu Listesi</Text>
                    {passengers.length === 0 ? (
                        <Text style={styles.emptyText}>Henüz yolcu eklenmemiş.</Text>
                    ) : filteredPassengers.length === 0 ? (
                        <Text style={styles.emptyText}>Aranan yolcu bulunamadı.</Text>
                    ) : (
                        <FlatList
                            data={filteredPassengers}
                            keyExtractor={item => item._id}
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            renderItem={({ item }) => {
                                const status = getPassengerStatus(item._id);
                                const isAbsent = status === 'GELMEYECEK';
                                let distStr = '';
                                if (location && item.pickupLocation) {
                                    const d = getDistance(
                                        location.coords.latitude, location.coords.longitude,
                                        item.pickupLocation.latitude, item.pickupLocation.longitude
                                    );
                                    distStr = d.toFixed(1) + ' km';
                                }

                                return (
                                    <View style={[styles.passengerCard, isAbsent && { opacity: 0.5 }]}>
                                        <View style={styles.passengerInfo}>
                                            <Text style={styles.pName}>{item.name}</Text>
                                            <View style={styles.pDetails}>
                                                <Ionicons name="location-outline" size={12} color="#666" />
                                                <Text style={styles.pDistance}>{distStr || '--'}</Text>
                                                <Text style={styles.pStatus}>{isAbsent ? '• GELMEYECEK' : `• ${status}`}</Text>
                                            </View>
                                        </View>

                                        {!isAbsent && (
                                            <View style={styles.pActions}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.btnFocus]}
                                                    onPress={() => handleFocusPassenger(item.pickupLocation)}
                                                >
                                                    <Ionicons name="map-outline" size={16} color="#2196F3" />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.actionBtn, status === 'BINDI' ? styles.btnBindiActive : styles.btnBindi]}
                                                    onPress={() => handleAttendance(item._id, 'BINDI')}
                                                >
                                                    <Ionicons name="checkmark" size={16} color={status === 'BINDI' ? 'white' : '#4CAF50'} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.actionBtn, status === 'BINMEDI' ? styles.btnYokActive : styles.btnYok]}
                                                    onPress={() => handleAttendance(item._id, 'BINMEDI')}
                                                >
                                                    <Ionicons name="close" size={16} color={status === 'BINMEDI' ? 'white' : '#F44336'} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <Button
                        title="SEFERİ BİTİR"
                        onPress={handleEndTrip}
                        style={{ backgroundColor: '#D32F2F', borderRadius: 12 }}
                        textStyle={{ fontWeight: 'bold' }}
                    />
                </View>

            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    mapContainer: { flex: 1, marginBottom: 140 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
        top: Platform.OS === 'ios' ? 120 : 100,
        right: 20,
        gap: 12
    },
    focusBtn: {
        width: 44,
        height: 44,
        backgroundColor: '#FFC107',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },

    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: EXPANDED_HEIGHT,
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 20,
        zIndex: 100,
        transform: [{ translateY: 0 }]
    },
    sheetHeader: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        height: COLLAPSED_HEIGHT,
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    handleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 2.5,
        marginBottom: 5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 5
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F44336',
        marginRight: 6
    },
    liveText: {
        color: '#F44336',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    timerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#212121',
        fontVariant: ['tabular-nums']
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FAFAFA',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEEEEE'
    },
    statBox: {
        alignItems: 'center',
        minWidth: 50
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212121'
    },
    statLabel: {
        fontSize: 10,
        color: '#757575',
        fontWeight: '600'
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 10
    },

    listContainer: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        paddingTop: 15,
        paddingHorizontal: 20
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 8
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#212121',
        height: 30, // Fixed height specifically for input text area
        padding: 0
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#424242',
        marginBottom: 15,
        marginLeft: 4
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20
    },
    passengerCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F5F5F5'
    },
    passengerInfo: {
        flex: 1
    },
    pName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212121',
        marginBottom: 4
    },
    pDetails: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    pDistance: {
        fontSize: 12,
        color: '#757575',
        marginLeft: 4,
        marginRight: 8
    },
    pStatus: {
        fontSize: 12,
        color: '#9E9E9E',
        fontWeight: '500'
    },
    pActions: {
        flexDirection: 'row',
        gap: 8
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    btnFocus: { borderColor: '#E3F2FD', backgroundColor: '#E3F2FD' },
    btnBindi: { borderColor: '#E8F5E9', backgroundColor: '#F1F8E9' },
    btnBindiActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    btnYok: { borderColor: '#FFEBEE', backgroundColor: '#FFEBEE' },
    btnYokActive: { backgroundColor: '#F44336', borderColor: '#F44336' },

    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20
    }
});
