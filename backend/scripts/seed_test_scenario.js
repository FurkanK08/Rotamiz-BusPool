const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

// Test Data Config
const DRIVER_PHONE = '5551112233';
const PASSENGER_START_PHONE = 5559990000; // Will increment
const CENTER_LAT = 41.0082;
const CENTER_LON = 28.9784;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const seed = async () => {
    await connectDB();

    // 1. Create Driver
    console.log('Creating Driver...');
    await User.deleteOne({ phoneNumber: DRIVER_PHONE });
    const driver = await User.create({
        phoneNumber: DRIVER_PHONE,
        name: 'Test Driver Yılmaz',
        role: 'DRIVER'
    });
    console.log(`Driver created: ${driver.name} (${driver.phoneNumber})`);

    // 2. Create 6 Passengers with Realistic Route (Zeytinburnu -> Fatih)
    console.log('Creating Passengers...');

    const routePoints = [
        { name: 'Yolcu Cevizlibağ', lat: 41.0150, lon: 28.9220 }, // Cevizlibağ Metrobüs
        { name: 'Yolcu Topkapı', lat: 41.0190, lon: 28.9300 },    // Topkapı
        { name: 'Yolcu Çapa', lat: 41.0165, lon: 28.9390 },       // Çapa
        { name: 'Yolcu Haseki', lat: 41.0135, lon: 28.9460 },     // Haseki
        { name: 'Yolcu Aksaray', lat: 41.0105, lon: 28.9510 },    // Aksaray
        { name: 'Yolcu Fatih', lat: 41.0145, lon: 28.9570 },      // Fatih Camii yakını
    ];

    const passengers = [];
    for (let i = 0; i < routePoints.length; i++) {
        const phone = (PASSENGER_START_PHONE + i).toString();
        await User.deleteOne({ phoneNumber: phone });

        const pt = routePoints[i];

        const passenger = await User.create({
            phoneNumber: phone,
            name: pt.name,
            role: 'PASSENGER',
            pickupLocation: {
                latitude: pt.lat,
                longitude: pt.lon,
                address: `Istanbul Harbiye`,
                addressDetail: `Durak ${i + 1}`
            }
        });
        passengers.push(passenger);
        console.log(`Passenger ${i + 1}: ${passenger.name} (${passenger.phoneNumber})`);
    }

    // 3. Create Service
    console.log('Creating Service...');
    const serviceCode = 'TEST';
    await Service.deleteOne({ code: serviceCode });

    const service = await Service.create({
        name: 'Test Servisi Istanbul',
        plate: '34 TEST 99',
        driver: driver._id,
        code: serviceCode,
        passengers: passengers.map(p => p._id),
        active: false
    });

    console.log('✅ SEED COMPLETED!');
    console.log('-----------------------------------');
    console.log('DRIVER LOGIN:', DRIVER_PHONE, '(Code: 1234)');
    console.log('PASSENGER 1 LOGIN:', passengers[0].phoneNumber, '(Code: 1234)');
    console.log('SERVICE CODE:', serviceCode);
    console.log('-----------------------------------');

    process.exit();
};

seed();
