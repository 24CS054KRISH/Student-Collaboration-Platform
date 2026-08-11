const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['project_created', 'team_joined', 'connection_made'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
