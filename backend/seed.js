const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Service = require('./models/Service');
const Attendance = require('./models/Attendance');
const Shift = require('./models/Shift');
const AuditLog = require('./models/AuditLog');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // 1. Clear All Data
        console.log('Cleaning database...');
        await User.deleteMany({});
        await Service.deleteMany({});
        await Attendance.deleteMany({});
        await Shift.deleteMany({});
        await AuditLog.deleteMany({});

        // 2. Create Users
        console.log('Creating users...');

        // Driver
        const driver = await User.create({
            name: 'Ahmet Yılmaz (Sürücü)',
            phoneNumber: '5551112233',
            role: 'DRIVER',
            pushTokens: [{ token: 'ExponentPushToken[mock-driver]', deviceType: 'ANDROID' }]
        });

        // Passengers
        const passengers = await User.insertMany([
            { name: 'Ayşe Demir', phoneNumber: '5558889900', role: 'PASSENGER', pickupLocation: { latitude: 41.0082, longitude: 28.9784, address: 'Sultanahmet' } },
            { name: 'Mehmet Kaya', phoneNumber: '5558889901', role: 'PASSENGER', pickupLocation: { latitude: 41.0151, longitude: 28.9869, address: 'Eminönü' } },
            { name: 'Fatma Çelik', phoneNumber: '5558889902', role: 'PASSENGER', pickupLocation: { latitude: 41.0125, longitude: 28.9950, address: 'Kabataş' } },
            { name: 'Ali Vural', phoneNumber: '5558889903', role: 'PASSENGER', pickupLocation: { latitude: 41.0503, longitude: 29.0135, address: 'Beşiktaş' } },
        ]);

        // 3. Create Service
        console.log('Creating service...');
        const service = await Service.create({
            name: 'Avcılar - Maslak',
            plate: '34 AB 123',
            driver: driver._id,
            code: '1234',
            schedules: ['08:00', '18:00'],
            active: false,
            passengers: passengers.map(p => p._id),
            destination: {
                latitude: 41.1112,
                longitude: 29.0222,
                address: 'Maslak Plaza'
            }
        });

        // 4. Create Initial Attendance (For Today)
        console.log('Creating attendance records...');
        const today = new Date().toISOString().split('T')[0];

        // Mark first passenger as BINDI
        await Attendance.create({
            serviceId: service._id,
            passengerId: passengers[0]._id,
            date: today,
            status: 'BINDI',
            location: { latitude: 41.0082, longitude: 28.9784 }
        });

        // Mark second passenger as GELMEYECEK
        await Attendance.create({
            serviceId: service._id,
            passengerId: passengers[1]._id,
            date: today,
            status: 'GELMEYECEK',
            note: 'Hastayim'
        });

        // 5. Create Audit Log
        await AuditLog.create({
            userId: driver._id,
            action: 'SEED_DATABASE',
            targetCollection: 'System',
            targetId: service._id,
            details: { info: 'System initialized with seed data' },
            ipAddress: '127.0.0.1'
        });

        console.log('✅ Seeding Completed!');
        console.log(`Driver Phone: ${driver.phoneNumber}`);
        console.log(`Service Code: ${service.code}`);
        console.log(`Passengers created: ${passengers.length}`);

        process.exit();

    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

seedData();
