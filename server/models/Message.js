const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chatType: {
        type: String,
        enum: ['direct', 'team'],
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.chatType === 'direct';
        }
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: function () {
            return this.chatType === 'team';
        }
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    clearedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient fetching of conversation history
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ project: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
