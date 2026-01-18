import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

export const LoginScreen = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<any>();

    const handleLogin = async () => {
        setLoading(true);
        try {
            // Call Backend API
            const data = await api.auth.login(phoneNumber);

            if (data && data.user) {
                // If successful, navigate to OTP (Passthrough for now) or directly to next step
                // Passing user object to next screen
                navigation.navigate('OTP', {
                    phoneNumber,
                    userId: data.user._id,
                    existingUser: data.msg === 'User logged in',
                    userRole: data.user.role,
                    userName: data.user.name
                });
            } else {
                Alert.alert('Hata', 'Giriş yapılamadı.');
            }
        } catch (error) {
            Alert.alert('Bağlantı Hatası', 'Sunucuya erişilemiyor. Lütfen backend\'in çalıştığından emin olun.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Hoş Geldiniz 👋</Text>
                        <Text style={styles.subtitle}>Devam etmek için telefon numaranızı girin.</Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Telefon Numarası"
                            placeholder="5XX XXX XX XX"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            maxLength={10}
                        />

                        <Button
                            title="Giriş Yap / Kayıt Ol"
                            onPress={handleLogin}
                            loading={loading}
                            disabled={phoneNumber.length < 10}
                            style={styles.button}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flexGrow: 1,
        padding: SPACING.l,
        justifyContent: 'center',
    },
    header: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    form: {
        marginTop: SPACING.m,
    },
    button: {
        marginTop: SPACING.m,
    },
});
