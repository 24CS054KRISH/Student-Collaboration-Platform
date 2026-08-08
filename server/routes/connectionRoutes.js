const express = require('express');
const router = express.Router();
const ConnectionRequest = require('../models/ConnectionRequest');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Helper to fetch all connection statuses and states for a user in both directions.
 */
async function getStatesForUser(userId) {
    const requests = await ConnectionRequest.find({
        $or: [{ sender: userId }, { receiver: userId }]
    });

    const requestStatuses = {};
    const connectionStates = {};

    requests.forEach(r => {
        if (!r.sender || !r.receiver) return;
        const isSender = r.sender.toString() === userId.toString();
        const peerId = isSender ? r.receiver.toString() : r.sender.toString();

        if (r.status === 'accepted') {
            requestStatuses[peerId] = 'accepted';
            connectionStates[peerId] = {
                status: 'accepted',
                state: 'Connected',
                requestId: r._id,
                isSender
            };
        } else if (r.status === 'pending') {
            if (isSender) {
                requestStatuses[peerId] = 'pending';
                connectionStates[peerId] = {
                    status: 'pending',
                    direction: 'sent',
                    state: 'Requested',
                    requestId: r._id,
                    isSender: true
                };
            } else {
                requestStatuses[peerId] = 'received_pending';
                connectionStates[peerId] = {
                    status: 'pending',
                    direction: 'received',
                    state: 'Respond to Request',
                    requestId: r._id,
                    isSender: false
                };
            }
        } else if (r.status === 'rejected') {
            requestStatuses[peerId] = 'rejected';
            connectionStates[peerId] = {
                status: 'rejected',
                state: 'Connect',
                requestId: r._id,
                isSender
            };
        }
    });

    return { requests, requestStatuses, connectionStates };
}

/**
 * POST /api/connections/request
 * Send a connection request from logged-in user to another user.
 */
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const senderId = req.user || req.body.senderId;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message: "Receiver ID is required"
            });
        }

        // Prevent user from connecting with themselves
        if (senderId && senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Cannot send a connection request to yourself"
            });
        }

        // Check if connection request or relationship already exists in either direction
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        });

        if (existingRequest) {
            if (existingRequest.status === 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: "You are already connected with this user"
                });
            } else if (existingRequest.status === 'pending') {
                const isSender = existingRequest.sender.toString() === senderId.toString();
                return res.status(400).json({
                    success: false,
                    message: isSender
                        ? "Connection request already pending"
                        : "This user has already sent you a connection request"
                });
            } else if (existingRequest.status === 'rejected') {
                // Re-request if previously rejected: reset status to pending and re-assign sender/receiver
                existingRequest.sender = senderId;
                existingRequest.receiver = receiverId;
                existingRequest.status = 'pending';
                existingRequest.createdAt = Date.now();
                await existingRequest.save();

                return res.status(200).json({
                    success: true,
                    message: "Connection request sent successfully",
                    connection: existingRequest
                });
            }
        }

        // Create and save new connection request
        const newConnection = new ConnectionRequest({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });

        await newConnection.save();

        return res.status(201).json({
            success: true,
            message: "Connection request sent successfully",
            connection: newConnection
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Connection request already sent"
            });
        }

        console.error("Error sending connection request:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while sending connection request"
        });
    }
});

/**
 * DELETE /api/connections/cancel/:receiverId
 * Cancel/Delete a pending connection request.
 */
router.delete('/cancel/:receiverId', authMiddleware, async (req, res) => {
    try {
        const senderId = req.user;
        const { receiverId } = req.params;

        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message: "Receiver ID is required"
            });
        }

        const request = await ConnectionRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ],
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "No pending connection request found to cancel"
            });
        }

        await ConnectionRequest.deleteOne({ _id: request._id });

        return res.status(200).json({
            success: true,
            message: "Connection request cancelled successfully"
        });
    } catch (error) {
        console.error("Error cancelling connection request:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while cancelling connection request"
        });
    }
});

