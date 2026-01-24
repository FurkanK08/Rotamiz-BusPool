import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import AppLogger from '../utils/logger';
import { googleMapsService } from './googleMapsService';

// Environment-based URL configuration
const getApiUrl = () => {
    // If we have an explicit ENV var, use it (Production)
    if (process.env.API_URL) {
        return process.env.API_URL;
    }

    // Dynamic Development URL
    if (__DEV__) {
        // 1. Try to get IP from Expo Go Host URI (Physical Device support)
        const debuggerHost = Constants.expoConfig?.hostUri;
        if (debuggerHost) {
            const ip = debuggerHost.split(':')[0];
            return `http://${ip}:5000/api`;
        }

        // 2. Fallback for Android Emulator
        return 'http://10.0.2.2:5000/api';
    }

    // Default Fallback
    return 'http://10.0.2.2:5000/api';
};

const API_URL = getApiUrl();
console.log('🌐 API URL configured as:', API_URL);

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// ... (tokenService remains same) ...

// Token management
export const tokenService = {
    saveToken: async (token: string) => {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    },

    getToken: async (): Promise<string | null> => {
        return await AsyncStorage.getItem(TOKEN_KEY);
    },

    saveUser: async (user: any) => {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    getUser: async () => {
        const data = await AsyncStorage.getItem(USER_KEY);
        return data ? JSON.parse(data) : null;
    },

    clearAll: async () => {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
};

// Helper to create authenticated headers
const getAuthHeaders = async () => {
    const token = await tokenService.getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Robust Response Handler
const handleResponse = async (response: Response, endpoint: string) => {
    const text = await response.text();
    try {
        const data = JSON.parse(text);
        if (!response.ok) {
            throw new Error(data.msg || data.message || `API Error: ${response.status}`);
        }
        return data;
    } catch (e: any) {
        // If it's already an error thrown above, rethrow
        if (e.message && e.message.startsWith('API Error')) throw e;
        if (e.message && (e.message.startsWith('Join failed') || e.message.startsWith('Add passenger failed'))) throw e;

        // Otherwise it's a JSON parse error
        console.error(`❌ API Parse Error at ${endpoint}:`, text.substring(0, 200)); // Log first 200 chars
        throw new Error(`Invalid Server Response: ${text.substring(0, 50)}...`);
    }
};

export const api = {
    auth: {
        login: async (phoneNumber: string) => {
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber }),
                });
                const data = await handleResponse(response, '/auth/login');

                // Save token and user if login successful
                if (data.token) {
                    await tokenService.saveToken(data.token);
                }
                if (data.user) {
                    await tokenService.saveUser(data.user);
                }

                return data;
            } catch (error) {
                console.error('Login Error:', error);
                throw error;
            }
        },

        updateProfile: async (userId: string, name: string, role: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/auth/profile`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ userId, name, role }),
                });
                return await handleResponse(response, '/auth/profile');
            } catch (error) {
                console.error('Profile Update Error:', error);
                throw error;
            }
        },

        logout: async () => {
            await tokenService.clearAll();
        },

        isLoggedIn: async (): Promise<boolean> => {
            const token = await tokenService.getToken();
            return !!token;
        }
    },

    services: {
        create: async (driverId: string, name: string, plate: string, schedules: string[], destination?: any) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/create`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ driverId, name, plate, schedules, destination }),
                });
                return await handleResponse(response, '/services/create');
            } catch (error) {
                console.error('Create Service Error:', error);
                throw error;
            }
        },

        getDriverServices: async (driverId: string) => {
            AppLogger.apiRequest('GET', `/services/driver/${driverId}`);
            try {
                const url = `${API_URL}/services/driver/${driverId}`;
                const response = await fetch(url);
                const data = await handleResponse(response, `/services/driver/${driverId}`);
                AppLogger.apiResponse(url, response.status, data);
                return data;
            } catch (error) {
                AppLogger.apiError(`/services/driver/${driverId}`, error);
                throw error;
            }
        },

        updateService: async (serviceId: string, data: any) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/${serviceId}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(data),
                });
                return await response.json();
            } catch (error) {
                console.error('Update Service Error:', error);
                throw error;
            }
        },

        deleteService: async (serviceId: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/${serviceId}`, {
                    method: 'DELETE',
                    headers
                });
                return await response.json();
            } catch (error) {
                console.error('Delete Service Error:', error);
                throw error;
            }
        },

        removePassenger: async (serviceId: string, passengerId: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/remove-passenger`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ serviceId, passengerId }),
                });
                return await response.json();
            } catch (error) {
                console.error('Remove Passenger Error:', error);
                throw error;
            }
        },

        addPassenger: async (serviceId: string, phoneNumber: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/add-passenger`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ serviceId, phoneNumber }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || 'Add passenger failed');
                return data;
            } catch (error) {
                console.error('Add Passenger Error:', error);
                throw error;
            }
        },

        join: async (passengerId: string, code: string, pickupLocation?: any) => {
            try {
                const headers = await getAuthHeaders();
                const body: any = { passengerId, code };
                if (pickupLocation) {
                    body.pickupLocation = pickupLocation;
                }
                const response = await fetch(`${API_URL}/services/join`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || 'Join failed');
                return data;
            } catch (error) {
                console.error('Join Service Error:', error);
                throw error;
            }
        },

        getPassengerServices: async (passengerId: string) => {
            console.log('[API] getPassengerServices called with passengerId:', passengerId);
            console.log('[API] API_URL:', API_URL);
            try {
                const url = `${API_URL}/services/passenger/${passengerId}`;
                console.log('[API] Fetching:', url);
                const response = await fetch(url);
                console.log('[API] Response status:', response.status);
                return await handleResponse(response, `/services/passenger/${passengerId}`);
            } catch (error) {
                console.error('[API] Get Passenger Services Error:', error);
                throw error;
            }
        },

        updateLocation: async (userId: string, latitude: number, longitude: number, address?: string, addressDetail?: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/users/${userId}/location`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ latitude, longitude, address, addressDetail }),
                });
                return await handleResponse(response, '/users/location');
            } catch (error) {
                console.error('Update Location Error:', error);
                throw error;
            }
        },

        updateAttendance: async (serviceId: string, passengerId: string, status: 'BINDI' | 'BINMEDI' | 'BEKLIYOR', date: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/attendance`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ serviceId, passengerId, status, date }),
                });
                return await response.json();
            } catch (error) {
                console.error('Update Attendance Error:', error);
                throw error;
            }
        },

        resetAttendance: async (serviceId: string, date: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/attendance/reset`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ serviceId, date }),
                });
                return await response.json();
            } catch (error) {
                console.error('Reset Attendance Error:', error);
                throw error;
            }
        },

        updateFutureAttendance: async (serviceId: string, passengerId: string, dates: string[], status: 'GELMEYECEK') => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/services/attendance/future`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ serviceId, passengerId, dates, status }),
                });
                return await response.json();
            } catch (error) {
                console.error('Update Future Attendance Error:', error);
                throw error;
            }
        }
    },

    notifications: {
        getAll: async (userId: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/notifications?userId=${userId}`, {
                    headers
                });
                return await response.json();
            } catch (error) {
                console.error('Get Notifications Error:', error);
                throw error;
            }
        },
        markAsRead: async (notificationId: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
                    method: 'PUT',
                    headers
                });
                return await response.json();
            } catch (error) {
                console.error('Mark Read Error:', error);
                throw error;
            }
        },
        delete: async (notificationId: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
                    method: 'DELETE',
                    headers
                });
                return await response.json();
            } catch (error) {
                console.error('Delete Notification Error:', error);
                throw error;
            }
        },
        respond: async (notificationId: string, responseValue: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/notifications/${notificationId}/respond`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ response: responseValue })
                });
                return await response.json();
            } catch (error) {
                console.error('Notification Response Error:', error);
                throw error;
            }
        }
    },

    users: {
        updatePushToken: async (userId: string, pushToken: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/users/push-token`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ userId, pushToken }),
                });
                return await response.json();
            } catch (error) {
                console.error('Update Push Token Error:', error);
                throw error;
            }
        },

        getProfile: async (userId: string) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/users/${userId}`, {
                    headers,
                });
                return await response.json();
            } catch (error) {
                console.error('Get Profile Error:', error);
                throw error;
            }
        },

        updateNotificationPreferences: async (userId: string, preferences: any) => {
            try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/users/${userId}/notification-preferences`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ notificationPreferences: preferences }),
                });
                return await response.json();
            } catch (error) {
                console.error('Update Notification Preferences Error:', error);
                throw error;
            }
        }
    },

    routing: {
        getRoadRoute: async (startLat: number, startLon: number, endLat: number, endLon: number) => {
            try {
                // NEW: Use Google Maps Routes API (Traffic Aware)
                const route = await googleMapsService.getRoute(
                    { latitude: startLat, longitude: startLon },
                    { latitude: endLat, longitude: endLon }
                );

                if (!route) {
                    return { coordinates: [], distance: 0, duration: 0 };
                }

                return {
                    coordinates: route.coordinates,
                    distance: route.distance, // meters
                    duration: route.duration  // seconds
                };
            } catch (error) {
                console.error('Routing Error:', error);
                return { coordinates: [], distance: 0, duration: 0 };
            }
        },

        // Expose Roads API for Map Matching
        snapToRoad: async (coordinates: any[]) => {
            return await googleMapsService.snapToRoads(coordinates);
        }
    }
};
