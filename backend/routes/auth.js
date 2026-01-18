const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

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
// @desc    Update user profile (Name, Role)
// @access  Public (Should be protected in Prod)
router.put('/profile', async (req, res) => {
    const { userId, name, role } = req.body;

    try {
        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (name) user.name = name;
        if (role) user.role = role;

        await user.save();

        res.json({
            msg: 'Profile updated',
            user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
