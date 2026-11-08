const mongoose = require('mongoose');

const memberRoleSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        role: {
            type: String,
            required: true,
            enum: ['manager', 'user', 'viewer'],
            default: 'user',
        },
    },
    { _id: false }
);

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true},
    description: { type: String, required: false },
    adminEmail: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    membersEmail: { type: [String], default: [] },
    memberRoles: { type: [memberRoleSchema], default: [] },
    thumbnail: { type: String, required: false }
});

groupSchema.index({ membersEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Group', groupSchema);