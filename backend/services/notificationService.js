const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const User = require('../models/User');

const expo = new Expo();

class NotificationService {
    /**
     * Send a notification to a user and save it to the database.
     * PRODUCTION-READY with proper error handling and logging
     * 
     * @param {string|ObjectId} userId - The recipient's User ID (can be string or ObjectId)
     * @param {string} title - Notification title
     * @param {string} body - Notification body text
     * @param {string} type - Notification type from enum
     * @param {object} data - Custom data payload
     * @returns {Promise<Notification>} Created notification document
     */
    static async send(userId, title, body, type = 'INFO', data = {}) {
        try {
            console.log(`[NotificationService.send] START - userId: ${userId}, type: ${type}`);

            // 1. Validate inputs
            if (!userId || !title || !body) {
                throw new Error('Missing required parameters: userId, title, or body');
            }

            // 2. Fetch User to get Push Token and ensure user exists
            const user = await User.findById(userId);
            if (!user) {
                console.error(`[NotificationService.send] ERROR - User not found: ${userId}`);
                throw new Error(`User not found: ${userId}`);
            }

            console.log(`[NotificationService.send] User found: ${user._id} (${user.name})`);

            // 3. Save Notification to Database FIRST for reliability
            // CRITICAL: Use user._id (ObjectId) for consistency
            const notification = new Notification({
                userId: user._id, // Always use ObjectId from user document
                title,
                body,
                type,
                data
            });

            await notification.save();
            console.log(`[NotificationService.send] ✅ Notification saved to DB: ${notification._id}`);
            console.log(`[NotificationService.send]    - Title: "${title}"`);
            console.log(`[NotificationService.send]    - UserId: ${notification.userId}`);
            console.log(`[NotificationService.send]    - Type: ${notification.type}`);

            // 4. Send Push Notification (NON-BLOCKING - failures won't affect DB save)
            if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
                console.log(`[NotificationService.send] Sending push to token: ${user.pushToken.substring(0, 20)}...`);

                const messages = [{
                    to: user.pushToken,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: { ...data, notificationId: notification._id.toString(), type },
                    priority: 'high',
                    channelId: 'default',
                    _displayInForeground: true
                }];

                try {
                    const chunks = expo.chunkPushNotifications(messages);
                    for (const chunk of chunks) {
                        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                        console.log(`[NotificationService.send] Push sent successfully:`, ticketChunk);
                    }
                } catch (pushError) {
                    // Log push error but don't throw - notification is already saved
                    console.error(`[NotificationService.send] Push notification failed (non-critical):`, pushError);
                }
            } else {
                console.log(`[NotificationService.send] No valid push token for user ${userId} - saved to DB only`);
            }

            console.log(`[NotificationService.send] ✅ COMPLETE`);
            return notification;

        } catch (error) {
            console.error(`[NotificationService.send] ❌ FATAL ERROR:`, error);
            throw error; // Re-throw for caller to handle
        }
    }

    /**
     * Get notifications for a user
     * FIXED: Properly handles both string and ObjectId userId
     * 
     * @param {string|ObjectId} userId - User ID (MongoDB will handle type conversion)
     * @param {number} limit - Maximum number of notifications to return
     * @returns {Promise<Notification[]>} Array of notification documents
     */
    static async getUserNotifications(userId, limit = 50) {
        try {
            console.log(`[NotificationService.getUserNotifications] userId: ${userId}, limit: ${limit}`);

            // MongoDB's findById and find queries handle string<->ObjectId conversion automatically
            // We just need to pass userId as-is
            const notifications = await Notification.find({ userId: userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(); // .lean() for better performance - returns plain JS objects

            console.log(`[NotificationService.getUserNotifications] Found ${notifications.length} notifications`);

            if (notifications.length > 0) {
                console.log(`[NotificationService.getUserNotifications] Sample:`, {
                    id: notifications[0]._id,
                    userId: notifications[0].userId,
                    title: notifications[0].title,
                    type: notifications[0].type
                });
            }

            return notifications;
        } catch (error) {
            console.error(`[NotificationService.getUserNotifications] ERROR:`, error);
            throw error;
        }
    }

    /**
     * Mark a notification as read
     */
    static async markAsRead(notificationId) {
        try {
            console.log(`[NotificationService.markAsRead] notificationId: ${notificationId}`);

            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { isRead: true },
                { new: true }
            );

            if (!notification) {
                throw new Error(`Notification not found: ${notificationId}`);
            }

            console.log(`[NotificationService.markAsRead] ✅ Marked as read`);
            return notification;
        } catch (error) {
            console.error(`[NotificationService.markAsRead] ERROR:`, error);
            throw error;
        }
    }

    /**
     * Handle user response to an interactive notification
     */
    static async respondToNotification(notificationId, responseValue) {
        try {
            console.log(`[NotificationService.respondToNotification] ID: ${notificationId}, response: ${responseValue}`);

            const notification = await Notification.findById(notificationId);
            if (!notification) {
                throw new Error(`Notification not found: ${notificationId}`);
            }

            notification.response = responseValue;
            notification.isRead = true;
            await notification.save();

            console.log(`[NotificationService.respondToNotification] ✅ Response saved`);
            return notification;
        } catch (error) {
            console.error(`[NotificationService.respondToNotification] ERROR:`, error);
            throw error;
        }
    }

    /**
     * Delete a notification
     */
    static async deleteNotification(notificationId) {
        try {
            console.log(`[NotificationService.deleteNotification] notificationId: ${notificationId}`);

            const result = await Notification.findByIdAndDelete(notificationId);

            if (!result) {
                throw new Error(`Notification not found: ${notificationId}`);
            }

            console.log(`[NotificationService.deleteNotification] ✅ Deleted`);
            return result;
        } catch (error) {
            console.error(`[NotificationService.deleteNotification] ERROR:`, error);
            throw error;
        }
    }
}

module.exports = NotificationService;
