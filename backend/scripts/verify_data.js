const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servistakip';

const verify = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected to:', MONGO_URI);

        const drivers = await User.find({ role: 'DRIVER' });
        console.log(`Drivers found: ${drivers.length}`);
        drivers.forEach(d => console.log(` - ${d.name} (${d.phoneNumber})`));

        const services = await Service.find({});
        console.log(`Services found: ${services.length}`);
        services.forEach(s => console.log(` - ${s.name} (Code: ${s.code})`));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verify();
