const mongoose = require('mongoose');
const NotificationService = require('./services/notificationService');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

// Test script to verify notification creation and retrieval
async function testNotificationFlow() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Find first user
        const user = await User.findOne();
        if (!user) {
            console.log('❌ No users found');
            process.exit(1);
        }

        console.log(`\n🔍 Testing with user: ${user._id} (${user.name})`);

        // 1. Create notification
        console.log('\n📝 Step 1: Creating notification...');
        const notification = await NotificationService.send(
            user._id,
            'Test Notification',
            'This is a test notification',
            'DRIVER_LOCATION_STARTED',
            { test: true }
        );
        console.log('✅ Notification created:', notification._id);

        // 2. Retrieve notifications
        console.log('\n📥 Step 2: Retrieving notifications...');
        const notifications = await NotificationService.getUserNotifications(user._id);
        console.log(`✅ Found ${notifications.length} notifications`);

        if (notifications.length > 0) {
            console.log('\n📋 Sample notification:');
            console.log('  ID:', notifications[0]._id);
            console.log('  UserID:', notifications[0].userId);
            console.log('  Title:', notifications[0].title);
            console.log('  Type:', notifications[0].type);
        }

        // 3. Test with string userId (as frontend sends)
        console.log('\n📥 Step 3: Testing with string userId...');
        const userIdString = user._id.toString();
        const notificationsFromString = await NotificationService.getUserNotifications(userIdString);
        console.log(`✅ Found ${notificationsFromString.length} notifications using string userId`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Test complete');
    }
}

testNotificationFlow();
