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
    attendance: [{
        date: String, // YYYY-MM-DD
        passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['BINDI', 'BINMEDI', 'BEKLIYOR', 'GELMEYECEK'], default: 'BEKLIYOR' }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Add virtual field for 'id' to match frontend expectations
ServiceSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Ensure virtuals are included when converting to JSON
ServiceSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('Service', ServiceSchema);
