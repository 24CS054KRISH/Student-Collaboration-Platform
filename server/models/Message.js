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
        required: function () {
            return !this.attachmentUrl;
        },
        trim: true,
        default: ""
    },
    attachmentUrl: {
        type: String,
        default: null
    },
    attachmentType: {
        type: String,
        enum: ['image', 'file', 'audio', null],
        default: null
    },
    attachmentName: {
        type: String,
        default: null
    },
    reactions: [{
        emoji: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
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