/**
 * DELETE /api/connections/remove/:targetUserId
 * Remove connection between logged-in user and target user for both users.
 */
router.delete('/remove/:targetUserId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user;
        const { targetUserId } = req.params;

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: "Target user ID is required"
            });
        }

        const result = await ConnectionRequest.deleteMany({
            $or: [
                { sender: currentUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: currentUserId }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No connection found to remove"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Connection removed successfully"
        });
    } catch (error) {
        console.error("Error removing connection:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while removing connection"
        });
    }
});

/**
 * GET /api/connections/sent
 * Retrieve all connection statuses for the logged-in user across sent and received connections.
 */
router.get('/sent', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const { requests, requestStatuses, connectionStates } = await getStatesForUser(userId);

        return res.status(200).json({
            success: true,
            requests,
            requestStatuses,
            connectionStates
        });
    } catch (error) {
        console.error("Error fetching connection requests:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching connection requests"
        });
    }
});

/**
 * GET /api/connections/sent/:userId
 * Retrieve all connection statuses for a specific user across sent and received connections.
 */
router.get('/sent/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId || req.user;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const { requests, requestStatuses, connectionStates } = await getStatesForUser(userId);

        return res.status(200).json({
            success: true,
            requests,
            requestStatuses,
            connectionStates
        });
    } catch (error) {
        console.error("Error fetching connection requests:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching connection requests"
        });
    }
});

/**
 * GET /api/connections/pending
 * Retrieve all pending connection requests received by the logged-in user.
 */
router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;

        const requests = await ConnectionRequest.find({
            receiver: userId,
            status: 'pending'
        }).populate('sender', '-password');

        return res.status(200).json({
            success: true,
            requests
        });
    } catch (error) {
        console.error("Error fetching pending connection requests:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching pending requests"
        });
    }
});

/**
 * PUT /api/connections/respond/:requestId
 * Accept or Reject a connection request.
 */
router.put('/respond/:requestId', authMiddleware, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body; // 'accept' or 'reject'
        const userId = req.user;

        if (!action || !['accept', 'reject'].includes(action.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Valid action ('accept' or 'reject') is required"
            });
        }

        const request = await ConnectionRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Connection request not found"
            });
        }

        // Verify that the logged-in user is the recipient of the request
        if (request.receiver.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to respond to this connection request"
            });
        }

        // Prevent responding multiple times if already processed
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Connection request has already been ${request.status}`
            });
        }

        request.status = action.toLowerCase() === 'accept' ? 'accepted' : 'rejected';
        await request.save();

        return res.status(200).json({
            success: true,
            message: `Connection request ${request.status} successfully`,
            connection: request
        });
    } catch (error) {
        console.error("Error responding to connection request:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while responding to connection request"
        });
    }
});

/**
 * GET /api/connections/accepted
 * Retrieve all accepted connection profiles for the logged-in user.
 */
router.get('/accepted', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;

        const acceptedRequests = await ConnectionRequest.find({
            status: 'accepted',
            $or: [{ sender: userId }, { receiver: userId }]
        })
        .populate('sender', '-password')
        .populate('receiver', '-password');

        // Extract unique connected peer for each accepted request
        const connectionsMap = new Map();
        acceptedRequests.forEach(reqDoc => {
            if (!reqDoc.sender || !reqDoc.receiver) return;
            const isSender = reqDoc.sender._id.toString() === userId.toString();
            const peer = isSender ? reqDoc.receiver : reqDoc.sender;
            if (peer && peer._id && !connectionsMap.has(peer._id.toString())) {
                connectionsMap.set(peer._id.toString(), peer);
            }
        });

        const connections = Array.from(connectionsMap.values());

        return res.status(200).json({
            success: true,
            connections
        });
    } catch (error) {
        console.error("Error fetching accepted connections:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching accepted connections"
        });
    }
});

module.exports = router;




