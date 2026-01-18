const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// ... (other requires)

// ...

// @route   POST api/services/create
// @desc    Create a new service route
// @access  Private (Driver only)
router.post('/create', async (req, res) => {
    const { driverId, name, plate, schedules, destination } = req.body;

    if (!driverId || !name || !plate) {
        return res.status(400).json({ msg: 'Please provide all fields' });
    }

    try {
        // Generate a 4-digit unique code
        // Simple logic for MVP: Random 1000-9999
        let code;
        let isUnique = false;
        while (!isUnique) {
            code = Math.floor(1000 + Math.random() * 9000).toString();
            const existing = await Service.findOne({ code });
            if (!existing) isUnique = true;
        }

        const service = new Service({
            driver: driverId,
            name,
            plate,
            code,
            schedules,
            destination // Add destination support
        });

        await service.save();
        res.status(201).json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/driver/:driverId
// @desc    Get all services for a driver
// @access  Private
router.get('/driver/:driverId', async (req, res) => {
    try {
        const services = await Service.find({ driver: req.params.driverId })
            .populate('passengers', 'name phoneNumber pickupLocation');
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/join
// @desc    Join a service via code
// @access  Private (Passenger)
router.post('/join', async (req, res) => {
    const { passengerId, code } = req.body;

    if (!passengerId || !code) {
        return res.status(400).json({ msg: 'Please provide valid data' });
    }

    try {
        const service = await Service.findOne({ code });

        if (!service) {
            return res.status(404).json({ msg: 'Service not found or invalid code' });
        }

        // Check if already joined
        if (service.passengers.includes(passengerId)) {
            return res.status(400).json({ msg: 'You are already in this service' });
        }

        service.passengers.push(passengerId);
        await service.save();

        // Fetch fresh service with populated passengers
        const updatedService = await Service.findById(service._id)
            .populate('passengers', 'name phoneNumber');

        res.json(updatedService);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/passenger/:passengerId
// @desc    Get ALL services for a passenger
// @access  Private
router.get('/passenger/:passengerId', async (req, res) => {
    try {
        // Find ALL services where passengers array contains the ID
        const services = await Service.find({ passengers: req.params.passengerId })
            .populate('passengers', 'name phoneNumber')
            .populate('driver', 'name phoneNumber');
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/:id
// @desc    Update a service
// @access  Private (Driver only)
router.put('/:id', async (req, res) => {
    const { name, plate, schedules, active } = req.body;

    try {
        let service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        service.name = name || service.name;
        service.plate = plate || service.plate;
        service.schedules = schedules || service.schedules;
        if (typeof active !== 'undefined') service.active = active;

        await service.save();
        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/services/:id
// @desc    Delete a service
// @access  Private (Driver only)
router.delete('/:id', async (req, res) => {
    try {
        let service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        await Service.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Service removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/remove-passenger
// @desc    Remove a passenger from a service
// @access  Private (Driver only)
router.post('/remove-passenger', async (req, res) => {
    const { serviceId, passengerId } = req.body;

    try {
        const service = await Service.findById(serviceId);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // Filter out the passenger
        service.passengers = service.passengers.filter(
            (p) => p.toString() !== passengerId
        );

        await service.save();
        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/add-passenger
// @desc    Add a passenger to a service manually by phone number
// @access  Private (Driver only)
router.post('/add-passenger', async (req, res) => {
    const { serviceId, phoneNumber } = req.body;

    if (!serviceId || !phoneNumber) {
        return res.status(400).json({ msg: 'Please provide service ID and phone number' });
    }

    try {
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(404).json({ msg: 'User not registered with this phone number' });
        }

        // Check if already joined
        if (service.passengers.includes(user._id)) {
            return res.status(400).json({ msg: 'Passenger is already in this service' });
        }

        service.passengers.push(user._id);
        await service.save();

        // Return updated service with populated passengers
        const updatedService = await Service.findById(serviceId)
            .populate('passengers', 'name phoneNumber');

        res.json(updatedService);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/attendance
// @desc    Update passenger attendance status (BINDI, BINMEDI, etc.)
// @access  Private
router.post('/attendance', authMiddleware, async (req, res) => {
    try {
        const { serviceId, passengerId, status, date } = req.body;
        const service = await Service.findById(serviceId);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // Check if attendance record already exists for this date and passenger
        const existingRecordIndex = service.attendance.findIndex(
            r => r.date === date && r.passengerId.toString() === passengerId
        );

        if (existingRecordIndex !== -1) {
            // Update existing
            service.attendance[existingRecordIndex].status = status;
        } else {
            // Add new
            service.attendance.push({ date, passengerId, status });
        }

        await service.save();
        res.json(service.attendance);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/attendance/reset
// @desc    Reset attendance for a specific service and date
// @access  Private
router.post('/attendance/reset', authMiddleware, async (req, res) => {
    try {
        const { serviceId, date } = req.body;
        const service = await Service.findById(serviceId);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // Filter out attendance records for the given date (effectively resetting them)
        service.attendance = service.attendance.filter(r => r.date !== date);

        await service.save();
        res.json(service.attendance);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/attendance/future
// @desc    Set attendance for multiple future dates (e.g. absent)
// @access  Private
router.post('/attendance/future', authMiddleware, async (req, res) => {
    try {
        const { serviceId, passengerId, dates, status } = req.body; // dates: string[] YYYY-MM-DD

        if (!Array.isArray(dates)) {
            return res.status(400).json({ msg: 'Dates must be an array' });
        }

        const service = await Service.findById(serviceId);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        dates.forEach(date => {
            // Remove existing record for this date if any
            const existingIndex = service.attendance.findIndex(
                r => r.date === date && r.passengerId.toString() === passengerId
            );

            if (existingIndex !== -1) {
                service.attendance[existingIndex].status = status;
            } else {
                service.attendance.push({ date, passengerId, status });
            }
        });

        await service.save();
        res.json(service.attendance);
    } catch (err) {
        console.error('Future Attendance Error:', err.message);
        res.status(500).json({ msg: 'Server Error' }); // Ensure JSON response
    }
});

module.exports = router;
