const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authMiddleware } = require('../middleware/auth');

/**
 * PRODUCTION-READY Notification Routes
 * Following Express.js best practices with proper async/await error handling
 */

// GET /notifications?userId=...
// Retrieve all notifications for a user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.query;
        console.log(`[GET /notifications] Request from userId: ${userId}`);

        if (!userId) {
            return res.status(400).json({
                error: 'userId is required',
                message: 'Please provide userId as query parameter'
            });
        }

        const notifications = await NotificationService.getUserNotifications(userId);
        console.log(`[GET /notifications] Returning ${notifications.length} notifications`);

        res.json(notifications);
    } catch (error) {
        console.error(`[GET /notifications] ERROR:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// PUT /notifications/:id/read
// Mark a specific notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        console.log(`[PUT /notifications/:id/read] Marking ${req.params.id} as read`);

        const notification = await NotificationService.markAsRead(req.params.id);
        res.json(notification);
    } catch (error) {
        console.error(`[PUT /notifications/:id/read] ERROR:`, error);

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// DELETE /notifications/:id
// Delete a specific notification
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        console.log(`[DELETE /notifications/:id] Deleting ${req.params.id}`);

        await NotificationService.deleteNotification(req.params.id);
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error(`[DELETE /notifications/:id] ERROR:`, error);

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// POST /notifications/:id/respond
// Respond to an interactive notification
router.post('/:id/respond', authMiddleware, async (req, res) => {
    try {
        const { response } = req.body;
        console.log(`[POST /notifications/:id/respond] ID: ${req.params.id}, response: ${response}`);

        if (!response) {
            return res.status(400).json({
                error: 'Response is required',
                message: 'Please provide response in request body'
            });
        }

        const notification = await NotificationService.respondToNotification(req.params.id, response);

        // Send notification to driver about passenger's response
        try {
            const serviceId = notification.data?.serviceId;
            if (serviceId) {
                const Service = require('../models/Service');
                const User = require('../models/User');

                const service = await Service.findById(serviceId).populate('driver', 'name');
                const passenger = await User.findById(notification.userId);

                if (service && service.driver && passenger) {
                    const responseText = response === 'YES' || response === 'Geliyorum'
                        ? 'gelecek ✅'
                        : 'gelmeyecek ❌';

                    await NotificationService.send(
                        service.driver._id || service.driver,
                        'Yolcu Yanıtı 📋',
                        `${passenger.name || 'Yolcu'} servise ${responseText}`,
                        'INFO',
                        {
                            serviceId,
                            passengerId: notification.userId,
                            passengerResponse: response
                        }
                    );
                    console.log(`[POST /notifications/:id/respond] Driver notification sent`);
                }
            }
        } catch (driverNotifError) {
            console.error('[POST /notifications/:id/respond] Failed to notify driver:', driverNotifError);
            // Don't fail the main request if driver notification fails
        }

        res.json(notification);
    } catch (error) {
        console.error(`[POST /notifications/:id/respond] ERROR:`, error);

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// POST /notifications/test
// Test endpoint for development
router.post('/test', authMiddleware, async (req, res) => {
    try {
        const { userId, title, body, type, data } = req.body;
        console.log(`[POST /notifications/test] Creating test notification for user: ${userId}`);

        if (!userId || !title || !body) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'userId, title, and body are required'
            });
        }

        const notification = await NotificationService.send(userId, title, body, type || 'INFO', data || {});
        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error(`[POST /notifications/test] ERROR:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

module.exports = router;
