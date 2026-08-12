const express = require('express');
const router = express.Router();
const ProjectJoinRequest = require('../models/ProjectJoinRequest');
const Notification = require('../models/Notification');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/join-requests/request
 * Send a project join request (from logged-in requester)
 */
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.body;
        const requesterId = req.user;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required"
            });
        }

        // Fetch project to retrieve owner and verify existence
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const projectOwnerId = project.createdBy;

        // Prevent owner from requesting to join their own project
        if (projectOwnerId.toString() === requesterId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot join your own project"
            });
        }

        // Check if join request already exists
        const existingRequest = await ProjectJoinRequest.findOne({
            requester: requesterId,
            project: projectId
        });

        if (existingRequest) {
            if (existingRequest.status === 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: "You have already joined this project"
                });
            } else if (existingRequest.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: "Join request is already pending"
                });
            } else if (existingRequest.status === 'rejected') {
                // Re-request if previously rejected: reset status to pending
                existingRequest.status = 'pending';
                existingRequest.createdAt = Date.now();
                await existingRequest.save();

                // If notification exists, reset it to unread/unresolved
                const notification = await Notification.findOne({ joinRequest: existingRequest._id });
                if (notification) {
                    notification.read = false;
                    notification.resolved = false;
                    notification.resolvedAction = undefined;
                    notification.createdAt = Date.now();
                    await notification.save();
                } else {
                    const newNotification = new Notification({
                        recipient: projectOwnerId,
                        sender: requesterId,
                        project: projectId,
                        joinRequest: existingRequest._id,
                        message: 'wants to join your project',
                        read: false,
                        resolved: false
                    });
                    await newNotification.save();
                }

                return res.status(200).json({
                    success: true,
                    message: "Join request re-sent successfully",
                    request: existingRequest
                });
            }
        }

        // Create and save new join request
        const newRequest = new ProjectJoinRequest({
            requester: requesterId,
            project: projectId,
            projectOwner: projectOwnerId,
            status: 'pending'
        });
        await newRequest.save();

        // Create persistent notification for owner
        const newNotification = new Notification({
            recipient: projectOwnerId,
            sender: requesterId,
            project: projectId,
            joinRequest: newRequest._id,
            message: 'wants to join your project',
            read: false,
            resolved: false
        });
        await newNotification.save();

        return res.status(201).json({
            success: true,
            message: "Join request sent successfully",
            request: newRequest
        });
    } catch (error) {
        console.error("Error sending project join request:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while sending join request"
        });
    }
});

/**
 * GET /api/join-requests/my-requests
 * Retrieve all join requests sent by the logged-in student (to map states in frontend)
 */
router.get('/my-requests', authMiddleware, async (req, res) => {
    try {
        const requesterId = req.user;
        const requests = await ProjectJoinRequest.find({ requester: requesterId });

        return res.status(200).json({
            success: true,
            requests
        });
    } catch (error) {
        console.error("Error fetching my join requests:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching requests"
        });
    }
});

/**
 * GET /api/join-requests/notifications
 * Retrieve all active (unresolved) join request notifications for the logged-in owner
 */
router.get('/notifications', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const notifications = await Notification.find({
            recipient: userId,
            resolved: false
        })
        .populate('sender', 'fullName email')
        .populate('project', 'title')
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching notifications"
        });
    }
});

/**
 * PUT /api/join-requests/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        if (notification.recipient.toString() !== req.user.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden"
            });
        }

        notification.read = true;
        await notification.save();

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        console.error("Error marking notification read:", error);
        return res.status(500).json({
            success: false,
            message: "Server error marking notification read"
        });
    }
});

/**
 * PUT /api/join-requests/respond/:requestId
 * Respond to a join request with 'accept' or 'reject'
 */
router.put('/respond/:requestId', authMiddleware, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body; // 'accept' or 'reject'
        const ownerId = req.user;

        if (!action || !['accept', 'reject'].includes(action.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Valid action ('accept' or 'reject') is required"
            });
        }

        const request = await ProjectJoinRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Join request not found"
            });
        }

        // Verify authorization
        if (request.projectOwner.toString() !== ownerId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to respond to this join request"
            });
        }

        // Don't duplicate responses
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Join request is already ${request.status}`
            });
        }

        const nextStatus = action.toLowerCase() === 'accept' ? 'accepted' : 'rejected';
        request.status = nextStatus;
        await request.save();

        // Update the owner notification: resolve it, mark read, set resolution action
        const notification = await Notification.findOne({ joinRequest: requestId });
        if (notification) {
            notification.read = true;
            notification.resolved = true;
            notification.resolvedAction = nextStatus;
            await notification.save();
        }

        return res.status(200).json({
            success: true,
            message: `Join request has been ${nextStatus} successfully`,
            request
        });
    } catch (error) {
        console.error("Error responding to join request:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while responding to join request"
        });
    }
});

module.exports = router;
