const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: false,
    },
    role: {
        type: String,
        enum: ['DRIVER', 'PASSENGER'],
        default: 'PASSENGER',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    pickupLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
        addressDetail: String,
    },
});

module.exports = mongoose.model('User', UserSchema);
