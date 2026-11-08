const mongoose = require('mongoose');

const expenseShareSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        shares: { type: Number, min: 0 },
    },
    { _id: false }
);

const groupExpenseSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, maxlength: 500 },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'INR', uppercase: true },
        paidBy: { type: String, required: true, lowercase: true, trim: true },
        splitType: {
            type: String,
            enum: ['equal', 'exact', 'shares'],
            required: true,
        },
        shares: { type: [expenseShareSchema], required: true },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        occurredAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

groupExpenseSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('GroupExpense', groupExpenseSchema);
