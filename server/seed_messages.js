const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const ConnectionRequest = require('./models/ConnectionRequest');
const ProjectApplication = require('./models/ProjectApplication');
const Message = require('./models/Message');
require('dotenv').config();

const seedMessages = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/student_platform";
        await mongoose.connect(mongoUri);
        console.log(`Connected to MongoDB (${mongoUri}) for message seeding...`);

        const users = await User.find({});
        console.log(`Found ${users.length} users in DB.`);

        if (users.length < 2) {
            console.log("Not enough users to seed messages.");
            process.exit(0);
        }

        const user1 = users[0]; // e.g. Primary logged in user
        const user2 = users[1]; // Connection peer

        console.log(`Seeding messages between ${user1.fullName} (${user1._id}) and ${user2.fullName} (${user2._id})...`);

        // Ensure connection request exists between user1 and user2
        const existingConn = await ConnectionRequest.findOne({
            $or: [
                { sender: user1._id, receiver: user2._id },
                { sender: user2._id, receiver: user1._id }
            ]
        });

        if (!existingConn) {
            await ConnectionRequest.create({
                sender: user2._id,
                receiver: user1._id,
                status: 'accepted'
            });
            console.log("Created accepted connection request between users.");
        } else if (existingConn.status !== 'accepted') {
            existingConn.status = 'accepted';
            await existingConn.save();
            console.log("Updated existing connection request to accepted.");
        }

        // Seed 3 Direct Messages from user2 -> user1 (unread by user1)
        const directMessages = [
            {
                sender: user2._id,
                receiver: user1._id,
                chatType: 'direct',
                content: "Hey! Are you free to discuss the project architecture?",
                createdAt: new Date(Date.now() - 1000 * 60 * 15) // 15 mins ago
            },
            {
                sender: user2._id,
                receiver: user1._id,
                chatType: 'direct',
                content: "I checked out your latest commits, looks really awesome!",
                createdAt: new Date(Date.now() - 1000 * 60 * 5) // 5 mins ago
            },
            {
                sender: user2._id,
                receiver: user1._id,
                chatType: 'direct',
                content: "Let me know when you're online to test the real-time chat feature 🚀",
                createdAt: new Date(Date.now() - 1000 * 60 * 2) // 2 mins ago
            }
        ];

        for (const msgData of directMessages) {
            const exists = await Message.findOne({ sender: msgData.sender, receiver: msgData.receiver, content: msgData.content });
            if (!exists) {
                await Message.create(msgData);
                console.log(`Created direct message: "${msgData.content.slice(0, 30)}..."`);
            }
        }

        // Seed Team Messages for projects
        const projects = await Project.find({});
        if (projects.length > 0) {
            const proj = projects[0];
            console.log(`Seeding team messages for project "${proj.title}" (${proj._id})...`);

            const teamMessages = [
                {
                    sender: user2._id,
                    project: proj._id,
                    chatType: 'team',
                    content: `Welcome to the team room for ${proj.title}!`,
                    createdAt: new Date(Date.now() - 1000 * 60 * 30)
                },
                {
                    sender: user2._id,
                    project: proj._id,
                    chatType: 'team',
                    content: "Please review the task list in the repository.",
                    createdAt: new Date(Date.now() - 1000 * 60 * 10)
                }
            ];

            for (const msgData of teamMessages) {
                const exists = await Message.findOne({ project: msgData.project, content: msgData.content });
                if (!exists) {
                    await Message.create(msgData);
                    console.log(`Created team message: "${msgData.content.slice(0, 30)}..."`);
                }
            }
        }

        console.log("✅ Message Seeding Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
};

seedMessages();
