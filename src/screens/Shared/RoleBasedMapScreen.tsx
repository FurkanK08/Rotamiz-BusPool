import React from 'react';
import { View, StyleSheet } from 'react-native';
import { UserRole, usePermissions } from '../../utils/permissions';

/**
 * Role-Based Map Screen Router
 * 
 * Routes to appropriate screen based on user role
 * This provides a unified entry point with role-based rendering
 * 
 * NOTE: Currently re-uses existing screens. In future, can create
 * a unified SharedMapView component.
 */

interface RouteParams {
    role: UserRole;
    serviceId: string;
    userId: string;
    driverId?: string;
    service?: any;
}

export const RoleBasedMapScreen: React.FC<{ route: { params: RouteParams } }> = ({ route: navRoute }) => {
    const { role, serviceId, userId, driverId, service } = navRoute.params;
    const { permissions } = usePermissions(role);

    // Log permissions for debugging
    React.useEffect(() => {
        console.log(`📋 RoleBasedMap - Role: ${role}`, permissions);
    }, [role, permissions]);

    // For now, this is just a router/documentation component
    // Actual implementation uses existing ActiveTripScreen and PassengerTrackingScreen
    // They already have the correct logic, just need to be called with right params

    return (
        <View style={styles.container}>
            {/* This component is a router/HOC concept */}
            {/* Actual screens are navigated to directly for now */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
