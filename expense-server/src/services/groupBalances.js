const GroupExpense = require('../model/groupExpense');
const GroupSettlement = require('../model/groupSettlement');
const { normalizeEmail } = require('./groupAccess');

const buildGroupBalances = (memberEmails, expenses, settlements) => {
    const balances = new Map(
        memberEmails.map((email) => [normalizeEmail(email), 0])
    );

    for (const expense of expenses) {
        const payer = normalizeEmail(expense.paidBy);
        balances.set(
            payer,
            (balances.get(payer) || 0) +
                Math.round(expense.amount * 100)
        );
        for (const share of expense.shares) {
            const email = normalizeEmail(share.email);
            balances.set(
                email,
                (balances.get(email) || 0) -
                    Math.round(share.amount * 100)
            );
        }
    }

    for (const settlement of settlements) {
        const from = normalizeEmail(settlement.fromEmail);
        const to = normalizeEmail(settlement.toEmail);
        const amount = Math.round(settlement.amount * 100);
        balances.set(from, (balances.get(from) || 0) + amount);
        balances.set(to, (balances.get(to) || 0) - amount);
    }

    return balances;
};

const getGroupBalances = async (groupId, memberEmails) => {
    const [expenseTotals, settlementTotals] = await Promise.all([
        GroupExpense.aggregate([
            { $match: { groupId } },
            { $project: { paidBy: 1, amount: 1, shares: 1 } },
            {
                $facet: {
                    paid: [
                        {
                            $group: {
                                _id: '$paidBy',
                                amount: { $sum: '$amount' },
                            },
                        },
                    ],
                    owed: [
                        { $unwind: '$shares' },
                        {
                            $group: {
                                _id: '$shares.email',
                                amount: { $sum: '$shares.amount' },
                            },
                        },
                    ],
                },
            },
        ]),
        GroupSettlement.aggregate([
            { $match: { groupId } },
            {
                $facet: {
                    paid: [
                        {
                            $group: {
                                _id: '$fromEmail',
                                amount: { $sum: '$amount' },
                            },
                        },
                    ],
                    received: [
                        {
                            $group: {
                                _id: '$toEmail',
                                amount: { $sum: '$amount' },
                            },
                        },
                    ],
                },
            },
        ]),
    ]);

    const balances = new Map(
        memberEmails.map((email) => [normalizeEmail(email), 0])
    );
    const apply = (rows, factor) => {
        for (const row of rows || []) {
            const email = normalizeEmail(row._id);
            balances.set(
                email,
                (balances.get(email) || 0) +
                    factor * Math.round(row.amount * 100)
            );
        }
    };
    const expenseData = expenseTotals[0] || { paid: [], owed: [] };
    const settlementData = settlementTotals[0] || {
        paid: [],
        received: [],
    };
    apply(expenseData.paid, 1);
    apply(expenseData.owed, -1);
    apply(settlementData.paid, 1);
    apply(settlementData.received, -1);

    return balances;
};

const getSettlementLimit = (balances, fromEmail, toEmail) =>
    Math.min(
        Math.max(0, -(balances.get(normalizeEmail(fromEmail)) || 0)),
        Math.max(0, balances.get(normalizeEmail(toEmail)) || 0)
    );

module.exports = {
    buildGroupBalances,
    getGroupBalances,
    getSettlementLimit,
};
