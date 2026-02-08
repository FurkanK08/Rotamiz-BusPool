import googleMapsClient from './GoogleMapsClient';


export interface RouteStep {
    latitude: number;
    longitude: number;
}

export interface RouteResult {
    points: RouteStep[];
    distance: string;
    duration: string;
    overviewPolyline: string;
}

export const DirectionsService = {
    getRoute: async (
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number },
        waypoints?: { latitude: number; longitude: number }[]
    ): Promise<RouteResult | null> => {
        try {
            const params: any = {
                origin: `${origin.latitude},${origin.longitude}`,
                destination: `${destination.latitude},${destination.longitude}`,
                mode: 'driving',
            };

            if (waypoints && waypoints.length > 0) {
                // Google expects waypoints as: "lat,lon|lat,lon|..."
                // Use optimize:true for TSP (Traveling Salesman)
                const waypointsStr = 'optimize:true|' + waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
                params.waypoints = waypointsStr;
            }

            const response = await googleMapsClient.get('/directions/json', { params });

            if (response.data.status !== 'OK') {
                console.error('Google Directions API Error:', response.data.status, response.data.error_message);
                return null;
            }

            const route = response.data.routes[0];
            const legs = route.legs;
            const overviewPolyline = route.overview_polyline.points;

            // Calculate total distance and duration from legs
            let totalDistanceValue = 0;
            let totalDurationValue = 0;

            legs.forEach((leg: any) => {
                totalDistanceValue += leg.distance.value;
                totalDurationValue += leg.duration.value;
            });

            // Decode polyline
            const points = decodePolyline(overviewPolyline);

            return {
                points,
                distance: (totalDistanceValue / 1000).toFixed(1) + ' km',
                duration: Math.ceil(totalDurationValue / 60) + ' dk', // Minutes
                overviewPolyline,
            };
        } catch (error) {
            console.error('Directions Service Error:', error);
            return null;
        }
    },
};

// Simple Polyline Decoder Implementation to avoid extra deps if possible
function decodePolyline(t: string) {
    let points: RouteStep[] = [];
    let index = 0, len = t.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = t.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = t.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) });
    }
    return points;
}
