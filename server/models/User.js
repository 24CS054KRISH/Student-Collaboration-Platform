const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    college: {
        type: String,
        trim: true
    },
    branch: {
        type: String,
        trim: true
    },
    year: {
        type: String,
        trim: true
    },
    skills: {
        type: [String],
        default: []
    },
    bio: {
        type: String,
        trim: true
    },
    github: {
        type: String,
        trim: true
    },
    linkedin: {
        type: String,
        trim: true
    },
    portfolio: {
        type: String,
        trim: true
    },
    achievements: {
        type: [String],
        default: []
    },
    interests: {
        type: [String],
        default: []
    },
    avatar: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
