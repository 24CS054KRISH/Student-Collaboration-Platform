const mongoose = require('mongoose');

const projectJoinRequestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    projectOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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

// Avoid duplicate requests of the same user for the same project
projectJoinRequestSchema.index({ requester: 1, project: 1 }, { unique: true });

const ProjectJoinRequest = mongoose.model('ProjectJoinRequest', projectJoinRequestSchema);

module.exports = ProjectJoinRequest;
