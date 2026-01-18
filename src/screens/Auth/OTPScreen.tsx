import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useRoute, useNavigation } from '@react-navigation/native';

export const OTPScreen = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { phoneNumber, userId, existingUser, userRole, userName } = route.params;

    const handleVerify = () => {
        setLoading(true);
        // Simulate verification
        setTimeout(() => {
            setLoading(false);

            if (existingUser && userRole && userName) {
                if (userRole === 'DRIVER') {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'DriverDashboard', params: { userId } }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'PassengerHome', params: { userId } }],
                    });
                }
            } else {
                navigation.navigate('RoleSelection', { userId });
            }
        }, 1000);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, padding: SPACING.l }}
            >
                <Text style={styles.title}>Doğrulama Kodu</Text>
                <Text style={styles.subtitle}>
                    {phoneNumber} numarasına gönderilen 6 haneli kodu girin.
                </Text>

                <View style={styles.form}>
                    <Input
                        placeholder="000000"
                        keyboardType="number-pad"
                        value={code}
                        onChangeText={setCode}
                        maxLength={6}
                        style={styles.input}
                    />

                    <Button
                        title="Doğrula"
                        onPress={handleVerify}
                        loading={loading}
                        disabled={code.length < 6}
                    />

                    <Button
                        title="Tekrar Gönder"
                        variant="outline"
                        onPress={() => { }}
                        style={{ marginTop: SPACING.m }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.s,
        marginTop: SPACING.xl,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: SPACING.xl,
    },
    form: {
        flex: 1,
    },
    input: {
        textAlign: 'center',
        fontSize: 24,
        letterSpacing: 8,
    },
});
