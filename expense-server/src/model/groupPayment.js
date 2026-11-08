const mongoose = require('mongoose');

const groupPaymentSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
            index: true,
        },
        payerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        fromEmail: { type: String, required: true, lowercase: true, trim: true },
        toEmail: { type: String, required: true, lowercase: true, trim: true },
        amount: { type: Number, required: true, min: 1 },
        orderId: { type: String, required: true, unique: true },
        paymentId: { type: String, default: null },
        settlementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GroupSettlement',
            default: null,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'needs_review'],
            default: 'pending',
        },
        lastError: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('GroupPayment', groupPaymentSchema);
