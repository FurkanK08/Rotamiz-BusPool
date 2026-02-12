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
        enum: ['PASSENGER', 'DRIVER', 'ADMIN'],
        default: 'PASSENGER'
    },
    pushToken: {
        type: String,
        default: null
    },
    notificationPreferences: {
        serviceStart: { type: Boolean, default: true },      // Servis başladı bildirimi
        serviceEnd: { type: Boolean, default: true },        // Servis bitti bildirimi
        attendanceRequest: { type: Boolean, default: true }, // Yoklama bildirimi
        locationRequest: { type: Boolean, default: true },   // Konum isteği bildirimi
        passengerResponse: { type: Boolean, default: true }, // Yolcu yanıtı (sürücü için)
        promotional: { type: Boolean, default: false }       // Promosyon/duyuru
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
