const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Shift = require('../models/Shift');
const AuditLog = require('../models/AuditLog');
const NotificationService = require('../services/notificationService');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, requireServiceOwner } = require('../middleware/rbac');

// ... (other requires)

// ...

// @route   POST api/services/create
// @desc    Create a new service route
// @access  Private (Driver only)
router.post('/create', authMiddleware, requireRole('DRIVER'), async (req, res) => {
    // K3 FIX: driverId comes from JWT, not from body
    const driverId = req.user.id;
    const { name, plate, schedules, destination } = req.body;

    if (!name || !plate) {
        return res.status(400).json({ msg: 'Lütfen tüm alanları doldurun' });
    }

    try {
        // Generate a 4-digit unique code
        // Simple logic for MVP: Random 1000-9999
        let code;
        let isUnique = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 100;
        while (!isUnique) {
            if (attempts >= MAX_ATTEMPTS) {
                return res.status(500).json({ msg: 'Benzersiz servis kodu oluşturulamadı. Lütfen tekrar deneyin.' });
            }
            code = Math.floor(1000 + Math.random() * 9000).toString();
            const existing = await Service.findOne({ code });
            if (!existing) isUnique = true;
            attempts++;
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

        // SEC1 FIX: Audit Log
        await AuditLog.create({
            userId: driverId,
            action: 'CREATE_SERVICE',
            targetCollection: 'Service',
            targetId: service._id,
            details: { name, plate, code },
            ipAddress: req.ip
        });

        res.status(201).json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/driver/:driverId
// @desc    Get all services for a driver
// @access  Private
router.get('/driver/:driverId', authMiddleware, async (req, res) => {
    try {
        const services = await Service.find({ driver: req.params.driverId })
            .populate('passengers', 'name phoneNumber pickupLocation');
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/:id
// @desc    Get a single service by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id)
            .populate('passengers', 'name phoneNumber pickupLocation');
        if (!service) {
            return res.status(404).json({ msg: 'Servis bulunamadı' });
        }
        res.json(service);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Servis bulunamadı' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/join
// @desc    Join a service via code
// @access  Private (Passenger)
router.post('/join', authMiddleware, async (req, res) => {
    const { passengerId, code, pickupLocation } = req.body;

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

        // Save pickup location to user profile if provided
        if (pickupLocation && pickupLocation.latitude && pickupLocation.longitude) {
            await User.findByIdAndUpdate(
                passengerId,
                { pickupLocation },
                { new: true }
            );
            console.log(`Pickup location saved for user ${passengerId}:`, pickupLocation);
        }

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
router.get('/passenger/:passengerId', authMiddleware, async (req, res) => {
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
router.put('/:id', authMiddleware, requireServiceOwner, async (req, res) => {
    const { name, plate, schedules, active } = req.body;

    console.log(`[PUT /services/:id] Request body:`, req.body);
    console.log(`[PUT /services/:id] Active param:`, active, `Type:`, typeof active);

    try {
        let service = req.service; // Already fetched by requireServiceOwner middleware

        // Ownership already verified by requireServiceOwner

        service.name = name || service.name;
        service.plate = plate || service.plate;
        service.schedules = schedules || service.schedules;

        // Check if service is becoming active (Trip Started)
        if (typeof active !== 'undefined') {
            const wasActive = service.active;
            service.active = active;

            // Trigger notification only if starting (active becomes true)
            const isActiveBool = active === true || active === 'true';

            if (isActiveBool && !wasActive) {
                // TRIP STARTED
                // DB3 FIX: Create Shift record
                await Shift.create({
                    serviceId: service._id,
                    driverId: service.driver,
                    startTime: new Date(),
                    status: 'ACTIVE'
                });

                if (service.passengers && service.passengers.length > 0) {
                    service.passengers.forEach(passengerId => {
                        NotificationService.send(
                            passengerId,
                            'Servis Başladı! 🚌',
                            `${service.name} servisi yola çıktı. Canlı takip için dokunun.`,
                            'DRIVER_LOCATION_STARTED',
                            { serviceId: service._id, driverId: service.driver }
                        ).catch(e => console.error(`Failed to notify ${passengerId}:`, e));
                    });
                }
            } else if (!isActiveBool && wasActive) {
                // TRIP ENDED
                // DB3 FIX: Close open Shift record
                await Shift.findOneAndUpdate(
                    { serviceId: service._id, status: 'ACTIVE' },
                    {
                        endTime: new Date(),
                        status: 'COMPLETED'
                    }
                );
            }
        }

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
router.delete('/:id', authMiddleware, requireServiceOwner, async (req, res) => {
    try {
        let service = await Service.findById(req.params.id)
            .populate('passengers', 'name');

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // M8 FIX: Notify passengers before deletion
        if (service.passengers && service.passengers.length > 0) {
            service.passengers.forEach(passenger => {
                NotificationService.send(
                    passenger._id || passenger,
                    'Servis Silindi ⚠️',
                    `${service.name} servisi sürücü tarafından silindi.`,
                    'SERVICE_DELETED',
                    { serviceId: service._id }
                ).catch(e => console.error('Delete notif error:', e));
            });
        }

        await Service.findByIdAndDelete(req.params.id);

        // SEC1 FIX: Audit Log
        await AuditLog.create({
            userId: req.user.id,
            action: 'DELETE_SERVICE',
            targetCollection: 'Service',
            targetId: req.params.id,
            details: { name: service.name },
            ipAddress: req.ip
        });

        res.json({ msg: 'Service removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/remove-passenger
// @desc    Remove a passenger from a service
// @access  Private (Driver only)
router.post('/remove-passenger', authMiddleware, requireServiceOwner, async (req, res) => {
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
router.post('/add-passenger', authMiddleware, requireServiceOwner, async (req, res) => {
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
// @desc    Update passenger attendance (Upsert: Create or Update)
// @access  Private
router.post('/attendance', authMiddleware, async (req, res) => {
    try {
        const { serviceId, passengerId, status, date, location, note } = req.body;

        // DB1 FIX: Use Attendance collection
        const attendance = await Attendance.findOneAndUpdate(
            { serviceId, passengerId, date },
            { status, location, note },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Notify Passenger if marked as BINMEDI
        if (status === 'BINMEDI') {
            NotificationService.send(
                passengerId,
                'Yoklama Bildirimi ⚠️',
                'Sürücü sizi "Gelmeyecek/Bindi" olarak işaretledi. Bir sorun mu var?',
                'INTERACTIVE',
                { serviceId, status, question: 'Servise gelecek misiniz?' }
            ).catch(e => console.error('Attendance Notif Error:', e));
        }

        res.json(attendance);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/:id/attendance
// @desc    Get attendance records for a service on a specific date
// @access  Private
router.get('/:id/attendance', authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ msg: 'Date parameter is required' });

        const records = await Attendance.find({
            serviceId: req.params.id,
            date: new Date(date)
        });
        res.json(records);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/attendance/reset
// @desc    Reset attendance for a service and date (Delete records)
// @access  Private
router.post('/attendance/reset', authMiddleware, async (req, res) => {
    try {
        const { serviceId, date } = req.body;

        // DB1 FIX: Delete from Attendance collection
        await Attendance.deleteMany({ serviceId, date });

        res.json({ msg: 'Attendance reset successful' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/attendance/future
// @desc    Set attendance for multiple future dates
// @access  Private
router.post('/attendance/future', authMiddleware, async (req, res) => {
    try {
        const { serviceId, passengerId, dates, status } = req.body; // dates: YYYY-MM-DD string array

        if (!Array.isArray(dates)) {
            return res.status(400).json({ msg: 'Dates must be an array' });
        }

        // Parallel execution for performance
        await Promise.all(dates.map(date =>
            Attendance.findOneAndUpdate(
                { serviceId, passengerId, date },
                { status },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        ));

        res.json({ msg: 'Future attendance updated' });
    } catch (err) {
        console.error('Future Attendance Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/services/attendance/cleanup
// @desc    Remove old attendance records
// @access  Private
router.post('/attendance/cleanup', authMiddleware, async (req, res) => {
    try {
        const { serviceId } = req.body;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await Attendance.deleteMany({
            serviceId,
            date: { $lt: thirtyDaysAgo }
        });

        res.json({ msg: `${result.deletedCount} eski yoklama kaydı temizlendi` });
    } catch (err) {
        console.error('Attendance Cleanup Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/services/leave
// @desc    Passenger leaves a service voluntarily
// @access  Private (Passenger only)
router.post('/leave', authMiddleware, async (req, res) => {
    const { serviceId } = req.body;
    const passengerId = req.user.id;

    try {
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // Check if user is actually a passenger in this service
        const isPassenger = service.passengers.some(p => p.toString() === passengerId);
        if (!isPassenger) {
            return res.status(400).json({ msg: 'Bu serviste kayıtlı değilsiniz' });
        }

        service.passengers = service.passengers.filter(p => p.toString() !== passengerId);

        // Also remove attendance records for this passenger (Future only)
        // DB1 FIX: Use Attendance collection
        await Attendance.deleteMany({
            serviceId,
            passengerId,
            date: { $gte: new Date().toISOString().split('T')[0] }
        });

        await service.save();

        // Audit Log
        await AuditLog.create({
            userId: passengerId,
            action: 'LEAVE_SERVICE',
            targetCollection: 'Service',
            targetId: serviceId,
            ipAddress: req.ip
        });

        // Notify driver
        NotificationService.send(
            service.driver,
            'Yolcu Ayrıldı 👋',
            'Bir yolcu servisinizden ayrıldı.',
            'PASSENGER_LEFT',
            { serviceId: service._id, passengerId }
        ).catch(e => console.error('Leave notif error:', e));

        res.json({ msg: 'Servisten ayrıldınız' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
