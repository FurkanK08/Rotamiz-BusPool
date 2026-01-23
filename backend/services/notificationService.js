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

            // 2. Fetch User to get Push Token and Preferences
            const user = await User.findById(userId);
            if (!user) {
                console.error(`[NotificationService.send] ERROR - User not found: ${userId}`);
                throw new Error(`User not found: ${userId}`);
            }

            console.log(`[NotificationService.send] User found: ${user._id} (${user.name})`);

            // 2.5 Check Preferences
            const shouldSend = NotificationService.checkPreference(user, type);
            if (!shouldSend) {
                console.log(`[NotificationService.send] 🚫 Blocked by user preference. Type: ${type}, User: ${user._id}`);
                // We return null or a specific object to indicate it was blocked, 
                // but strictly speaking we shouldn't even save it to DB if the user doesn't want it,
                // OR we save it as "read" silently? 
                // Best practice: Usually just don't send/save if it's a "opt-out" marketing thing.
                // But for "Service Started", the user might want to see it in history even if no push.
                // Let's decide: If blocked by preference, DO NOT SEND PUSH, but SAVE TO DB?
                // Or DO NOT SAVE at all? 
                // The prompt implies "Preference Logic" -> usually means "Don't disturb me via Push". 
                // But often users still want to see it in the "Notification Center".
                // However, if I turn off "Promotional", I probably don't want them in my list either.
                // Let's go with: SAVE to DB always, but ONLY PUSH if preference allows?
                // Wait, if I disable "Service Start" push, I might still want to know it happened if I open the app.
                // Let's split logic: Always Save, Conditionally Push.
                // UNLESS it's promotional, maybe?
                // Let's stick to: Always Save to DB (so history exists), but Skip Push.
            }

            // 3. Save Notification to Database FIRST for reliability
            const notification = new Notification({
                userId: user._id,
                title,
                body,
                type,
                data
            });

            await notification.save();
            console.log(`[NotificationService.send] ✅ Notification saved to DB: ${notification._id}`);

            // 4. Send Push Notification (If allowed)
            if (shouldSend) {
                if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
                    console.log(`[NotificationService.send] Sending push to token: ${user.pushToken.substring(0, 20)}...`);

                    const messages = [{
                        to: user.pushToken,
                        sound: 'default',
                        title: title,
                        body: body,
                        data: { ...data, notificationId: notification._id.toString(), type },
                        priority: 'high',
                        channelId: 'default', // TODO: Implement Channels in next step
                        _displayInForeground: true
                    }];

                    try {
                        const chunks = expo.chunkPushNotifications(messages);
                        for (const chunk of chunks) {
                            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                            console.log(`[NotificationService.send] Push sent successfully:`, ticketChunk);
                        }
                    } catch (pushError) {
                        console.error(`[NotificationService.send] Push notification failed (non-critical):`, pushError);
                    }
                } else {
                    console.log(`[NotificationService.send] No valid push token for user ${userId} - saved to DB only`);
                }
            } else {
                console.log(`[NotificationService.send] 🔕 Push suppressed by user preference`);
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

    /**
     * Check if user wants to receive this type of notification
     * @param {User} user - User document
     * @param {string} type - Notification Type
     * @returns {boolean}
     */
    static checkPreference(user, type) {
        if (!user.notificationPreferences) return true; // Default to true if no prefs

        const prefs = user.notificationPreferences;

        switch (type) {
            case 'DRIVER_LOCATION_STARTED':
                return prefs.serviceStart ?? true;
            case 'PASSENGER_LOCATION_SHARED':
                return prefs.locationRequest ?? true; // Mapping this to locationRequest for now
            case 'PASSENGER_ABSENCE_REQUEST':
                return prefs.attendanceRequest ?? true;
            case 'INFO':
                // Check if it's a "User Response" info (special case)
                // If the system sends simple INFO messages, we might want to categorize them better.
                // For now, let's assume INFO is generic/important unless it's explicitly promotional.
                return true;
            case 'ALERT':
                return true; // Urgent alerts always go through
            default:
                return true;
        }
    }
}

module.exports = NotificationService;
