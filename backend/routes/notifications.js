const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');

// GET /notifications?userId=...
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const notifications = await NotificationService.getUserNotifications(userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /notifications/:id/read
router.put('/:id/read', async (req, res) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id);
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /notifications/test (For development testing)
router.post('/test', async (req, res) => {
    try {
        const { userId, title, body, type, data } = req.body;
        const notification = await NotificationService.send(userId, title, body, type, data);
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
