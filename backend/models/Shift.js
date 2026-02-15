const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: Date,
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
        default: 'ACTIVE'
    },
    metrics: {
        distanceKm: { type: Number, default: 0 },
        durationMin: { type: Number, default: 0 },
        passengerCount: { type: Number, default: 0 }
    },
    routePolyline: String // Store the actual path taken if needed
}, {
    timestamps: true
});

module.exports = mongoose.model('Shift', ShiftSchema);
