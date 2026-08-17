const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const messageRoutes = require("./routes/messageRoutes");
const activityRoutes = require("./routes/activityRoutes");
const Message = require("./models/Message");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set("io", io);

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/activity", activityRoutes);

app.get("/", (req, res) => {
    res.send("Student Collaboration Platform API Running 🚀");
});

// Map of online users: userId -> Set of socket.id
const onlineUsersMap = new Map();

// Real-Time Socket.io Connection Logic
io.on("connection", (socket) => {
    console.log(`⚡ Socket client connected: ${socket.id}`);
    let currentSocketUserId = null;

    // Track user online status
    socket.on("user_online", (userId) => {
        if (!userId) return;
        currentSocketUserId = userId.toString();

        if (!onlineUsersMap.has(currentSocketUserId)) {
            onlineUsersMap.set(currentSocketUserId, new Set());
        }
        onlineUsersMap.get(currentSocketUserId).add(socket.id);

        // Broadcast user online event to everyone
        io.emit("user_status_change", {
            userId: currentSocketUserId,
            status: "online",
            onlineUsers: Array.from(onlineUsersMap.keys())
        });
    });

    // Client requests current list of online user IDs
    socket.on("get_online_users", () => {
        socket.emit("online_users_list", Array.from(onlineUsersMap.keys()));
    });

    // Typing Indicators
    socket.on("typing", (data) => {
        const { roomId, userId, userName } = data;
        if (roomId) {
            socket.to(roomId).emit("user_typing", { userId, userName, roomId });
        }
    });

    socket.on("stop_typing", (data) => {
        const { roomId, userId } = data;
        if (roomId) {
            socket.to(roomId).emit("user_stop_typing", { userId, roomId });
        }
    });

    // Join room (direct chat: dm_user1_user2 or project chat: project_id or user notification: user_userId)
    socket.on("join_room", (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Leave room
    socket.on("leave_room", (roomId) => {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room: ${roomId}`);
    });

    // Handle sending message in real time
    socket.on("send_message", async (data) => {
        try {
            const { senderId, chatType, receiverId, projectId, content, attachmentUrl, attachmentType, attachmentName, replyTo, roomId } = data;
            if ((!content || !content.trim()) && !attachmentUrl) return;

            const newMessageData = {
                sender: senderId,
                chatType,
                content: content ? content.trim() : "",
                attachmentUrl: attachmentUrl || null,
                attachmentType: attachmentType || null,
                attachmentName: attachmentName || null,
                replyTo: replyTo || null
            };

            if (chatType === "direct") {
                newMessageData.receiver = receiverId;
            } else {
                newMessageData.project = projectId;
            }

            const newMessage = new Message(newMessageData);
            await newMessage.save();

            const populatedMessage = await Message.findById(newMessage._id)
                .populate('sender', 'fullName avatar')
                .populate({ path: 'replyTo', select: 'content sender attachmentType', populate: { path: 'sender', select: 'fullName' } })
                .populate('reactions.user', 'fullName');

            // Emit to everyone in the chat room (including sender)
            io.to(roomId).emit("receive_message", populatedMessage);

            // Broadcast real-time notification to receiver or project room members
            if (chatType === "direct" && receiverId) {
                io.to(`user_${receiverId}`).emit("new_message_notification", populatedMessage);
            } else if (chatType === "team" && projectId) {
                socket.to(`project_${projectId}`).emit("new_message_notification", populatedMessage);
            }
        } catch (err) {
            console.error("Error processing socket message:", err);
        }
    });

    // Handle editing message in real time
    socket.on("edit_message", async (data) => {
        try {
            const { messageId, senderId, content, roomId } = data;
            if (!content || !content.trim()) return;

            const message = await Message.findById(messageId);
            if (!message || message.sender.toString() !== senderId || message.isDeleted) return;

            message.content = content.trim();
            message.isEdited = true;
            await message.save();

            const updatedMessage = await Message.findById(message._id)
                .populate('sender', 'fullName avatar')
                .populate({ path: 'replyTo', select: 'content sender attachmentType', populate: { path: 'sender', select: 'fullName' } })
                .populate('reactions.user', 'fullName');

            io.to(roomId).emit("message_edited", updatedMessage);
        } catch (err) {
            console.error("Error processing socket message edit:", err);
        }
    });

    // Handle deleting message in real time
    socket.on("delete_message", async (data) => {
        try {
            const { messageId, senderId, roomId } = data;
            const message = await Message.findById(messageId);
            if (!message || message.sender.toString() !== senderId) return;

            message.content = "This message was deleted";
            message.isDeleted = true;
            message.attachmentUrl = null;
            message.attachmentType = null;
            message.attachmentName = null;
            await message.save();

            const updatedMessage = await Message.findById(message._id)
                .populate('sender', 'fullName avatar')
                .populate({ path: 'replyTo', select: 'content sender attachmentType', populate: { path: 'sender', select: 'fullName' } })
                .populate('reactions.user', 'fullName');

            io.to(roomId).emit("message_deleted", updatedMessage);
        } catch (err) {
            console.error("Error processing socket message delete:", err);
        }
    });

    // Handle emoji reactions in real time
    socket.on("add_reaction", async (data) => {
        try {
            const { messageId, emoji, userId, roomId } = data;
            if (!messageId || !emoji || !userId) return;

            const message = await Message.findById(messageId);
            if (!message) return;

            const existingIdx = message.reactions.findIndex(
                r => r.user.toString() === userId.toString() && r.emoji === emoji
            );

            if (existingIdx > -1) {
                message.reactions.splice(existingIdx, 1);
            } else {
                message.reactions.push({ emoji, user: userId });
            }

            await message.save();

            const updatedMessage = await Message.findById(message._id)
                .populate('sender', 'fullName avatar')
                .populate({ path: 'replyTo', select: 'content sender attachmentType', populate: { path: 'sender', select: 'fullName' } })
                .populate('reactions.user', 'fullName');

            io.to(roomId).emit("message_reaction", updatedMessage);
        } catch (err) {
            console.error("Error processing socket reaction:", err);
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔥 Socket client disconnected: ${socket.id}`);
        if (currentSocketUserId && onlineUsersMap.has(currentSocketUserId)) {
            const userSockets = onlineUsersMap.get(currentSocketUserId);
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                onlineUsersMap.delete(currentSocketUserId);
                io.emit("user_status_change", {
                    userId: currentSocketUserId,
                    status: "offline",
                    onlineUsers: Array.from(onlineUsersMap.keys())
                });
            }
        }
    });
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.log("❌ MongoDB Error:", err));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.io active 🚀`);
});