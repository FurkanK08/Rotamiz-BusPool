import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

import { LoginScreen } from '../screens/Auth/LoginScreen';
import { OTPScreen } from '../screens/Auth/OTPScreen';
import { RoleSelectionScreen } from '../screens/Auth/RoleSelectionScreen';
import { DriverDashboardScreen } from '../screens/Driver/DriverDashboardScreen';
import { CreateServiceScreen } from '../screens/Driver/CreateServiceScreen';
import { ServiceDetailScreen } from '../screens/Driver/ServiceDetailScreen';
import { ActiveTripScreen } from '../screens/Driver/ActiveTripScreen';
import { PassengerHomeScreen } from '../screens/Passenger/PassengerHomeScreen';
import { JoinServiceScreen } from '../screens/Passenger/JoinServiceScreen';
import { PassengerLocationScreen } from '../screens/Passenger/PassengerLocationScreen';
import { PassengerTrackingScreen } from '../screens/Passenger/PassengerTrackingScreen';
import { PassengerAbsenceScreen } from '../screens/Passenger/PassengerAbsenceScreen';

// ... inside Stack.Navigator

import { PassengerSettingsScreen } from '../screens/Passenger/PassengerSettingsScreen';
import { NotificationScreen } from '../screens/Common/NotificationScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- COMPONENTS FOR ICONS ---
const TabIcon = ({ focused, name }: { focused: boolean, name: string }) => (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{name}</Text>
);

// --- DRIVER TABS ---
const DriverTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.white,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'gray',
            }}
        >
            <Tab.Screen
                name="DriverHome"
                component={DriverDashboardScreen}
                options={{
                    tabBarLabel: 'Seferler',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="🚌" />
                }}
            />
            {/* Using PassengerSettings as a generic profile screen for now */}
            <Tab.Screen
                name="DriverProfile"
                component={PassengerSettingsScreen}
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="👤" />
                }}
            />
        </Tab.Navigator>
    );
};

// --- PASSENGER TABS ---
const PassengerTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.white,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'gray',
            }}
        >
            <Tab.Screen
                name="PassengerHomeTab"
                component={PassengerHomeScreen}
                options={{
                    tabBarLabel: 'Servis',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="🚍" />
                }}
            />
            <Tab.Screen
                name="PassengerProfile"
                component={PassengerSettingsScreen}
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="👤" />
                }}
            />
        </Tab.Navigator>
    );
};

export const RootNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.background },
                }}
            >
                {/* Auth Flow */}
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="OTP" component={OTPScreen} />
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

                {/* Main App Flows (Tabs) */}
                <Stack.Screen name="DriverDashboard" component={DriverTabs} />
                <Stack.Screen name="PassengerHome" component={PassengerTabs} />

                {/* Driver Sub-Screens */}
                <Stack.Screen name="CreateService" component={CreateServiceScreen} />
                <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
                <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />

                {/* Passenger Sub-Screens */}
                <Stack.Screen name="JoinService" component={JoinServiceScreen} />
                <Stack.Screen name="PassengerLocation" component={PassengerLocationScreen} />
                <Stack.Screen name="PassengerTracking" component={PassengerTrackingScreen} />
                <Stack.Screen name="PassengerSettings" component={PassengerSettingsScreen} />
                <Stack.Screen name="PassengerAbsence" component={PassengerAbsenceScreen} />

                {/* Common */}
                <Stack.Screen name="Notifications" component={NotificationScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
