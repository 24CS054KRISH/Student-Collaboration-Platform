const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Project = require('../models/Project');
const ProjectApplication = require('../models/ProjectApplication');
const ConnectionRequest = require('../models/ConnectionRequest');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * GET /api/messages/conversations
 * Fetch active channels for current user:
 * - Direct Chats (accepted connections)
 * - Project Teams (owned projects + projects joined as accepted applicant)
 */
router.get('/conversations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;

        // 1. Fetch Accepted Connections
        const acceptedRequests = await ConnectionRequest.find({
            status: 'accepted',
            $or: [{ sender: userId }, { receiver: userId }]
        })
            .populate('sender', 'fullName email college branch year avatar')
            .populate('receiver', 'fullName email college branch year avatar');

        const directMap = new Map();
        acceptedRequests.forEach(reqDoc => {
            if (!reqDoc.sender || !reqDoc.receiver) return;
            const isSender = reqDoc.sender._id.toString() === userId.toString();
            const peer = isSender ? reqDoc.receiver : reqDoc.sender;
            if (peer && peer._id && !directMap.has(peer._id.toString())) {
                const name = peer.fullName || "Student";
                directMap.set(peer._id.toString(), {
                    _id: peer._id,
                    name: name,
                    email: peer.email || "",
                    branch: peer.branch || "Student",
                    year: peer.year || "",
                    avatar: peer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`
                });
            }
        });
        const directChats = Array.from(directMap.values());

        // 2. Fetch Project Team Channels
        const ownedProjects = await Project.find({ createdBy: userId }).select('title category status createdBy');

        const acceptedApps = await ProjectApplication.find({
            applicant: userId,
            status: 'accepted'
        }).populate('project', 'title category status createdBy');

        const teamMap = new Map();
        ownedProjects.forEach(p => {
            teamMap.set(p._id.toString(), {
                _id: p._id,
                title: p.title,
                category: p.category,
                status: p.status,
                isOwner: true
            });
        });

        acceptedApps.forEach(app => {
            if (app.project && !teamMap.has(app.project._id.toString())) {
                teamMap.set(app.project._id.toString(), {
                    _id: app.project._id,
                    title: app.project.title,
                    category: app.project.category,
                    status: app.project.status,
                    isOwner: false
                });
            }
        });

        const teamChats = Array.from(teamMap.values());

        // 3. Attach lastMessage preview, timestamp, and unreadCount
        for (const peer of directChats) {
            const lastMsg = await Message.findOne({
                chatType: 'direct',
                clearedBy: { $ne: userId },
                $or: [
                    { sender: userId, receiver: peer._id },
                    { sender: peer._id, receiver: userId }
                ]
            }).sort({ createdAt: -1 });

            const unreadCount = await Message.countDocuments({
                chatType: 'direct',
                clearedBy: { $ne: userId },
                sender: peer._id,
                receiver: userId,
                readBy: { $ne: userId }
            });

            peer.lastMessage = lastMsg ? lastMsg.content : null;
            peer.lastMessageTime = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
            peer.unreadCount = unreadCount;
        }

        for (const team of teamChats) {
            const lastMsg = await Message.findOne({
                chatType: 'team',
                clearedBy: { $ne: userId },
                project: team._id
            }).sort({ createdAt: -1 });

            const unreadCount = await Message.countDocuments({
                chatType: 'team',
                clearedBy: { $ne: userId },
                project: team._id,
                sender: { $ne: userId },
                readBy: { $ne: userId }
            });

            team.lastMessage = lastMsg ? lastMsg.content : null;
            team.lastMessageTime = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
            team.unreadCount = unreadCount;
        }

        return res.status(200).json({
            success: true,
            directChats,
            teamChats
        });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching conversations"
        });
    }
});

/**
 * GET /api/messages/direct/:peerId
 * Get direct messages history between current user and peer
 */
router.get('/direct/:peerId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const { peerId } = req.params;

        // Mark incoming direct messages as read by current user
        await Message.updateMany(
            {
                chatType: 'direct',
                sender: peerId,
                receiver: userId,
                readBy: { $ne: userId }
            },
            { $addToSet: { readBy: userId } }
        );

        const messages = await Message.find({
            chatType: 'direct',
            clearedBy: { $ne: userId },
            $or: [
                { sender: userId, receiver: peerId },
                { sender: peerId, receiver: userId }
            ]
        })
            .populate('sender', 'fullName avatar')
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        console.error("Error fetching direct messages:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching direct messages"
        });
    }
});

/**
 * GET /api/messages/project/:projectId
 * Get project team messages history
 */
router.get('/project/:projectId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const isOwner = project.createdBy.toString() === userId.toString();
        let isAcceptedMember = false;

        if (!isOwner) {
            const acceptedApp = await ProjectApplication.findOne({
                project: projectId,
                applicant: userId,
                status: 'accepted'
            });
            isAcceptedMember = !!acceptedApp;
        }

        if (!isOwner && !isAcceptedMember) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to access team chat for this project"
            });
        }

        // Mark incoming team messages as read by current user
        await Message.updateMany(
            {
                chatType: 'team',
                project: projectId,
                sender: { $ne: userId },
                readBy: { $ne: userId }
            },
            { $addToSet: { readBy: userId } }
        );

        const messages = await Message.find({
            chatType: 'team',
            clearedBy: { $ne: userId },
            project: projectId
        })
            .populate('sender', 'fullName avatar')
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        console.error("Error fetching project messages:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching project messages"
        });
    }
});

/**
 * POST /api/messages/send
 * Send a message via REST API
 */
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const senderId = req.user;
        const { chatType, receiverId, projectId, content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot be empty"
            });
        }

        if (!chatType || !['direct', 'team'].includes(chatType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid chat type"
            });
        }

        const newMessageData = {
            sender: senderId,
            chatType,
            content: content.trim()
        };

        if (chatType === 'direct') {
            if (!receiverId) {
                return res.status(400).json({ success: false, message: "Receiver ID is required for direct chat" });
            }
            newMessageData.receiver = receiverId;
        } else {
            if (!projectId) {
                return res.status(400).json({ success: false, message: "Project ID is required for team chat" });
            }
            newMessageData.project = projectId;
        }

        const newMessage = new Message(newMessageData);
        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'fullName avatar');

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: populatedMessage
        });
    } catch (error) {
        console.error("Error sending message:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while sending message"
        });
    }
});

/**
 * PUT /api/messages/edit/:messageId
 * Edit own message
 */
router.put('/edit/:messageId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const { messageId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot be empty"
            });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        // Ownership verification
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only edit your own messages"
            });
        }

        if (message.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Deleted messages cannot be edited"
            });
        }

        message.content = content.trim();
        message.isEdited = true;
        await message.save();

        const updatedMessage = await Message.findById(message._id).populate('sender', 'fullName avatar');

        // Emit real-time edit event if Socket.io is available on req.app
        const io = req.app.get('io');
        if (io) {
            let roomId = "";
            if (updatedMessage.chatType === "direct") {
                const sortedIds = [updatedMessage.sender._id.toString(), updatedMessage.receiver.toString()].sort();
                roomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
            } else {
                roomId = `project_${updatedMessage.project.toString()}`;
            }
            io.to(roomId).emit("message_edited", updatedMessage);
        }

        return res.status(200).json({
            success: true,
            message: "Message edited successfully",
            data: updatedMessage
        });
    } catch (error) {
        console.error("Error editing message:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while editing message"
        });
    }
});

/**
 * DELETE /api/messages/delete/:messageId
 * Delete own message (soft delete with placeholder)
 */
router.delete('/delete/:messageId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        // Ownership verification
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only delete your own messages"
            });
        }

        message.content = "This message was deleted";
        message.isDeleted = true;
        await message.save();

        const updatedMessage = await Message.findById(message._id).populate('sender', 'fullName avatar');

        // Emit real-time delete event via Socket.io
        const io = req.app.get('io');
        if (io) {
            let roomId = "";
            if (updatedMessage.chatType === "direct") {
                const sortedIds = [updatedMessage.sender._id.toString(), updatedMessage.receiver.toString()].sort();
                roomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
            } else {
                roomId = `project_${updatedMessage.project.toString()}`;
            }
            io.to(roomId).emit("message_deleted", updatedMessage);
        }

        return res.status(200).json({
            success: true,
            message: "Message deleted successfully",
            data: updatedMessage
        });
    } catch (error) {
        console.error("Error deleting message:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting message"
        });
    }
});

/**
 * POST /api/messages/delete-for-me/:messageId
 * Hide single message for current user only
 */
router.post('/delete-for-me/:messageId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        await Message.findByIdAndUpdate(messageId, {
            $addToSet: { clearedBy: userId }
        });

        return res.status(200).json({
            success: true,
            message: "Message hidden for current user"
        });
    } catch (error) {
        console.error("Error deleting message for me:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while removing message"
        });
    }
});

/**
 * POST /api/messages/clear-direct/:peerId
 * Clear direct conversation history ONLY for the logged-in user
 */
router.post('/clear-direct/:peerId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user;
        const { peerId } = req.params;

        await Message.updateMany(
            {
                chatType: 'direct',
                $or: [
                    { sender: userId, receiver: peerId },
                    { sender: peerId, receiver: userId }
                ]
            },
            { $addToSet: { clearedBy: userId } }
        );

        return res.status(200).json({
            success: true,
            message: "Chat cleared successfully for current user"
        });
    } catch (error) {
        console.error("Error clearing direct chat:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while clearing chat"
        });
    }
});

module.exports = router;
