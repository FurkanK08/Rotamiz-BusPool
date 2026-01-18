// Geocoding Service using Nominatim OpenStreetMap API
// Free, open-source alternative to Google Places API

export interface GeocodingResult {
    latitude: number;
    longitude: number;
    address: string;
    displayName: string;
}

const USER_AGENT = 'ServisTakipApp/1.0'; // Required by Nominatim
const BASE_URL = 'https://nominatim.openstreetmap.org';

// Rate limiting: Nominatim allows max 1 request/second
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;

    if (timeSinceLast < 1000) {
        // Wait to respect 1 req/sec limit
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
    }

    lastRequestTime = Date.now();

    return fetch(url, {
        headers: {
            'User-Agent': USER_AGENT
        }
    });
}

/**
 * Forward Geocoding: Search address and get coordinates
 * @param query - Address query (e.g., "Taksim, Istanbul")
 * @returns Array of geocoding results
 */
export async function searchAddress(query: string): Promise<GeocodingResult[]> {
    try {
        if (!query || query.length < 3) {
            return [];
        }

        const url = `${BASE_URL}/search?` +
            `q=${encodeURIComponent(query)}&` +
            `format=json&` +
            `limit=5&` +
            `addressdetails=1`;

        const response = await rateLimitedFetch(url);
        const data = await response.json();

        return data.map((item: any) => ({
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            address: item.display_name,
            displayName: item.display_name
        }));
    } catch (error) {
        console.error('Forward geocoding error:', error);
        return [];
    }
}

/**
 * Reverse Geocoding: Get address from coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Geocoding result or null
 */
export async function reverseGeocode(
    lat: number,
    lon: number
): Promise<GeocodingResult | null> {
    try {
        const url = `${BASE_URL}/reverse?` +
            `lat=${lat}&` +
            `lon=${lon}&` +
            `format=json&` +
            `addressdetails=1`;

        const response = await rateLimitedFetch(url);
        const data = await response.json();

        if (data.error) {
            console.warn('Reverse geocoding error:', data.error);
            return null;
        }

        return {
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lon),
            address: data.display_name,
            displayName: data.display_name
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Debounce utility for search input
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(later, wait);
    };
}
