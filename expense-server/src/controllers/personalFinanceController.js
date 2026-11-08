const mongoose = require('mongoose');
const PersonalTransaction = require('../model/personalTransaction');
const { toPaise } = require('../services/splitCalculator');

const PAGE_LIMIT = 100;
const allowedTypes = new Set(['income', 'expense']);
const cleanText = (value, maxLength) =>
    typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const personalFinanceController = {
    summary: async (request, response) => {
        try {
            const totals = await PersonalTransaction.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(request.user.id),
                    },
                },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ]);
            const result = {
                income: 0,
                expenses: 0,
                incomeCount: 0,
                expenseCount: 0,
            };
            for (const row of totals) {
                if (row._id === 'income') {
                    result.income = row.total;
                    result.incomeCount = row.count;
                } else {
                    result.expenses = row.total;
                    result.expenseCount = row.count;
                }
            }
            return response.json({
                ...result,
                balance: result.income - result.expenses,
            });
        } catch (error) {
            console.error('Unable to fetch personal finance summary:', error);
            return response.status(500).json({
                message: 'Unable to fetch financial summary',
            });
        }
    },

    listTransactions: async (request, response) => {
        try {
            const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
            const limit = Math.min(
                PAGE_LIMIT,
                Math.max(1, Number.parseInt(request.query.limit, 10) || 20)
            );
            const filter = { userId: request.user.id };
            if (allowedTypes.has(request.query.type)) {
                filter.type = request.query.type;
            }
            if (request.query.category) {
                filter.category = String(request.query.category)
                    .trim()
                    .slice(0, 60);
            }
            const [transactions, totalItems] = await Promise.all([
                PersonalTransaction.find(filter)
                    .sort({ occurredAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                PersonalTransaction.countDocuments(filter),
            ]);
            return response.json({
                transactions,
                pagination: {
                    currentPage: page,
                    itemsPerPage: limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                },
            });
        } catch (error) {
            console.error('Unable to fetch personal transactions:', error);
            return response.status(500).json({
                message: 'Unable to fetch transactions',
            });
        }
    },

    createTransaction: async (request, response) => {
        try {
            const { type, amount, category, description, occurredAt } =
                request.body;
            if (!allowedTypes.has(type)) {
                return response.status(400).json({
                    message: 'Transaction type must be income or expense',
                });
            }
            if (
                typeof category !== 'string' ||
                !category.trim() ||
                category.trim().length > 60
            ) {
                return response.status(400).json({
                    message: 'A category of at most 60 characters is required',
                });
            }
            const paise = toPaise(amount);
            const date = occurredAt ? new Date(occurredAt) : new Date();
            if (Number.isNaN(date.getTime())) {
                return response.status(400).json({
                    message: 'Transaction date is invalid',
                });
            }
            const transaction = await PersonalTransaction.create({
                userId: request.user.id,
                type,
                amount: paise / 100,
                category: category.trim(),
                description: cleanText(description, 250),
                occurredAt: date,
            });
            return response.status(201).json({
                message: 'Transaction added',
                transaction,
            });
        } catch (error) {
            if (error instanceof Error && !error.name.startsWith('Mongo')) {
                return response.status(400).json({ message: error.message });
            }
            console.error('Unable to create personal transaction:', error);
            return response.status(500).json({
                message: 'Unable to create transaction',
            });
        }
    },

    updateTransaction: async (request, response) => {
        try {
            const { type, amount, category, description, occurredAt } =
                request.body;
            const updates = {};
            if (type !== undefined) {
                if (!allowedTypes.has(type)) {
                    return response.status(400).json({
                        message: 'Transaction type must be income or expense',
                    });
                }
                updates.type = type;
            }
            if (amount !== undefined) {
                updates.amount = toPaise(amount) / 100;
            }
            if (category !== undefined) {
                if (
                    typeof category !== 'string' ||
                    !category.trim() ||
                    category.trim().length > 60
                ) {
                    return response.status(400).json({
                        message: 'A valid category is required',
                    });
                }
                updates.category = category.trim();
            }
            if (description !== undefined) {
                updates.description = cleanText(description, 250);
            }
            if (occurredAt !== undefined) {
                const date = new Date(occurredAt);
                if (Number.isNaN(date.getTime())) {
                    return response.status(400).json({
                        message: 'Transaction date is invalid',
                    });
                }
                updates.occurredAt = date;
            }
            if (Object.keys(updates).length === 0) {
                return response.status(400).json({
                    message: 'Provide at least one transaction field to update',
                });
            }
            const transaction = await PersonalTransaction.findOneAndUpdate(
                {
                    _id: request.params.transactionId,
                    userId: request.user.id,
                    sourceExpenseId: { $exists: false },
                },
                { $set: updates },
                { new: true, runValidators: true }
            );
            if (!transaction) {
                return response.status(404).json({
                    message: 'Personal transaction not found or cannot be edited',
                });
            }
            return response.json({ transaction });
        } catch (error) {
            if (error instanceof Error && !error.name.startsWith('Mongo')) {
                return response.status(400).json({ message: error.message });
            }
            console.error('Unable to update personal transaction:', error);
            return response.status(500).json({
                message: 'Unable to update transaction',
            });
        }
    },

    deleteTransaction: async (request, response) => {
        try {
            const transaction = await PersonalTransaction.findOneAndDelete({
                _id: request.params.transactionId,
                userId: request.user.id,
                sourceExpenseId: { $exists: false },
            });
            if (!transaction) {
                return response.status(404).json({
                    message: 'Personal transaction not found or cannot be deleted',
                });
            }
            return response.json({ message: 'Transaction deleted' });
        } catch (error) {
            console.error('Unable to delete personal transaction:', error);
            return response.status(500).json({
                message: 'Unable to delete transaction',
            });
        }
    },
};

module.exports = personalFinanceController;
