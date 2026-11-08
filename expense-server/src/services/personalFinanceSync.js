const GroupExpense = require('../model/groupExpense');
const PersonalTransaction = require('../model/personalTransaction');
const User = require('../model/users');
const { normalizeEmail } = require('./groupAccess');

const syncPersonalHistory = async (user) => {
    const email = normalizeEmail(user.email);
    const groupExpenses = await GroupExpense.find({
        'shares.email': email,
    })
        .select('_id groupId title amount shares occurredAt')
        .populate('groupId', 'name')
        .lean();
    if (groupExpenses.length === 0) return;

    const operations = groupExpenses.flatMap((expense) => {
        const share = expense.shares.find(
            (entry) => normalizeEmail(entry.email) === email
        );
        if (!share || share.amount <= 0) return [];
        return [
            {
                updateOne: {
                    filter: {
                        userId: user._id,
                        sourceExpenseId: expense._id,
                    },
                    update: {
                        $setOnInsert: {
                            userId: user._id,
                            type: 'expense',
                            amount: share.amount,
                            category: 'Group expense',
                            description: `${expense.title} (${expense.groupId?.name || 'Group'})`,
                            occurredAt: expense.occurredAt,
                            sourceGroupId: expense.groupId?._id,
                            sourceExpenseId: expense._id,
                        },
                    },
                    upsert: true,
                },
            },
        ];
    });
    if (operations.length > 0) {
        await PersonalTransaction.bulkWrite(operations, { ordered: false });
    }
};

const createUserAndSyncHistory = async (userData) => {
    const user = new User(userData);
    await user.save();
    try {
        await syncPersonalHistory(user);
    } catch (error) {
        console.error('Unable to backfill group expense history:', error);
    }
    return user;
};

module.exports = { createUserAndSyncHistory, syncPersonalHistory };
