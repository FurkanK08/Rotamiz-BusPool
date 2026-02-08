import googleMapsClient from './GoogleMapsClient';

export interface ETAResult {
    distance: string; // e.g. "15 km"
    duration: string; // e.g. "25 mins" - considering traffic
    durationValue: number; // seconds
}

export const ETAService = {
    getETA: async (
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number }
    ): Promise<ETAResult | null> => {
        try {
            const response = await googleMapsClient.get('/distancematrix/json', {
                params: {
                    origins: `${origin.latitude},${origin.longitude}`,
                    destinations: `${destination.latitude},${destination.longitude}`,
                    mode: 'driving',
                    departure_time: 'now', // Critical for traffic info
                },
            });

            if (response.data.status !== 'OK') {
                console.error('Google Distance Matrix API Error:', response.data.status);
                return null;
            }

            const element = response.data.rows[0].elements[0];

            if (element.status !== 'OK') {
                return null;
            }

            // Prefer duration_in_traffic if available
            const durationObj = element.duration_in_traffic || element.duration;

            return {
                distance: element.distance.text,
                duration: durationObj.text,
                durationValue: durationObj.value,
            };
        } catch (error) {
            console.error('ETA Service Error:', error);
            return null;
        }
    },
};
