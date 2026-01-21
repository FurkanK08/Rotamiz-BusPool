const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected for Test');

        // Create a dummy notification to force collection creation
        try {
            // Find a user first
            const user = await User.findOne();
            if (!user) {
                console.log('No users found to attach notification to.');
                process.exit(0);
            }

            const notif = new Notification({
                userId: user._id,
                title: 'Test Bildirimi 🧪',
                body: 'Veritabanı tablosunu oluşturmak için test bildirimi.',
                type: 'INFO'
            });

            await notif.save();
            console.log('✅ Test Notification Saved! Collection "notifications" should now exist.');
        } catch (e) {
            console.error('Error creating test notification:', e);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.log('❌ MongoDB Connection Error:', err));
