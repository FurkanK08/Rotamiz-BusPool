const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// @route   PUT api/users/:id/location
// @desc    Update user pickup location
// @access  Private
router.put('/:id/location', authMiddleware, async (req, res) => {
    try {
        const { latitude, longitude, address, addressDetail } = req.body;

        // Simple validation
        if (!latitude || !longitude) {
            return res.status(400).json({ msg: 'Latitude and Longitude are required' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.pickupLocation = { latitude, longitude, address, addressDetail };
        await user.save();

        res.json({ msg: 'Location updated', location: user.pickupLocation });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update user push token
router.post('/push-token', async (req, res) => {
    const { userId, pushToken } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { pushToken });
        res.status(200).json({ message: 'Push token updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating push token', error });
    }
});

// @route   GET api/users/:id
// @desc    Get user profile
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-__v');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id/notification-preferences
// @desc    Update notification preferences
// @access  Private
router.put('/:id/notification-preferences', async (req, res) => {
    try {
        const { notificationPreferences } = req.body;
        console.log(`[PUT /users/:id/notification-preferences] Updating for user: ${req.params.id}`);

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Merge with existing preferences to avoid overwriting unset fields
        user.notificationPreferences = {
            ...user.notificationPreferences,
            ...notificationPreferences
        };
        await user.save();

        console.log(`[PUT /users/:id/notification-preferences] Updated:`, user.notificationPreferences);
        res.json({
            msg: 'Notification preferences updated',
            notificationPreferences: user.notificationPreferences
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
