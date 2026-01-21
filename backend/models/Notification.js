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
        enum: ['INFO', 'ALERT', 'INTERACTIVE'],
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
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);
