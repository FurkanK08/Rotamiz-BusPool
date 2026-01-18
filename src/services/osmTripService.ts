// OSRM Trip Service Implementation
// This provides TSP (Traveling Salesman Problem) optimization for multiple waypoints

import { api } from './api';

/**
 * OSRM Trip Service - Optimized Route Planning
 * 
 * Uses OSRM's /trip endpoint which solves TSP:
 * - For < 10 waypoints: Brute force (optimal solution)
 * - For >= 10 waypoints: Greedy heuristic (farthest-insertion)
 * 
 * Returns:
 * - Optimized waypoint order
 * - Road-based route geometry
 * - Total distance and duration
 */

export interface TripWaypoint {
    latitude: number;
    longitude: number;
    id?: string; // Optional passenger ID
    name?: string; // Optional name
}

export interface TripResult {
    waypoints: TripWaypoint[]; // Optimized order
    routeCoordinates: { latitude: number; longitude: number }[];
    distance: number; // meters
    duration: number; // seconds
}

/**
 * Get optimized trip route using OSRM Trip service
 * 
 * @param waypoints Array of waypoints to visit
 * @param options Configuration options
 * @returns Optimized route with waypoint order
 * 
 * Example:
 * ```typescript
 * const waypoints = [
 *   { latitude: 41.0150, longitude: 28.9220, id: 'p1' },
 *   { latitude: 41.0190, longitude: 28.9300, id: 'p2' },
 *   { latitude: 41.0165, longitude: 28.9390, id: 'p3' }
 * ];
 * 
 * const trip = await getOptimizedTrip(waypoints, {
 *   source: 'first', // Start from first waypoint (driver)
 *   destination: 'last', // End at specific destination
 *   roundtrip: false
 * });
 * ```
 */
export async function getOptimizedTrip(
    waypoints: TripWaypoint[],
    options: {
        source?: 'first' | 'any'; // Which waypoint is start (default: 'any')
        destination?: 'last' | 'any'; // Which waypoint is end (default: 'any')
        roundtrip?: boolean; // Return to start? (default: false)
    } = {}
): Promise<TripResult | null> {
    try {
        if (waypoints.length < 2) {
            console.warn('Need at least 2 waypoints for trip optimization');
            return null;
        }

        // Format coordinates as lon,lat;lon,lat;...
        const coords = waypoints
            .map(w => `${w.longitude},${w.latitude}`)
            .join(';');

        // Build query params
        const params = new URLSearchParams({
            overview: 'full',
            geometries: 'geojson',
            source: options.source || 'first', // Driver location is usually first
            destination: options.destination || 'last', // Service destination is last
            roundtrip: (options.roundtrip ?? false).toString()
        });

        const url = `http://router.project-osrm.org/trip/v1/driving/${coords}?${params}`;

        console.log('🚗 OSRM Trip Request:', url);
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.trips || data.trips.length === 0) {
            console.error('OSRM Trip failed:', data);
            return null;
        }

        const trip = data.trips[0];

        // Extract optimized waypoint order
        // OSRM returns waypoint_index in the order they should be visited
        const optimizedWaypoints: TripWaypoint[] = [];
        if (data.waypoints) {
            for (const wp of data.waypoints) {
                const originalIndex = wp.waypoint_index;
                optimizedWaypoints.push(waypoints[originalIndex]);
            }
        }

        // Convert geometry to coordinates
        const routeCoordinates = trip.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0]
        }));

        const result: TripResult = {
            waypoints: optimizedWaypoints,
            routeCoordinates,
            distance: trip.distance, // meters
            duration: trip.duration, // seconds
        };

        console.log(`✅ OSRM Trip optimized: ${waypoints.length} points, ${(trip.distance / 1000).toFixed(2)} km`);
        return result;

    } catch (error) {
        console.error('OSRM Trip Error:', error);
        return null;
    }
}

/**
 * Helper: Calculate distance savings with optimization
 * Compares optimized route vs original order
 */
export function calculateSavings(
    originalDistance: number,
    optimizedDistance: number
): {
    savedKm: number;
    savedPercent: number;
    savedMinutes: number; // Assumes 30 km/h average
} {
    const savedMeters = originalDistance - optimizedDistance;
    const savedKm = savedMeters / 1000;
    const savedPercent = (savedMeters / originalDistance) * 100;
    const savedMinutes = (savedKm / 30) * 60; // 30 km/h average city speed

    return {
        savedKm: parseFloat(savedKm.toFixed(2)),
        savedPercent: parseFloat(savedPercent.toFixed(1)),
        savedMinutes: Math.round(savedMinutes)
    };
}

/**
 * Usage Example in ActiveTripScreen:
 * 
 * // Build waypoint list
 * const waypoints: TripWaypoint[] = [
 *   // Driver location (first)
 *   { latitude: driverLat, longitude: driverLon, id: 'driver' },
 *   // All passengers
 *   ...activePassengers.map(p => ({
 *     latitude: p.pickupLocation.latitude,
 *     longitude: p.pickupLocation.longitude,
 *     id: p._id,
 *     name: p.name
 *   })),
 *   // Service destination (last)
 *   { latitude: destination.latitude, longitude: destination.longitude, id: 'dest' }
 * ];
 * 
 * // Get optimized trip
 * const trip = await getOptimizedTrip(waypoints, {
 *   source: 'first',    // Start from driver
 *   destination: 'last', // End at destination
 *   roundtrip: false
 * });
 * 
 * if (trip) {
 *   setRouteCoordinates(trip.routeCoordinates);
 *   // Update passenger order UI based on trip.waypoints
 * }
 */
