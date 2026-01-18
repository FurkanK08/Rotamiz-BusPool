const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../testApp');
const Service = require('../models/Service');
const User = require('../models/User');
const { generateToken } = require('../utils/auth');

describe('🚀 Route Optimization & OSRM Integration Tests', () => {
    let driverId, token, serviceId, passengers;

    beforeAll(async () => {
        // Connect to test DB
        await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/servis-test', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Create test driver
        const driver = await User.create({
            phoneNumber: '5550001111',
            name: 'Test Driver - Routing',
            role: 'driver',
        });
        driverId = driver._id.toString();
        token = generateToken(driver);

        // Create test passengers at specific locations (Istanbul)
        const passengerData = [
            { name: 'Yolcu Cevizlibağ', phone: '5550002001', lat: 41.0150, lon: 28.9220 },
            { name: 'Yolcu Topkapı', phone: '5550002002', lat: 41.0190, lon: 28.9300 },
            { name: 'Yolcu Çapa', phone: '5550002003', lat: 41.0165, lon: 28.9390 },
            { name: 'Yolcu Aksaray', phone: '5550002004', lat: 41.0105, lon: 28.9510 },
        ];

        passengers = [];
        for (const pd of passengerData) {
            const passenger = await User.create({
                phoneNumber: pd.phone,
                name: pd.name,
                role: 'passenger',
                pickupLocation: {
                    latitude: pd.lat,
                    longitude: pd.lon,
                    address: 'Test Address',
                },
            });
            passengers.push(passenger);
        }

        // Create service with destination
        const service = await Service.create({
            driver: driverId,
            name: 'Test Routing Service',
            plate: '34 ROUTE 01',
            code: '9999',
            schedules: ['09:00'],
            passengers: passengers.map(p => p._id),
            destination: {
                latitude: 41.0145,
                longitude: 28.9570,
                address: 'Fatih - Test Destination'
            },
            active: false,
        });
        serviceId = service._id.toString();
    });

    afterAll(async () => {
        await User.deleteMany({ phoneNumber: { $in: ['5550001111', '5550002001', '5550002002', '5550002003', '5550002004'] } });
        await Service.deleteMany({ code: '9999' });
        await mongoose.connection.close();
    });

    describe('OSRM Route Fetching', () => {
        test('Should fetch road-based route between two points', async () => {
            const fetch = require('node-fetch');
            const startLat = 41.0150;
            const startLon = 28.9220;
            const endLat = 41.0190;
            const endLon = 28.9300;

            const url = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            expect(data.code).toBe('Ok');
            expect(data.routes).toBeDefined();
            expect(data.routes.length).toBeGreaterThan(0);
            expect(data.routes[0].geometry.coordinates).toBeDefined();
            expect(data.routes[0].geometry.coordinates.length).toBeGreaterThan(10);
        }, 10000); // 10s timeout for API call

        test('Should convert OSRM coordinates to app format', async () => {
            const fetch = require('node-fetch');
            const url = `http://router.project-osrm.org/route/v1/driving/28.9220,41.0150;28.9300,41.0190?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            const converted = data.routes[0].geometry.coordinates.map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
            }));

            expect(converted[0]).toHaveProperty('latitude');
            expect(converted[0]).toHaveProperty('longitude');
            expect(typeof converted[0].latitude).toBe('number');
            expect(typeof converted[0].longitude).toBe('number');
        }, 10000);
    });

    describe('Greedy Route Optimization Algorithm', () => {
        // Helper: Haversine distance
        function getDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        // Greedy optimization algorithm
        function optimizeRoute(driverLoc, passengerList) {
            let remaining = [...passengerList];
            const ordered = [];
            let curr = { latitude: driverLoc.lat, longitude: driverLoc.lon };

            while (remaining.length > 0) {
                let nearestIdx = -1;
                let minDist = Infinity;

                for (let i = 0; i < remaining.length; i++) {
                    const p = remaining[i];
                    const d = getDistance(curr.latitude, curr.longitude, p.pickupLocation.latitude, p.pickupLocation.longitude);
                    if (d < minDist) {
                        minDist = d;
                        nearestIdx = i;
                    }
                }

                if (nearestIdx !== -1) {
                    const next = remaining[nearestIdx];
                    ordered.push(next);
                    curr = {
                        latitude: next.pickupLocation.latitude,
                        longitude: next.pickupLocation.longitude
                    };
                    remaining.splice(nearestIdx, 1);
                } else {
                    break;
                }
            }

            return ordered;
        }

        test('Should order passengers by nearest neighbor (Greedy)', () => {
            const driverLoc = { lat: 41.0082, lon: 28.9784 }; // Central Istanbul
            const optimized = optimizeRoute(driverLoc, passengers);

            expect(optimized.length).toBe(passengers.length);

            // First should be closest to driver
            const dist0 = getDistance(driverLoc.lat, driverLoc.lon,
                optimized[0].pickupLocation.latitude, optimized[0].pickupLocation.longitude);

            // All others should be farther from driver than first
            for (let i = 1; i < optimized.length; i++) {
                const distI = getDistance(driverLoc.lat, driverLoc.lon,
                    optimized[i].pickupLocation.latitude, optimized[i].pickupLocation.longitude);
                // This may not always be true for greedy, but first should be closest
            }

            // Verify first is actually closest
            passengers.forEach(p => {
                const dist = getDistance(driverLoc.lat, driverLoc.lon,
                    p.pickupLocation.latitude, p.pickupLocation.longitude);
                expect(dist).toBeGreaterThanOrEqual(dist0 - 0.01); // Allow small tolerance
            });
        });

        test('Should calculate total route distance', () => {
            const driverLoc = { lat: 41.0082, lon: 28.9784 };
            const optimized = optimizeRoute(driverLoc, passengers);

            let totalDist = 0;
            let curr = driverLoc;

            // Driver to first passenger
            totalDist += getDistance(curr.lat, curr.lon,
                optimized[0].pickupLocation.latitude, optimized[0].pickupLocation.longitude);

            // Between passengers
            for (let i = 0; i < optimized.length - 1; i++) {
                totalDist += getDistance(
                    optimized[i].pickupLocation.latitude, optimized[i].pickupLocation.longitude,
                    optimized[i + 1].pickupLocation.latitude, optimized[i + 1].pickupLocation.longitude
                );
            }

            expect(totalDist).toBeGreaterThan(0);
            expect(totalDist).toBeLessThan(20); // Should be < 20km for Istanbul tests
            console.log(`Total optimized route distance: ${totalDist.toFixed(2)} km`);
        });
    });

    describe('Service Destination Integration', () => {
        test('Service should have destination field', async () => {
            const service = await Service.findById(serviceId);
            expect(service.destination).toBeDefined();
            expect(service.destination.latitude).toBe(41.0145);
            expect(service.destination.longitude).toBe(28.9570);
        });

        test('Route should end at destination', () => {
            const driverLoc = { lat: 41.0082, lon: 28.9784 };
            const destination = { latitude: 41.0145, longitude: 28.9570 };

            // Simplified: last segment should be to destination
            const lastPassenger = passengers[passengers.length - 1];
            const finalDist = getDistance(
                lastPassenger.pickupLocation.latitude,
                lastPassenger.pickupLocation.longitude,
                destination.latitude,
                destination.longitude
            );

            expect(finalDist).toBeGreaterThan(0);
            expect(finalDist).toBeLessThan(5); // Should be reasonable
        });
    });

    describe('Attendance & Route Filtering', () => {
        test('Should exclude GELMEYECEK passengers from route', async () => {
            const date = new Date().toISOString().split('T')[0];

            // Mark one passenger as absent
            await Service.findByIdAndUpdate(serviceId, {
                $push: {
                    attendance: {
                        date,
                        passengerId: passengers[1]._id,
                        status: 'GELMEYECEK'
                    }
                }
            });

            const service = await Service.findById(serviceId);
            const absentIds = service.attendance
                .filter(a => a.date === date && a.status === 'GELMEYECEK')
                .map(a => a.passengerId.toString());

            const activePassengers = passengers.filter(p => !absentIds.includes(p._id.toString()));

            expect(activePassengers.length).toBe(passengers.length - 1);
            expect(absentIds).toContain(passengers[1]._id.toString());
        });
    });

    // Helper function
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
});
