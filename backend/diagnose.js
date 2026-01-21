const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Service = require('./models/Service');
const fs = require('fs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

async function diagnose() {
    let output = [];
    const log = (msg) => {
        console.log(msg);
        output.push(msg);
    };

    try {
        await mongoose.connect(MONGO_URI);
        log('Connected to MongoDB');
        log('');

        // 1. Count notifications
        const notifCount = await Notification.countDocuments();
        log('NOTIFICATIONS: ' + notifCount);

        if (notifCount > 0) {
            const recent = await Notification.find().sort({ createdAt: -1 }).limit(5).lean();
            recent.forEach((n, i) => {
                log('  ' + (i + 1) + '. Title: ' + n.title);
                log('     UserId: ' + n.userId);
                log('     Type: ' + n.type);
                log('     Created: ' + n.createdAt);
            });
        }

        // 2. List users
        log('');
        log('USERS:');
        const users = await User.find().select('_id name role phoneNumber').lean();
        users.forEach((u, i) => {
            log('  ' + (i + 1) + '. ' + (u.name || 'No name') + ' (' + u.role + ') - ID: ' + u._id);
        });

        // 3. List services with passengers
        log('');
        log('SERVICES:');
        const services = await Service.find().select('_id name active passengers driver').lean();
        services.forEach((s, i) => {
            log('  ' + (i + 1) + '. ' + s.name + ' - Active: ' + s.active);
            log('     Driver: ' + s.driver);
            log('     Passengers count: ' + (s.passengers ? s.passengers.length : 0));
            if (s.passengers && s.passengers.length > 0) {
                s.passengers.forEach((p, j) => {
                    log('       Passenger ' + (j + 1) + ': ' + p);
                });
            }
        });

        // 4. Test notification creation
        log('');
        log('TESTING NOTIFICATION CREATION:');
        const testUser = users.length > 0 ? users[0] : null;

        if (testUser) {
            log('  Creating for user: ' + testUser._id);

            const testNotif = new Notification({
                userId: testUser._id,
                title: 'Diagnostic Test ' + Date.now(),
                body: 'Diagnostic notification',
                type: 'INFO',
                data: { test: true }
            });

            await testNotif.save();
            log('  Notification saved: ' + testNotif._id);

            // Verify retrieval
            const retrieved = await Notification.find({ userId: testUser._id }).lean();
            log('  Retrieved count for this user: ' + retrieved.length);
        }

        log('');
        log('DIAGNOSIS COMPLETE');

        // Write to file
        fs.writeFileSync('diagnosis_result.txt', output.join('\n'), 'utf8');
        log('Results saved to diagnosis_result.txt');

    } catch (error) {
        log('ERROR: ' + error.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

diagnose();
