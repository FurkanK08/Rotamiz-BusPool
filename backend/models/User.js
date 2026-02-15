const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^\d{10,15}$/.test(v);
            },
            message: props => `${props.value} geçerli bir telefon numarası değil!`
        }
    },
    name: {
        type: String,
        required: false,
        trim: true,
        maxlength: 100,
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
        serviceStart: { type: Boolean, default: true },
        serviceEnd: { type: Boolean, default: true },
        attendanceRequest: { type: Boolean, default: true },
        locationRequest: { type: Boolean, default: true },
        passengerResponse: { type: Boolean, default: true },
        promotional: { type: Boolean, default: false }
    },
    // Multi-device support
    pushTokens: [{
        token: String,
        deviceType: { type: String, enum: ['ANDROID', 'IOS', 'WEB'], default: 'ANDROID' },
        lastUsedAt: Date
    }],
    // Soft Delete & Status
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    pickupLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
        addressDetail: String,
    },
}, {
    timestamps: true  // Adds createdAt + updatedAt automatically
});

module.exports = mongoose.model('User', UserSchema);
