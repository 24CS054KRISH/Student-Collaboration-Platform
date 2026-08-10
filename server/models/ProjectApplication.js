const mongoose = require('mongoose');

const projectApplicationSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user can only apply once to a specific project
projectApplicationSchema.index({ project: 1, applicant: 1 }, { unique: true });

const ProjectApplication = mongoose.model('ProjectApplication', projectApplicationSchema);

module.exports = ProjectApplication;
