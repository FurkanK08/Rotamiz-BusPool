import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TextInput } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Map, MapMarker } from '../../components/Map';
import * as Location from 'expo-location';
import { api, tokenService } from '../../services/api';
import { useNavigation } from '@react-navigation/native';

export const PassengerLocationScreen = () => {
    const navigation = useNavigation();
    const [location, setLocation] = useState<any>(null);
    const [selectedCoords, setSelectedCoords] = useState<any>(null);
    const [addressName, setAddressName] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            // 1. Get Current Location
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Hata', 'Konum izni reddedildi');
                return;
            }

            // Get existing user data logic could be added here to pre-fill

            let loc = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });

            // Set initial selected to current
            setSelectedCoords({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
        })();
    }, []);

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
            </View>

            <View style={styles.mapContainer}>
                {location ? (
                    <Map
                        style={styles.map}
                        location={location}
                        onPress={(e: any) => {
                            // MapView onPress returns coordinate in native event
                            // react-native-maps: e.nativeEvent.coordinate
                            const coords = e.nativeEvent?.coordinate || e;
                            setSelectedCoords(coords);
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
                    title={loading ? "Kaydediliyor..." : "Bu Konumu Kaydet"}
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
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        color: COLORS.textLight,
        marginTop: 5,
    },
    mapContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        borderTopColor: '#f0f0f0'
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
    },
    info: {
        textAlign: 'center',
        marginBottom: 10,
        color: COLORS.textLight,
        fontSize: 12
    }
});
