const io = require('socket.io-client');
const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';
const SOCKET_URL = 'http://localhost:5000'; // Make sure this matches your server

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const simulate = async () => {
    await connectDB();

    // Find the test service
    const service = await Service.findOne({ code: 'TEST' });
    if (!service) {
        console.error('Test Service not found! Run seed_test_scenario.js first.');
        process.exit(1);
    }

    const serviceId = service._id.toString();
    console.log(`Simulating trip for Service: ${service.name} (${serviceId})`);

    // Connect Socket
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log('🔌 Connected to Socket Server');
        socket.emit('joinService', serviceId);
    });

    // Path Simulation (Simple circular or linear path)
    let lat = 41.0082;
    let lon = 28.9784;
    let step = 0;

    console.log('🚀 Simulation started! Press Ctrl+C to stop.');

    setInterval(() => {
        // Move slightly
        lat += 0.0002;
        lon += 0.0002;
        step++;

        const locationPayload = {
            latitude: lat,
            longitude: lon,
            speed: 45, // km/h
            heading: 90
        };

        // Emit 'driverLocation' event specifically for this service
        // Note: The backend expects (serviceId, location)
        socket.emit('driverLocation', { serviceId, location: locationPayload });

        console.log(`[Step ${step}] Sent Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }, 2000); // Every 2 seconds
};

simulate();
