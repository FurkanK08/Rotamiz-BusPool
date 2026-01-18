const mongoose = require('mongoose');
const User = require('./models/User');
const Service = require('./models/Service');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Service.deleteMany({});
        console.log('🗑️ Cleared existing data');

        // 1. Create Driver
        const driver = new User({
            phoneNumber: '5551112233', // Driver Login
            name: 'Ahmet Kaptan',
            role: 'DRIVER'
        });
        await driver.save();
        console.log('👤 Driver created: Ahmet Kaptan (5551112233)');

        // 2. Create 2 Services
        const service1 = new Service({
            driver: driver._id,
            name: 'Sabah Servisi - Fabrika',
            plate: '34 AAA 101',
            code: '1001',
            schedules: ['07:30'],
            active: false
        });

        const service2 = new Service({
            driver: driver._id,
            name: 'Akşam Servisi - Merkez',
            plate: '34 BBB 202',
            code: '2002',
            schedules: ['18:00'],
            active: false
        });

        // 3. Create 20 Passengers and assign to services
        const passengers = [];
        for (let i = 1; i <= 20; i++) {
            const passenger = new User({
                phoneNumber: `555333${i.toString().padStart(4, '0')}`, // e.g. 5553330001
                name: `Yolcu ${i}`,
                role: 'PASSENGER'
            });
            await passenger.save();
            passengers.push(passenger);
        }
        console.log('👥 20 Passengers created');

        // Assign first 10 to Service 1
        service1.passengers = passengers.slice(0, 10).map(p => p._id);
        await service1.save();
        console.log(`🚌 Service 1 created: ${service1.name} (Code: 1001) with 10 passengers`);

        // Assign next 10 to Service 2
        service2.passengers = passengers.slice(10, 20).map(p => p._id);
        await service2.save();
        console.log(`🚌 Service 2 created: ${service2.name} (Code: 2002) with 10 passengers`);

        // Also add logic for "Multi-Service Passenger" Scenario
        // Make 'Yolcu 1' join BOTH services
        service2.passengers.push(passengers[0]._id);
        await service2.save();
        console.log(`🔗 'Yolcu 1' added to BOTH services for testing multi-service support.`);

        console.log('✅ Seeding completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
};

seedData();
