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

// Real-Time Socket.io Connection Logic
io.on("connection", (socket) => {
    console.log(`⚡ Socket client connected: ${socket.id}`);

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
            const { senderId, chatType, receiverId, projectId, content, roomId } = data;
            if (!content || !content.trim()) return;

            const newMessageData = {
                sender: senderId,
                chatType,
                content: content.trim()
            };

            if (chatType === "direct") {
                newMessageData.receiver = receiverId;
            } else {
                newMessageData.project = projectId;
            }

            const newMessage = new Message(newMessageData);
            await newMessage.save();

            const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'fullName avatar');

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

    socket.on("disconnect", () => {
        console.log(`🔥 Socket client disconnected: ${socket.id}`);
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