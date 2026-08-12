const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    joinRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectJoinRequest',
        required: true
    },
    message: {
        type: String,
        required: true,
        default: 'wants to join your project'
    },
    read: {
        type: Boolean,
        default: false
    },
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAction: {
        type: String,
        enum: ['accepted', 'rejected'],
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
