import axios from 'axios';
import Constants from 'expo-constants';

// Get API Key from various possible sources
export const getGoogleMapsApiKey = () => {
    // Priority 1: .env file (exposed via babel-plugin-dotenv-import or similar)
    if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
        return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    }
    // Priority 2: app.json (expo constants)
    const androidKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
    const iosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;

    return androidKey || iosKey || '';
};

const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

const googleMapsClient = axios.create({
    baseURL: 'https://maps.googleapis.com/maps/api',
    timeout: 10000,
});

// Request interceptor to add API Key to every request
googleMapsClient.interceptors.request.use((config) => {
    config.params = config.params || {};
    config.params['key'] = GOOGLE_MAPS_API_KEY;
    return config;
});

export default googleMapsClient;
