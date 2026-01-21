const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const User = require('../models/User');

const expo = new Expo();

class NotificationService {
    /**
     * Send a notification to a user and save it to the database.
     * @param {string} userId - The recipient's User ID.
     * @param {string} title - Notification title.
     * @param {string} body - Notification body text.
     * @param {string} type - 'INFO', 'ALERT', or 'INTERACTIVE'.
     * @param {object} data - Custom data payload (e.g., actionUrl, serviceId).
     */
    static async send(userId, title, body, type = 'INFO', data = {}) {
        try {
            // 1. Fetch User to get Push Token
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // 2. Save Notification to Database (History)
            const notification = new Notification({
                userId,
                title,
                body,
                type,
                data
            });
            await notification.save();

            // 3. Send Push Notification (if token exists)
            if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
                const messages = [{
                    to: user.pushToken,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: { ...data, notificationId: notification._id, type },
                    priority: 'high',
                    channelId: 'default',
                    _displayInForeground: true // Ensure it shows even if app is open
                }];

                const chunks = expo.chunkPushNotifications(messages);
                for (const chunk of chunks) {
                    try {
                        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                        console.log('Push tickets:', ticketChunk);
                    } catch (error) {
                        console.error('Error sending push chunk:', error);
                    }
                }
            } else {
                console.log(`User ${userId} has no valid push token. Saved to DB only.`);
            }

            return notification;
        } catch (error) {
            console.error('NotificationService Error:', error);
            throw error;
        }
    }

    /**
     * Get notifications for a user.
     */
    static async getUserNotifications(userId, limit = 20) {
        return await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    /**
     * Mark a notification as read.
     */
    static async markAsRead(notificationId) {
        return await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );
    }
}

module.exports = NotificationService;
