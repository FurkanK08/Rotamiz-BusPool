const io = require('socket.io-client');
const mongoose = require('mongoose');
const Service = require('./models/Service');
require('dotenv').config();

const SOCKET_URL = 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

// Mock IDs (must match seed data or be valid)
// We'll fetch a real service ID from DB first
let serviceId;
let driverSocket;
let passengerSocket;

const runTest = async () => {
    console.log('🧪 Starting System Check...');

    try {
        await mongoose.connect(MONGO_URI);
        const service = await Service.findOne({ active: false }); // Find a resting service
        if (!service) {
            console.error('❌ No service found in DB. Run seed first.');
            process.exit(1);
        }
        serviceId = service._id.toString();
        console.log(`📋 Testing with Service ID: ${serviceId} (${service.name})`);

        // 1. Connect Driver
        driverSocket = io(SOCKET_URL);
        await new Promise(resolve => driverSocket.on('connect', resolve));
        console.log('✅ Driver Connected');

        // 2. Connect Passenger
        passengerSocket = io(SOCKET_URL);
        await new Promise(resolve => passengerSocket.on('connect', resolve));
        console.log('✅ Passenger Connected');

        // 3. Join Rooms
        driverSocket.emit('joinService', serviceId);
        passengerSocket.emit('joinService', serviceId);
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Both joined service room');

        // 4. Test: Driver Requests Location
        console.log('🔄 Testing: Location Request Flow...');

        const locRequestPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Timeout waiting for location request'), 2000);

            passengerSocket.on('shareLocationRequest', () => {
                clearTimeout(timeout);
                console.log('   Pass→ Received Location Request from Driver');
                // Simulate sending location back
                passengerSocket.emit('passengerLocation', {
                    serviceId,
                    passengerId: 'test-passenger-1',
                    location: { lat: 41.0, lng: 29.0 }
                });
                resolve();
            });
        });

        const locReceivePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Timeout waiting for passenger location'), 2000);

            driverSocket.on('driverReceivePassengerLocation', (data) => {
                clearTimeout(timeout);
                console.log(`   Drvr→ Received Passenger Location: ${JSON.stringify(data.location)}`);
                resolve();
            });
        });

        driverSocket.emit('requestPassengerLocation', { serviceId });

        await Promise.all([locRequestPromise, locReceivePromise]);
        console.log('✅ Location Request Flow SUCCESS');

        // 5. Test: Stop Service
        console.log('🔄 Testing: Stop Service Flow...');

        const stopServicePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Timeout waiting for stop service event'), 2000);

            passengerSocket.on('serviceStopped', () => {
                clearTimeout(timeout);
                console.log('   Pass→ Received Service Stopped Event');
                resolve();
            });
        });

        driverSocket.emit('stopService', { serviceId });

        await stopServicePromise;
        console.log('✅ Stop Service Flow SUCCESS');

        // Verify DB update
        const updatedService = await Service.findById(serviceId);
        if (updatedService.active === false) {
            console.log('✅ DB Check: Service status is ACTIVE=FALSE');
        } else {
            console.error('❌ DB Check Failed: Service active is ' + updatedService.active);
        }

        console.log('\n🎉 ALL CHECKS PASSED. System is functioning correctly.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    } finally {
        if (driverSocket) driverSocket.close();
        if (passengerSocket) passengerSocket.close();
        mongoose.disconnect();
    }
};

runTest();
