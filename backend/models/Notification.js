const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'INFO',
            'ALERT',
            'INTERACTIVE',
            'DRIVER_LOCATION_STARTED',
            'PASSENGER_LOCATION_SHARED',
            'PASSENGER_ABSENCE_REQUEST'
        ],
        default: 'INFO'
    },
    data: {
        type: Object, // Stores serviceId, actionUrl, etc.
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    },
    response: {
        type: String, // e.g., 'YES', 'NO', 'LATE', 'VIEW_MAP'
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days
    }
});

// Indexes for performance (MongoDB best practice)
// Compound index for userId + createdAt (ESR - Equality, Sort, Range pattern)
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Single index on userId for faster lookups
NotificationSchema.index({ userId: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
