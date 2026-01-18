import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { Map, MapMarker } from '../../components/Map';
import * as Location from 'expo-location';
import { searchAddress, reverseGeocode, debounce, type GeocodingResult } from '../../services/geocoding';

export const CreateServiceScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { driverId } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        plate: '',
        time: '',
    });

    // Simple Destination Selection: Just coordinates for now (e.g. Center of Istanbul or Current Loc)
    // For MVP, we'll hardcode or allow picking on map. 
    // Let's add simple inputs for Lat/Lon or just pick "School/Work" generic location
    // Better: Add an "End Point Selection" button that opens a map picker? 
    // For now, let's keep it simple: "Bitiş Noktası Seç" -> Opens a Modal with Map.

    // For quick implementation: Just simulate picking for now or use current location.
    // User asked "Driver sets this when creating service".

    const [destination, setDestination] = useState<any>(null); // { latitude, longitude, address }
    const [showMapPicker, setShowMapPicker] = useState(false); // Modal visibility
    const [tempDestination, setTempDestination] = useState<any>(null); // Temporary selection before confirm
    const [mapRegion, setMapRegion] = useState({
        latitude: 41.0082,
        longitude: 28.9784,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    // Enhanced location picker state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<string>('');
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [isSearching, setIsSearching] = useState(false);


    const [showPicker, setShowPicker] = useState(false);

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
        setTempDestination({
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
                setTempDestination({
                    latitude,
                    longitude,
                });
            }

            setIsReverseGeocoding(false);
        }, 400),
        []
    );

    const openMapPicker = async () => {
        // Get current location as initial map center
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                const newRegion = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setMapRegion(newRegion);
                setTempDestination({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
                // Initial reverse geocode
                handleMapRegionChange(loc.coords.latitude, loc.coords.longitude);
            }
        } catch (e) {
            console.log('Location permission error:', e);
        }
        setShowMapPicker(true);
        setSearchQuery('');
        setSearchResults([]);
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
            setTempDestination({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            handleMapRegionChange(loc.coords.latitude, loc.coords.longitude);
        } catch (e) {
            Alert.alert('Hata', 'Konum alınamadı');
        }
    };

    const confirmDestination = () => {
        if (tempDestination) {
            setDestination({
                ...tempDestination,
                address: selectedAddress || `${tempDestination.latitude.toFixed(4)}, ${tempDestination.longitude.toFixed(4)}`
            });
            setShowMapPicker(false);
            setTempDestination(null);
            setSelectedAddress('');
        }
    };
    const [date, setDate] = useState(new Date());

    const handleCreate = async () => {
        if (!form.name || !form.plate || !form.time) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (!destination) {
            Alert.alert('Hata', 'Lütfen bitiş noktasını seçin. Bu servisin nereye gideceğini belirtir.');
            return;
        }

        const finalDest = destination;

        setLoading(true);
        try {
            await api.services.create(driverId, form.name, form.plate, [form.time], finalDest);
            Alert.alert('Başarılı', 'Servis oluşturuldu!', [
                { text: 'Tamam', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Hata', 'Servis oluşturulamadı.');
        } finally {
            setLoading(false);
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowPicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setForm({ ...form, time: `${hours}:${minutes}` });
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
                    textStyle={{ fontSize: 20 }}
                />
                <Text style={styles.title}>Yeni Servis Oluştur</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>Servis Bilgileri</Text>

                <Input
                    label="Servis Adı"
                    placeholder="Örn: Organize Sanayi - Merkez"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                />

                <Input
                    label="Araç Plakası"
                    placeholder="34 ABC 123"
                    value={form.plate}
                    onChangeText={(text) => setForm({ ...form, plate: text })}
                    autoCapitalize="characters"
                />

                <View style={{ marginBottom: SPACING.m }}>
                    <Text style={{ marginBottom: 8, fontWeight: 'bold', color: COLORS.text }}>Kalkış Saati</Text>
                    <Button
                        title={form.time || "Saat Seçin 🕒"}
                        onPress={() => setShowPicker(true)}
                        variant="outline"
                        style={{ alignItems: 'flex-start', paddingLeft: SPACING.m, borderColor: '#ccc' }}
                        textStyle={{ color: form.time ? COLORS.text : COLORS.textLight }}
                    />
                    {showPicker && (
                        <DateTimePicker
                            value={date}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={onTimeChange}
                        />
                    )}
                </View>

                {/* Destination Picker */}
                <View style={{ marginBottom: SPACING.m }}>
                    <Text style={styles.label}>Bitiş Noktası (Güzergah Sonu) *</Text>
                    <TouchableOpacity
                        style={[styles.destinationButton, destination && styles.destinationSelected]}
                        onPress={openMapPicker}
                    >
                        {destination ? (
                            <View>
                                <Text style={styles.destinationTitle}>📍 Konum Seçildi</Text>
                                <Text style={styles.destinationCoords} numberOfLines={2}>
                                    {destination.address || `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.placeholderText}>🗺️ Haritadan bitiş noktasını seçin</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.helpText}>
                        💡 Servisinizin nereye gideceğini belirtin (örn: okul, işyeri, merkez)
                    </Text>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>ℹ️ Servis oluşturduğunuzda size özel bir **Davet Kodu** üretilecektir. Bu kodu yolcularınızla paylaşarak onları gruba dahil edebilirsiniz.</Text>
                </View>

                <Button
                    title="Oluştur"
                    onPress={handleCreate}
                    loading={loading}
                    style={styles.createButton}
                />
            </ScrollView>

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
                        <Text style={styles.modalTitle}>Bitiş Noktası Seç</Text>
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

                        {/* Static Center Pin (doesn't move) */}
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
                                    <Text style={styles.addressLabel}>📍 Seçilen Konum:</Text>
                                    <Text style={styles.addressText} numberOfLines={2}>
                                        {selectedAddress || 'Haritayı hareket ettirin...'}
                                    </Text>
                                    {tempDestination && (
                                        <Text style={styles.coordsText}>
                                            {tempDestination.latitude.toFixed(5)}, {tempDestination.longitude.toFixed(5)}
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
                    <View style={styles.mapControls}>
                        <Button
                            title="İptal"
                            onPress={() => {
                                setShowMapPicker(false);
                                setTempDestination(null);
                                setSelectedAddress('');
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                            variant="outline"
                            style={{ flex: 1, marginRight: 8 }}
                        />
                        <Button
                            title="Onayla 📍"
                            onPress={confirmDestination}
                            disabled={!tempDestination}
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
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.m,
    },
    infoBox: {
        backgroundColor: '#FEF9E7',
        padding: SPACING.m,
        borderRadius: 12,
        marginVertical: SPACING.m,
    },
    infoText: {
        color: '#D4AC0D',
        fontSize: 14,
        lineHeight: 20,
    },
    createButton: {
        marginTop: SPACING.s,
    },
    destinationButton: {
        backgroundColor: '#F5F5F5',
        padding: SPACING.m,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    destinationSelected: {
        borderColor: COLORS.primary,
        borderStyle: 'solid',
        backgroundColor: '#E3F2FD',
    },
    destinationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    destinationCoords: {
        fontSize: 12,
        color: COLORS.textLight,
        fontFamily: 'monospace',
    },
    placeholderText: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    helpText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 8,
        fontStyle: 'italic',
    },
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
    destinationMarkerMap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapInstruction: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    instructionText: {
        fontSize: 14,
        color: COLORS.text,
        textAlign: 'center',
    },
    coordsDisplay: {
        position: 'absolute',
        bottom: 80,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    coordsLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    coordsValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: 'monospace',
    },
    mapControls: {
        flexDirection: 'row',
        padding: SPACING.m,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    // Enhanced Location Picker Styles
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
});
