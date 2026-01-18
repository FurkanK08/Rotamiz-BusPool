/**
 * Permission System for Role-Based Access Control
 * Used to control feature access based on user role
 */

export type UserRole = 'driver' | 'passenger' | 'admin';

export interface MapPermissions {
    // Map Display
    canSeeAllPassengers: boolean;
    canSeeOwnLocation: boolean;
    canSeeDriverLocation: boolean;
    canSeeRoute: boolean;
    canSeeDestination: boolean;

    // Map Interaction
    canEditRoute: boolean;
    canTapMarkers: boolean;
    canZoom: boolean;
    canPan: boolean;
    canRecenter: boolean;

    // Service Control
    canUpdateAttendance: boolean;
    canControlService: boolean; // Start/Stop
    canRequestLocation: boolean;
    canLeaveService: boolean;

    // Location Sharing
    canShareLocationBackground: boolean;
    canShareLocationOnDemand: boolean;

    // UI Elements
    showAttendanceList: boolean;
    showServiceControls: boolean;
    showDriverInfo: boolean;
    showETA: boolean;
}

/**
 * Get permissions based on user role
 */
export function getPermissionsForRole(role: UserRole): MapPermissions {
    switch (role) {
        case 'driver':
            return {
                // Map Display
                canSeeAllPassengers: true,
                canSeeOwnLocation: true,
                canSeeDriverLocation: true,
                canSeeRoute: true,
                canSeeDestination: true,

                // Map Interaction
                canEditRoute: true,
                canTapMarkers: true,
                canZoom: true,
                canPan: true,
                canRecenter: true,

                // Service Control
                canUpdateAttendance: true,
                canControlService: true,
                canRequestLocation: true,
                canLeaveService: false, // Driver can't leave their own service

                // Location Sharing
                canShareLocationBackground: true,
                canShareLocationOnDemand: false,

                // UI Elements
                showAttendanceList: true,
                showServiceControls: true,
                showDriverInfo: false,
                showETA: false,
            };

        case 'passenger':
            return {
                // Map Display
                canSeeAllPassengers: false, // Privacy: only see self
                canSeeOwnLocation: true,
                canSeeDriverLocation: true,
                canSeeRoute: true,
                canSeeDestination: true,

                // Map Interaction
                canEditRoute: false,
                canTapMarkers: false, // Read-only
                canZoom: true,
                canPan: true,
                canRecenter: true,

                // Service Control
                canUpdateAttendance: false,
                canControlService: false,
                canRequestLocation: false,
                canLeaveService: true,

                // Location Sharing
                canShareLocationBackground: false,
                canShareLocationOnDemand: true, // Only when driver requests

                // UI Elements
                showAttendanceList: false,
                showServiceControls: false,
                showDriverInfo: true,
                showETA: true,
            };

        case 'admin':
            // Admin has all permissions
            return {
                canSeeAllPassengers: true,
                canSeeOwnLocation: true,
                canSeeDriverLocation: true,
                canSeeRoute: true,
                canSeeDestination: true,
                canEditRoute: true,
                canTapMarkers: true,
                canZoom: true,
                canPan: true,
                canRecenter: true,
                canUpdateAttendance: true,
                canControlService: true,
                canRequestLocation: true,
                canLeaveService: true,
                canShareLocationBackground: false,
                canShareLocationOnDemand: false,
                showAttendanceList: true,
                showServiceControls: true,
                showDriverInfo: true,
                showETA: true,
            };

        default:
            // Default: minimal permissions
            return {
                canSeeAllPassengers: false,
                canSeeOwnLocation: false,
                canSeeDriverLocation: true,
                canSeeRoute: true,
                canSeeDestination: false,
                canEditRoute: false,
                canTapMarkers: false,
                canZoom: true,
                canPan: true,
                canRecenter: true,
                canUpdateAttendance: false,
                canControlService: false,
                canRequestLocation: false,
                canLeaveService: false,
                canShareLocationBackground: false,
                canShareLocationOnDemand: false,
                showAttendanceList: false,
                showServiceControls: false,
                showDriverInfo: false,
                showETA: false,
            };
    }
}

/**
 * Permission checker helper
 */
export class PermissionChecker {
    private permissions: MapPermissions;

    constructor(role: UserRole) {
        this.permissions = getPermissionsForRole(role);
    }

    can(action: keyof MapPermissions): boolean {
        return this.permissions[action];
    }

    getAll(): MapPermissions {
        return this.permissions;
    }
}

/**
 * React Hook for permissions
 */
export function usePermissions(role: UserRole) {
    const permissions = getPermissionsForRole(role);

    const can = (action: keyof MapPermissions) => {
        return permissions[action];
    };

    return { permissions, can };
}
