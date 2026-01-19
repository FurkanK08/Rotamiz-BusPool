import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { Map } from '../../components/Map';
import * as Location from 'expo-location';
import { searchAddress, reverseGeocode, debounce, type GeocodingResult } from '../../services/geocoding';

export const JoinServiceScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const paramsUserId = route.params?.userId;
    const [currentUserId, setCurrentUserId] = useState<string | null>(paramsUserId || null);

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    // Pickup location state
    const [pickupLocation, setPickupLocation] = useState<any>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [tempLocation, setTempLocation] = useState<any>(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: 41.0082,
        longitude: 28.9784,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    // Enhanced location picker state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<string>('');
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    React.useEffect(() => {
        const initializeUser = async () => {
            if (paramsUserId) {
                setCurrentUserId(paramsUserId);
            } else {
                // Fallback to storage
                const { tokenService } = require('../../services/api');
                const storedUser = await tokenService.getUser();
                if (storedUser && storedUser._id) {
                    setCurrentUserId(storedUser._id);
                }
            }
        };
        initializeUser();
    }, [paramsUserId]);

    // Debounced search for addresses
    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            if (query.length < 3) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            const results = await searchAddress(query);
            setSearchResults(results);
            setIsSearching(false);
        }, 600),
        []
    );

    const handleSearchQueryChange = (text: string) => {
        setSearchQuery(text);
        if (text.length >= 3) {
            setIsSearching(true);
            debouncedSearch(text);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const handleSearchResultSelect = (result: GeocodingResult) => {
        setMapRegion({
            latitude: result.latitude,
            longitude: result.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        });
        setTempLocation({
            latitude: result.latitude,
            longitude: result.longitude,
        });
        setSelectedAddress(result.displayName);
        setSearchQuery('');
        setSearchResults([]);
    };

    // Reverse geocode when map region changes (debounced)
    const handleMapRegionChange = useCallback(
        debounce(async (latitude: number, longitude: number) => {
            setIsReverseGeocoding(true);
            const result = await reverseGeocode(latitude, longitude);

            if (result) {
                setSelectedAddress(result.displayName);
                setTempLocation({
                    latitude,
                    longitude,
                });
            }

            setIsReverseGeocoding(false);
        }, 400),
        []
    );

    const openMapPicker = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                // 1. Try to use existing pickup location if available
                if (pickupLocation) {
                    setMapRegion({
                        latitude: pickupLocation.latitude,
                        longitude: pickupLocation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                    setTempLocation({
                        latitude: pickupLocation.latitude,
                        longitude: pickupLocation.longitude,
                    });
                    setSelectedAddress(pickupLocation.address || '');
                } else {
                    // 2. Try last known location for speed
                    let loc: any = await Location.getLastKnownPositionAsync({});

                    // 3. Fallback to current location if no last known
                    if (!loc) {
                        loc = await Location.getCurrentPositionAsync({});
                    }

                    if (loc) {
                        const newRegion = {
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        };
                        setMapRegion(newRegion);
                        setTempLocation({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        });
                        // Don't reverse geocode immediately on open to save time/requests
                        // Let the map idle create the geocode request or user interaction
                    }
                }
            }
        } catch (e) {
            console.log('Location permission error:', e);
        } finally {
            setLoading(false);
            setShowMapPicker(true);
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    const useMyLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Konum izni gerekiyor');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const newRegion = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setMapRegion(newRegion);
            setTempLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            handleMapRegionChange(loc.coords.latitude, loc.coords.longitude);
        } catch (e) {
            Alert.alert('Hata', 'Konum alınamadı');
        }
    };

    const confirmLocation = () => {
        if (tempLocation) {
            setPickupLocation({
                ...tempLocation,
                address: selectedAddress || `${tempLocation.latitude.toFixed(4)}, ${tempLocation.longitude.toFixed(4)}`
            });
            setShowMapPicker(false);
            setTempLocation(null);
            setSelectedAddress('');
        }
    };

    const handleJoin = async () => {
        if (!currentUserId) {
            Alert.alert('Hata', 'Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        if (!pickupLocation) {
            Alert.alert('Hata', 'Lütfen biniş noktanızı seçin.');
            return;
        }

        setLoading(true);
        try {
            await api.services.join(currentUserId, code, pickupLocation);

            // Update user profile in localStorage
            const { tokenService } = require('../../services/api');
            const user = await tokenService.getUser();
            if (user) {
                user.pickupLocation = pickupLocation;
                await tokenService.saveUser(user);
                console.log('User pickup location updated in localStorage:', pickupLocation);
            }

            Alert.alert('Başarılı', 'Servise katıldınız!', [
                { text: 'Tamam', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Servise katılınamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Button
                    title="←"
                    onPress={() => navigation.goBack()}
                    variant="outline"
                    style={styles.backButton}
                />
                <Text style={styles.title}>Servise Katıl</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>Davet Kodu *</Text>
                <Text style={styles.desc}>Sürücünüzden aldığınız kodu girin.</Text>

                <Input
                    placeholder="Örn: 894-XQ"
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                    style={styles.input}
                />

                {/* Pickup Location Picker */}
                <View style={{ marginTop: SPACING.l }}>
                    <Text style={styles.label}>Biniş Noktanız *</Text>
                    <Text style={styles.desc}>Nereden alınacağınızı belirtin</Text>
                    <TouchableOpacity
                        style={[styles.locationButton, pickupLocation && styles.locationSelected]}
                        onPress={openMapPicker}
                    >
                        {pickupLocation ? (
                            <View>
                                <Text style={styles.locationTitle}>📍 Konum Seçildi</Text>
                                <Text style={styles.locationAddress} numberOfLines={2}>
                                    {pickupLocation.address || `${pickupLocation.latitude.toFixed(5)}, ${pickupLocation.longitude.toFixed(5)}`}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.placeholderText}>🗺️ Haritadan biniş noktanızı seçin</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Button
                    title="Servise Katıl"
                    onPress={handleJoin}
                    loading={loading}
                    disabled={code.length < 3 || !pickupLocation}
                    style={styles.joinButton}
                />
            </View>

            {/* Enhanced Map Picker Modal */}
            <Modal
                visible={showMapPicker}
                animationType="slide"
                onRequestClose={() => setShowMapPicker(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowMapPicker(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Biniş Noktası Seç</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Adres ara (örn: Taksim, Istanbul)"
                            value={searchQuery}
                            onChangeText={handleSearchQueryChange}
                            clearButtonMode="while-editing"
                        />
                        {isSearching && (
                            <ActivityIndicator
                                style={styles.searchLoader}
                                size="small"
                                color={COLORS.primary}
                            />
                        )}
                    </View>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <ScrollView style={styles.resultsDropdown}>
                            {searchResults.map((result, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.resultItem}
                                    onPress={() => handleSearchResultSelect(result)}
                                >
                                    <Text style={styles.resultIcon}>📍</Text>
                                    <Text style={styles.resultText} numberOfLines={2}>
                                        {result.displayName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Map with Static Pin */}
                    <View style={{ flex: 1 }}>
                        <Map
                            location={mapRegion}
                            style={{ flex: 1 }}
                            onRegionChangeComplete={(region: any) => {
                                setMapRegion(region);
                                handleMapRegionChange(region.latitude, region.longitude);
                            }}
                        />

                        {/* Static Center Pin */}
                        <View style={styles.centerPin} pointerEvents="none">
                            <Text style={{ fontSize: 40 }}>📍</Text>
                        </View>

                        {/* Address Display Box */}
                        <View style={styles.addressBox}>
                            {isReverseGeocoding ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                    <Text style={styles.addressLoading}>Adres alınıyor...</Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.addressLabel}>📍 Biniş Noktanız:</Text>
                                    <Text style={styles.addressText} numberOfLines={2}>
                                        {selectedAddress || 'Haritayı hareket ettirin...'}
                                    </Text>
                                    {tempLocation && (
                                        <Text style={styles.coordsText}>
                                            {tempLocation.latitude.toFixed(5)}, {tempLocation.longitude.toFixed(5)}
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>

                        {/* GPS Button */}
                        <TouchableOpacity
                            style={styles.gpsButton}
                            onPress={useMyLocation}
                        >
                            <Text style={styles.gpsIcon}>📱</Text>
                            <Text style={styles.gpsText}>Konumumu Kullan</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Control Buttons */}
                    <View style={styles.modalControls}>
                        <Button
                            title="İptal"
                            onPress={() => {
                                setShowMapPicker(false);
                                setTempLocation(null);
                                setSelectedAddress('');
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                            variant="outline"
                            style={{ flex: 1, marginRight: 8 }}
                        />
                        <Button
                            title="Onayla 📍"
                            onPress={confirmLocation}
                            disabled={!tempLocation}
                            style={{ flex: 1, marginLeft: 8 }}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.l,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    backButton: {
        width: 40,
        height: 40,
        paddingHorizontal: 0,
        borderRadius: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        padding: SPACING.l,
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    desc: {
        color: COLORS.textLight,
        marginBottom: SPACING.l,
    },
    input: {
        fontSize: 20,
        letterSpacing: 2,
        fontWeight: '600',
    },
    joinButton: {
        marginTop: SPACING.m,
    },
    // Location picker button styles
    locationButton: {
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginTop: 8,
    },
    locationSelected: {
        backgroundColor: '#E8F5E9',
        borderColor: COLORS.primary,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    locationAddress: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    placeholderText: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    // Enhanced map picker modal styles
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    closeButton: {
        fontSize: 28,
        color: COLORS.textLight,
        paddingHorizontal: 8,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    searchInput: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
        color: COLORS.text,
    },
    searchLoader: {
        position: 'absolute',
        right: 28,
        top: 24,
    },
    resultsDropdown: {
        maxHeight: 250,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    resultIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    resultText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
    },
    centerPin: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -40,
        zIndex: 1000,
        pointerEvents: 'none',
    },
    addressBox: {
        position: 'absolute',
        bottom: 140,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    addressLoading: {
        fontSize: 14,
        color: COLORS.text,
        marginLeft: 8,
    },
    addressLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textLight,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 6,
    },
    coordsText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: COLORS.textLight,
    },
    gpsButton: {
        position: 'absolute',
        bottom: 220,
        right: 16,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    gpsIcon: {
        fontSize: 18,
        marginRight: 6,
    },
    gpsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    modalControls: {
        flexDirection: 'row',
        padding: SPACING.m,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
});
