import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Map, MapMarker } from '../../components/Map';
import * as Location from 'expo-location';
import { api, tokenService } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { searchAddress, reverseGeocode, debounce, type GeocodingResult } from '../../services/geocoding';

export const PassengerLocationScreen = () => {
    const navigation = useNavigation();
    const [location, setLocation] = useState<any>(null);
    const [selectedCoords, setSelectedCoords] = useState<any>(null);
    const [addressName, setAddressName] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasExistingLocation, setHasExistingLocation] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const initializeLocation = async () => {
            try {
                // 1. Check if user already has a saved location
                const user = await tokenService.getUser();
                if (user && user.pickupLocation && user.pickupLocation.latitude) {
                    if (isMounted) {
                        const savedLoc = user.pickupLocation;
                        setLocation({
                            latitude: savedLoc.latitude,
                            longitude: savedLoc.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                        setSelectedCoords({
                            latitude: savedLoc.latitude,
                            longitude: savedLoc.longitude
                        });
                        setAddressDetail(savedLoc.address || savedLoc.displayName || '');
                        setHasExistingLocation(true);
                    }
                    return;
                }

                // 2. If no saved location, get current location
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Hata', 'Konum izni reddedildi');
                    // Fallback to default (Istanbul)
                    if (isMounted) {
                        setLocation({
                            latitude: 41.0082,
                            longitude: 28.9784,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        });
                    }
                    return;
                }

                // Try last known first for speed
                let loc: any = await Location.getLastKnownPositionAsync({});
                if (!loc) {
                    try {
                        const getLocationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Timeout")), 5000)
                        );
                        // Promise race to handle timeout manually
                        loc = await Promise.race([getLocationPromise, timeoutPromise]);
                    } catch (e) {
                        console.log("GPS fetch failed, using default.");
                    }
                }

                if (isMounted && loc) {
                    const newRegion = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    };
                    setLocation(newRegion);
                    setSelectedCoords({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    });

                    // Reverse geocode initial location
                    reverseGeocode(loc.coords.latitude, loc.coords.longitude).then(result => {
                        if (result && isMounted) {
                            setAddressDetail(result.displayName);
                        }
                    });
                } else if (isMounted && !location) {
                    // Fallback if location services fail/timeout
                    setLocation({
                        latitude: 41.0082,
                        longitude: 28.9784,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }
            } catch (error) {
                // Silent catch for location errors as we have fallbacks
                if (isMounted && !location) {
                    setLocation({
                        latitude: 41.0082,
                        longitude: 28.9784,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }
            }
        };

        initializeLocation();
        return () => { isMounted = false; };
    }, []);

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
        const newLocation = {
            latitude: result.latitude,
            longitude: result.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        setLocation(newLocation);
        setSelectedCoords({
            latitude: result.latitude,
            longitude: result.longitude
        });

        // When searching, we don't assume it's existing saved location anymore until saved
        // But functionally "Update" vs "Save" logic might just stay "Update" if user has one.
        // Let's keep existing logic: if they have a saved one, button says Update.

        setAddressDetail(result.displayName);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSave = async () => {
        if (!selectedCoords) return;

        setLoading(true);
        try {
            const user = await tokenService.getUser();
            if (user && user._id) {
                // Prepare payload
                const payload = {
                    latitude: selectedCoords.latitude,
                    longitude: selectedCoords.longitude,
                    address: addressName,
                    addressDetail: addressDetail
                };

                await api.services.updateLocation(user._id, payload.latitude, payload.longitude, payload.address, payload.addressDetail);

                // Update local storage user data
                user.pickupLocation = payload;
                await tokenService.saveUser(user);

                // Update local state to reflect now we have an existing location
                setHasExistingLocation(true);

                Alert.alert('Başarılı', 'Biniş noktanız ve adresiniz güncellendi ✅', [
                    { text: 'Tamam', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            Alert.alert('Hata', 'Konum kaydedilemedi. ' + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Biniş Noktanı Seç</Text>
                <Text style={styles.subtitle}>Haritadan konumu seçip adres bilgilerini girebilirsin.</Text>

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
                    <View style={styles.resultsDropdownContainer}>
                        <ScrollView style={styles.resultsDropdown} keyboardShouldPersistTaps="handled">
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
                    </View>
                )}
            </View>

            <View style={styles.mapContainer}>
                {location ? (
                    <Map
                        style={styles.map}
                        location={location}
                        onPress={(e: any) => {
                            const coords = e.nativeEvent?.coordinate || e;
                            setSelectedCoords(coords);
                            // Optional: Reverse geocode on tap
                            reverseGeocode(coords.latitude, coords.longitude).then(result => {
                                if (result) setAddressDetail(result.displayName);
                            });
                        }}
                    >
                        {selectedCoords && (
                            <MapMarker coordinate={selectedCoords} draggable>
                                <View style={styles.marker}>
                                    <Text style={{ fontSize: 24 }}>📍</Text>
                                </View>
                            </MapMarker>
                        )}
                    </Map>
                ) : (
                    <Text>Harita Yükleniyor...</Text>
                )}
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputRow}>
                    <Text style={styles.label}>Adres Adı (Ev, İş vb.):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: Evim"
                        value={addressName}
                        onChangeText={setAddressName}
                    />
                </View>
                <View style={styles.inputRow}>
                    <Text style={styles.label}>Açık Adres:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Sokak, kapı no, tarif..."
                        value={addressDetail}
                        onChangeText={setAddressDetail}
                        multiline
                    />
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.info}>
                    {selectedCoords
                        ? `Seçilen: ${selectedCoords.latitude.toFixed(4)}, ${selectedCoords.longitude.toFixed(4)}`
                        : "Lütfen haritadan bir nokta seçin"}
                </Text>
                <Button
                    title={loading ? "Kaydediliyor..." : (hasExistingLocation ? "Konumu Güncelle" : "Bu Konumu Kaydet")}
                    onPress={handleSave}
                    disabled={!selectedCoords || loading}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.l,
        paddingTop: SPACING.xl,
        backgroundColor: COLORS.white,
        zIndex: 10, // Ensure search dropdown is above map
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        color: COLORS.textLight,
        marginTop: 5,
        marginBottom: 10,
    },
    mapContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    map: {
        width: Dimensions.get('window').width,
        height: '100%',
    },
    marker: {
        // removed bg white to let emoji pop
    },
    formContainer: {
        padding: SPACING.m,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        zIndex: 2,
    },
    inputRow: {
        marginBottom: SPACING.s
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textLight,
        marginBottom: 4
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fafafa',
        fontSize: 14
    },
    footer: {
        padding: SPACING.l,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        zIndex: 2,
    },
    info: {
        textAlign: 'center',
        marginBottom: 10,
        color: COLORS.textLight,
        fontSize: 12
    },
    // Search styles
    searchContainer: {
        marginTop: 10,
        position: 'relative',
    },
    searchInput: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchLoader: {
        position: 'absolute',
        right: 12,
        top: 12,
    },
    resultsDropdownContainer: {
        position: 'absolute',
        top: 130, // Adjust based on header height
        left: SPACING.l,
        right: SPACING.l,
        backgroundColor: '#fff',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        maxHeight: 250,
        zIndex: 100, // Highest z-index to overlay everything
    },
    resultsDropdown: {
        maxHeight: 250,
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
});
