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
        enum: ['passenger', 'driver', 'admin'],
        default: 'passenger'
    },
    pushToken: {
        type: String,
        default: null
    },
    notificationPreferences: {
        allowPromotions: { type: Boolean, default: true },
        allowUpdates: { type: Boolean, default: true },
        allowServiceAlerts: { type: Boolean, default: true }
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
