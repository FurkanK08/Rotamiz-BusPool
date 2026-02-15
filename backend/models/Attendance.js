const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
        index: true
    },
    passengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['BINDI', 'BINMEDI', 'BEKLIYOR', 'GELMEYECEK'],
        default: 'BEKLIYOR'
    },
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    note: String
}, {
    timestamps: true
});

// Composite index for efficient querying of a passenger's attendance for a specific service and date
AttendanceSchema.index({ serviceId: 1, date: 1, passengerId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
