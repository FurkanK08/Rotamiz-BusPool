const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/auth');

// @route   POST api/auth/login
// @desc    Login or Register user by phone number
// @access  Public
router.post('/login', async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ msg: 'Please provide phone number' });
    }

    try {
        let user = await User.findOne({ phoneNumber });

        if (!user) {
            // Create new user if not exists
            user = new User({
                phoneNumber,
                role: 'PASSENGER' // Default role
            });
            await user.save();

            const token = generateToken(user._id, user.role);

            return res.status(201).json({
                msg: 'User registered',
                user,
                token
            });
        }

        // User exists, generate token
        const token = generateToken(user._id, user.role);

        res.json({
            msg: 'User logged in',
            user,
            token
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/profile
// @desc    Update user profile (Name, Role - first time setup only)
// @access  Private (authenticated user can update OWN profile only)
router.put('/profile', authMiddleware, async (req, res) => {
    // K2 FIX: userId comes from JWT, not from body
    const { name, role } = req.body;
    const userId = req.user.id;

    try {
        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (name) user.name = name;

        // K2 FIX: Role can only be set during initial profile setup (when no role is set yet)
        // This prevents role escalation (e.g. PASSENGER -> ADMIN)
        if (role && (!user.role || user.role === 'PASSENGER')) {
            const allowedRoles = ['PASSENGER', 'DRIVER'];
            if (allowedRoles.includes(role)) {
                user.role = role;
            }
        }

        await user.save();

        // Update token with new role
        const newToken = generateToken(user._id, user.role);

        res.json({
            msg: 'Profile updated',
            user,
            token: newToken
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
