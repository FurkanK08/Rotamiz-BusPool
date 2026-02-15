const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    plate: {
        type: String,
        required: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    destination: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    code: {
        type: String,
        unique: true,
        required: true,
    },
    schedules: [String],
    active: {
        type: Boolean,
        default: false,
    },
    passengers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // Attendance is now in a separate collection 'Attendance'
    // This improves scalability and performance
}, {
    timestamps: true  // Adds createdAt + updatedAt automatically
});

// Add virtual field for 'id' to match frontend expectations
ServiceSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Ensure virtuals are included when converting to JSON
ServiceSchema.set('toJSON', {
    virtuals: true
});

// Database indexes for query performance
ServiceSchema.index({ driver: 1 });
ServiceSchema.index({ passengers: 1 });
ServiceSchema.index({ 'attendance.date': 1, 'attendance.passengerId': 1 });

module.exports = mongoose.model('Service', ServiceSchema);
