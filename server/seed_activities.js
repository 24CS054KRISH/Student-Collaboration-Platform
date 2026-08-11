const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Project = require('./models/Project');
const ActivityLog = require('./models/ActivityLog');

async function seedActivities() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected for Activity Seeding");

        const users = await User.find();
        if (users.length === 0) {
            console.log("No users found to seed activities.");
            process.exit(0);
        }

        const aarav = users.find(u => u.fullName.includes("Aarav")) || users[0];
        const priya = users.find(u => u.fullName.includes("Priya")) || users[1] || users[0];
        const rohan = users.find(u => u.fullName.includes("Rohan")) || users[2] || users[0];

        const projects = await Project.find();
        const p1 = projects[0];
        const p2 = projects[1];

        // Clear existing test activity logs
        await ActivityLog.deleteMany({});

        const seedLogs = [
            {
                user: aarav._id,
                type: 'project_created',
                title: `launched a new project: "${p1 ? p1.title : 'AI Study Buddy'}"`,
                description: p1 ? p1.description : 'Building a collaborative AI learning assistant for university students.',
                createdAt: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
                user: priya._id,
                type: 'team_joined',
                title: `joined the team for project "${p1 ? p1.title : 'AI Study Buddy'}"`,
                description: 'Joined as Frontend UI Lead',
                createdAt: new Date(Date.now() - 15 * 60 * 1000)
            },
            {
                user: rohan._id,
                type: 'connection_made',
                title: `formed a new connection with ${aarav.fullName}`,
                description: 'Connected for peer code reviews and project collaboration.',
                createdAt: new Date(Date.now() - 30 * 60 * 1000)
            }
        ];

        await ActivityLog.insertMany(seedLogs);
        console.log("🎉 Seeded initial activity feed items successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error seeding activities:", err);
        process.exit(1);
    }
}

seedActivities();
