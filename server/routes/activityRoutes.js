const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

// GET /api/activity/recent — Fetch recent activity log items (optional ?limit=...)
router.get('/recent', async (req, res) => {
    try {
        const limitParam = parseInt(req.query.limit);
        const limit = !isNaN(limitParam) && limitParam > 0 ? limitParam : 30;

        const activities = await ActivityLog.find()
            .populate('user', 'fullName email avatar branch year college skills')
            .sort({ createdAt: -1 })
            .limit(limit);

        return res.status(200).json({
            success: true,
            activities
        });
    } catch (error) {
        console.error("Error fetching recent activity log:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching activity log"
        });
    }
});

module.exports = router;
