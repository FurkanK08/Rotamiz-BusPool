const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

const dummyLocations = [
    { latitude: 41.0082, longitude: 28.9784 }, // Near default start
    { latitude: 41.0090, longitude: 28.9790 }, // ~100m away
    { latitude: 41.0075, longitude: 28.9770 }, // ~150m away
    { latitude: 41.0100, longitude: 28.9800 }, // ~250m away
];

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const passengers = await User.find({ role: 'PASSENGER' });
        console.log(`Found ${passengers.length} passengers.`);

        for (let i = 0; i < passengers.length; i++) {
            const passenger = passengers[i];
            const loc = dummyLocations[i % dummyLocations.length];

            passenger.pickupLocation = loc;
            await passenger.save();
            console.log(`Updated ${passenger.name || passenger.phoneNumber} to ${loc.latitude}, ${loc.longitude}`);
        }

        console.log('✅ All passengers updated with dummy locations.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
