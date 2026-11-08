const GroupExpense = require('../model/groupExpense');
const GroupSettlement = require('../model/groupSettlement');
const PersonalTransaction = require('../model/personalTransaction');
const User = require('../model/users');
const { allocateSplit, toPaise } = require('../services/splitCalculator');
const {
    getGroupBalances,
    getSettlementLimit,
} = require('../services/groupBalances');
const {
    isPrivileged,
    getGroupMembers,
    loadAccessibleGroup,
    normalizeEmail,
} = require('../services/groupAccess');

const PAGE_LIMIT = 50;
const pageOptions = (query) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(
        PAGE_LIMIT,
        Math.max(1, Number.parseInt(query.limit, 10) || 10)
    );
    return { page, limit, skip: (page - 1) * limit };
};

const loadGroupOrRespond = async (request, response) => {
    const access = await loadAccessibleGroup(
        request.params.groupId,
        request.user
    );
    if (!access.group) {
        response.status(access.status).json({ message: access.message });
        return null;
    }
    return access;
};

const expenseController = {
    getGroup: async (request, response) => {
        try {
            const access = await loadGroupOrRespond(request, response);
            if (!access) return;
            const groupMembers = getGroupMembers(access.group);
            const memberUsers = await User.find({
                email: {
                    $in: groupMembers.map((member) => member.email),
                },
            })
                .select('name email')
                .lean();
            const usersByEmail = new Map(
                memberUsers.map((member) => [
                    normalizeEmail(member.email),
                    member.name,
                ])
            );
            return response.json({
                group: {
                    ...access.group.toObject(),
                    members: groupMembers.map((member) => ({
                        ...member,
                        name: usersByEmail.get(member.email) || member.email,
                    })),
                    currentMemberRole: access.memberRole,
                },
            });
        } catch (error) {
            console.error('Unable to fetch group:', error);
            return response.status(500).json({ message: 'Unable to fetch group' });
        }
    },

    getExpenses: async (request, response) => {
        try {
            const access = await loadGroupOrRespond(request, response);
            if (!access) return;
            const { page, limit, skip } = pageOptions(request.query);
            const [expenses, totalItems] = await Promise.all([
                GroupExpense.find({ groupId: access.group._id })
                    .sort({ occurredAt: -1, _id: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                GroupExpense.countDocuments({ groupId: access.group._id }),
            ]);
            return response.json({
                expenses,
                pagination: {
                    currentPage: page,
                    itemsPerPage: limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                },
            });
        } catch (error) {
            console.error('Unable to fetch group expenses:', error);
            return response.status(500).json({ message: 'Unable to fetch expenses' });
        }
    },

    createExpense: async (request, response) => {
        try {
            const access = await loadGroupOrRespond(request, response);
            if (!access) return;
            if (
                (!access.isMember && !isPrivileged(request.user)) ||
                access.memberRole === 'viewer'
            ) {
                return response.status(403).json({
                    message: 'Only active group members can add expenses',
                });
            }

            const {
                title,
                description,
                amount,
                paidBy,
                splitType = 'equal',
                participants,
                occurredAt,
            } = request.body;
            if (
                typeof title !== 'string' ||
                title.trim().length < 2 ||
                title.trim().length > 120
            ) {
                return response.status(400).json({
                    message: 'Expense title must be between 2 and 120 characters',
                });
            }

            const totalPaise = toPaise(amount);
            const members = access.group.membersEmail.map(normalizeEmail);
            const payerEmail = normalizeEmail(paidBy || request.user.email);
            if (!members.includes(payerEmail)) {
                return response.status(400).json({
                    message: 'The payer must be a member of this group',
                });
            }

            const shares = allocateSplit({
                amount: totalPaise / 100,
                splitType,
                participants:
                    participants || members.map((email) => ({ email })),
                members,
            });
            const date = occurredAt ? new Date(occurredAt) : new Date();
            if (Number.isNaN(date.getTime())) {
                return response.status(400).json({ message: 'Invalid expense date' });
            }

            const expense = await GroupExpense.create({
                groupId: access.group._id,
                title: title.trim(),
                description:
                    typeof description === 'string'
                        ? description.trim().slice(0, 500)
                        : '',
                amount: totalPaise / 100,
                paidBy: payerEmail,
                splitType,
                shares,
                createdBy: request.user.id,
                occurredAt: date,
            });

            try {
                const participantUsers = await User.find({
                    email: { $in: shares.map((share) => share.email) },
                })
                    .select('_id email')
                    .lean();
                const usersByEmail = new Map(
                    participantUsers.map((user) => [
                        normalizeEmail(user.email),
                        user._id,
                    ])
                );
                const personalEntries = shares
                    .filter(
                        (share) =>
                            share.amount > 0 && usersByEmail.has(share.email)
                    )
                    .map((share) => ({
                        userId: usersByEmail.get(share.email),
                        type: 'expense',
                        amount: share.amount,
                        category: 'Group expense',
                        description: `${title.trim()} (${access.group.name})`,
                        occurredAt: date,
                        sourceGroupId: access.group._id,
                        sourceExpenseId: expense._id,
                    }));
                if (personalEntries.length) {
                    await PersonalTransaction.bulkWrite(
                        personalEntries.map((entry) => ({
                            updateOne: {
                                filter: {
                                    userId: entry.userId,
                                    sourceExpenseId: expense._id,
                                },
                                update: {
                                    $setOnInsert: {
                                        ...entry,
                                    },
                                },
                                upsert: true,
                            },
                        })),
                        { ordered: false }
                    );
                }
            } catch (syncError) {
                await Promise.all([
                    GroupExpense.deleteOne({ _id: expense._id }),
                    PersonalTransaction.deleteMany({
                        sourceExpenseId: expense._id,
                    }),
                ]);
                throw syncError;
            }

            return response.status(201).json({
                message: 'Expense added',
                expense,
            });
        } catch (error) {
            if (error instanceof Error && !error.name.startsWith('Mongo')) {
                return response.status(400).json({ message: error.message });
            }
            console.error('Unable to create group expense:', error);
            return response.status(500).json({ message: 'Unable to create expense' });
        }
    },

    getBalances: async (request, response) => {
        try {
            const access = await loadGroupOrRespond(request, response);
            if (!access) return;
            const balances = await getGroupBalances(
                access.group._id,
                access.group.membersEmail
            );

            return response.json({
                balances: [...balances.entries()].map(([email, paise]) => ({
                    email,
                    balance: paise / 100,
                })),
            });
        } catch (error) {
            console.error('Unable to calculate group balances:', error);
            return response.status(500).json({ message: 'Unable to fetch balances' });
        }
    },

    getSettlements: async (request, response) => {
        try {
            const access = await loadGroupOrRespond(request, response);
            if (!access) return;
            const { page, limit, skip } = pageOptions(request.query);
            const filter = { groupId: access.group._id };
            const [settlements, totalItems] = await Promise.all([
                GroupSettlement.find(filter)
                    .sort({ createdAt: -1, _id: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                GroupSettlement.countDocuments(filter),
            ]);
            return response.json({
                settlements,
                pagination: {
                    currentPage: page,
                    itemsPerPage: limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                },
            });
        } catch (error) {
            console.error('Unable to fetch settlements:', error);
            return response.status(500).json({
                message: 'Unable to fetch settlements',
            });
        }
    },

    createSettlement: async (request, response) => {
        try {
            const access = await loadGroupOrRespond(request, response);
            if (!access) return;
            if (
                (!access.isMember && !isPrivileged(request.user)) ||
                access.memberRole === 'viewer'
            ) {
                return response.status(403).json({
                    message: 'Only active group members can record settlements',
                });
            }

            const fromEmail = normalizeEmail(request.user.email);
            const toEmail = normalizeEmail(request.body.toEmail);
            const amountPaise = toPaise(request.body.amount);
            const members = access.group.membersEmail.map(normalizeEmail);
            if (
                !members.includes(toEmail) ||
                toEmail === fromEmail
            ) {
                return response.status(400).json({
                    message: 'Choose another member of this group to settle with',
                });
            }

            const groupId = access.group._id;
            const balances = await getGroupBalances(groupId, members);
            if (amountPaise > getSettlementLimit(balances, fromEmail, toEmail)) {
                return response.status(400).json({
                    message: 'Settlement exceeds the amount currently owed',
                });
            }

            const settlement = await GroupSettlement.create({
                groupId,
                fromEmail,
                toEmail,
                amount: amountPaise / 100,
                note:
                    typeof request.body.note === 'string'
                        ? request.body.note.trim().slice(0, 250)
                        : '',
                createdBy: request.user.id,
            });
            return response.status(201).json({
                message: 'Settlement recorded',
                settlement,
            });
        } catch (error) {
            if (error instanceof Error && !error.name.startsWith('Mongo')) {
                return response.status(400).json({ message: error.message });
            }
            console.error('Unable to record settlement:', error);
            return response.status(500).json({
                message: 'Unable to record settlement',
            });
        }
    },
};

module.exports = expenseController;
