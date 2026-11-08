const mongoose = require('mongoose');

const personalTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: { type: String, enum: ['income', 'expense'], required: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'INR', uppercase: true },
        category: { type: String, required: true, trim: true, maxlength: 60 },
        description: { type: String, trim: true, maxlength: 250 },
        occurredAt: { type: Date, default: Date.now },
        sourceGroupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
        },
        sourceExpenseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GroupExpense',
        },
    },
    { timestamps: true }
);

personalTransactionSchema.index({ userId: 1, occurredAt: -1 });
personalTransactionSchema.index(
    { userId: 1, sourceExpenseId: 1 },
    {
        unique: true,
        partialFilterExpression: { sourceExpenseId: { $exists: true } },
    }
);

module.exports = mongoose.model(
    'PersonalTransaction',
    personalTransactionSchema
);
