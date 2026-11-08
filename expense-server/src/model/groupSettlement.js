const mongoose = require('mongoose');

const groupSettlementSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
            index: true,
        },
        fromEmail: { type: String, required: true, lowercase: true, trim: true },
        toEmail: { type: String, required: true, lowercase: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'INR', uppercase: true },
        note: { type: String, trim: true, maxlength: 250 },
        paymentId: { type: String, unique: true, sparse: true },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

groupSettlementSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('GroupSettlement', groupSettlementSchema);
