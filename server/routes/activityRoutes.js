const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

// GET /api/activity/recent — Fetch recent 15 activity log items
router.get('/recent', async (req, res) => {
    try {
        const activities = await ActivityLog.find()
            .populate('user', 'fullName email avatar branch year college skills')
            .sort({ createdAt: -1 })
            .limit(15);

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
