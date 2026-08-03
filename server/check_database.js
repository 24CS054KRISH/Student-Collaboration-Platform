const mongoose = require('mongoose');
require('dotenv').config();

const ProjectSchema = new mongoose.Schema({
    title: String,
    description: String,
    createdBy: mongoose.Schema.Types.ObjectId
});

const UserSchema = new mongoose.Schema({
    email: String,
    name: String
});

const Project = mongoose.model('Project', ProjectSchema);
const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully");

        const users = await User.find({});
        console.log("\n=== USERS ===");
        users.forEach(u => console.log(`User ID: ${u._id}, Email: ${u.email}, Name: ${u.name}`));

        const projects = await Project.find({});
        console.log("\n=== PROJECTS ===");
        projects.forEach(p => console.log(`Project ID: ${p._id}, Title: ${p.title}, CreatedBy: ${p.createdBy}`));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
