const mongoose = require('mongoose');
const Group = require('../model/group');
const GroupExpense = require('../model/groupExpense');
const GroupSettlement = require('../model/groupSettlement');
const {
    canManageGroup,
    canManageMemberRoles,
    getGroupMembers,
    getGroupRole,
    isPrivileged,
    normalizeEmail,
    syncGroupMembers,
} = require('../services/groupAccess');

const MAX_PAGE_SIZE = 50;
const pageNumber = (value, fallback) =>
    Math.max(1, Number.parseInt(value, 10) || fallback);

const loadGroup = async (groupId, user) => {
    if (!mongoose.Types.ObjectId.isValid(groupId)) return null;
    const group = await Group.findById(groupId);
    if (!group) return null;
    const email = normalizeEmail(user.email);
    const isMember = Boolean(getGroupRole(group, email));
    if (!isMember && !isPrivileged(user)) return null;
    return group;
};

const groupController = {
    create: async (request, response) => {
        try {
            const { name, description, membersEmail = [], thumbnail } =
                request.body;
            if (
                typeof name !== 'string' ||
                name.trim().length < 3 ||
                name.trim().length > 100
            ) {
                return response.status(400).json({
                    message: 'Group name must be between 3 and 100 characters',
                });
            }
            if (
                description !== undefined &&
                (typeof description !== 'string' ||
                    description.trim().length > 500)
            ) {
                return response.status(400).json({
                    message: 'Description cannot exceed 500 characters',
                });
            }
            if (!Array.isArray(membersEmail)) {
                return response.status(400).json({
                    message: 'Members must be provided as an email list',
                });
            }
            const normalizedMembers = membersEmail.map(normalizeEmail);
            if (
                normalizedMembers.some(
                    (email) =>
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                )
            ) {
                return response.status(400).json({
                    message: 'Every group member must have a valid email address',
                });
            }

            const email = normalizeEmail(request.user.email);
            const group = await Group.create({
                name: name.trim(),
                description: description?.trim() || '',
                adminEmail: email,
                membersEmail: [...new Set([email, ...normalizedMembers])],
                memberRoles: [...new Set([email, ...normalizedMembers])].map(
                    (memberEmail) => ({
                        email: memberEmail,
                        role: 'user',
                    })
                ),
                thumbnail:
                    typeof thumbnail === 'string'
                        ? thumbnail.trim().slice(0, 500)
                        : '',
            });
            return response.status(201).json({
                message: 'Group created successfully',
                groupId: group._id,
                group,
            });
        } catch (error) {
            console.error('Unable to create group:', error);
            return response.status(500).json({ message: 'Unable to create group' });
        }
    },

    update: async (request, response) => {
        try {
            const groupId = request.body.groupId || request.body._id;
            const group = await loadGroup(groupId, request.user);
            if (!group) {
                return response.status(404).json({ message: 'Group not found' });
            }
            if (!canManageGroup(group, request.user)) {
                return response.status(403).json({
                    message: 'Only this group owner, a manager, or an admin can update it',
                });
            }
            if (request.body.name !== undefined) {
                if (
                    typeof request.body.name !== 'string' ||
                    request.body.name.trim().length < 3 ||
                    request.body.name.trim().length > 100
                ) {
                    return response.status(400).json({
                        message: 'Group name must be between 3 and 100 characters',
                    });
                }
                group.name = request.body.name.trim();
            }
            if (request.body.description !== undefined) {
                group.description = String(request.body.description)
                    .trim()
                    .slice(0, 500);
            }
            if (request.body.thumbnail !== undefined) {
                group.thumbnail = String(request.body.thumbnail)
                    .trim()
                    .slice(0, 500);
            }
            await group.save();
            return response.json({ group });
        } catch (error) {
            console.error('Unable to update group:', error);
            return response.status(500).json({ message: 'Unable to update group' });
        }
    },

    delete: async (request, response) => {
        try {
            const group = await loadGroup(request.params.groupId, request.user);
            if (!group) {
                return response.status(404).json({ message: 'Group not found' });
            }
            if (await GroupExpense.exists({ groupId: group._id })) {
                return response.status(409).json({
                    message: 'Groups with expense history cannot be deleted',
                });
            }
            if (await GroupSettlement.exists({ groupId: group._id })) {
                return response.status(409).json({
                    message: 'Groups with settlement history cannot be deleted',
                });
            }
            await Group.deleteOne({ _id: group._id });
            return response.json({ message: 'Group deleted' });
        } catch (error) {
            console.error('Unable to delete group:', error);
            return response.status(500).json({ message: 'Unable to delete group' });
        }
    },

    addMembers: async (request, response) => {
        try {
            const { groupId, emails } = request.body;
            const role = request.body.role || 'user';
            const group = await loadGroup(groupId, request.user);
            if (!group) {
                return response.status(404).json({ message: 'Group not found' });
            }
            if (!canManageGroup(group, request.user)) {
                return response.status(403).json({
                    message: 'Only the group owner, a manager, or an admin can invite members',
                });
            }
            if (!['manager', 'user', 'viewer'].includes(role)) {
                return response.status(400).json({
                    message: 'Role must be manager, user, or viewer',
                });
            }
            if (
                role !== 'user' &&
                !canManageMemberRoles(group, request.user)
            ) {
                return response.status(403).json({
                    message: 'Only the group admin can assign member roles',
                });
            }
            if (
                !Array.isArray(emails) ||
                emails.length === 0 ||
                emails.length > 50
            ) {
                return response.status(400).json({
                    message: 'Provide between 1 and 50 email addresses',
                });
            }
            const normalized = emails.map(normalizeEmail);
            if (
                normalized.some(
                    (email) =>
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                )
            ) {
                return response.status(400).json({
                    message: 'Every group member must have a valid email address',
                });
            }
            const existingMembers = new Set(
                group.membersEmail.map(normalizeEmail)
            );
            group.membersEmail = [
                ...new Set([
                    ...group.membersEmail.map(normalizeEmail),
                    ...normalized,
                ]),
            ];
            syncGroupMembers(group);
            for (const email of normalized) {
                if (existingMembers.has(email)) continue;
                const member = group.memberRoles.find(
                    (entry) => normalizeEmail(entry.email) === email
                );
                if (member) {
                    member.role = role;
                }
            }
            await group.save();
            return response.json({
                group: {
                    ...group.toObject(),
                    members: getGroupMembers(group),
                },
            });
        } catch (error) {
            console.error('Unable to add group members:', error);
            return response.status(500).json({ message: 'Unable to add members' });
        }
    },

    removeMembers: async (request, response) => {
        try {
            const { groupId, emails } = request.body;
            const group = await loadGroup(groupId, request.user);
            if (!group) {
                return response.status(404).json({ message: 'Group not found' });
            }
            if (!canManageGroup(group, request.user)) {
                return response.status(403).json({
                    message: 'Only the group owner, a manager, or an admin can remove members',
                });
            }
            if (!Array.isArray(emails) || emails.length === 0) {
                return response.status(400).json({
                    message: 'Provide at least one member email',
                });
            }
            const normalized = emails.map(normalizeEmail);
            if (normalized.includes(normalizeEmail(group.adminEmail))) {
                return response.status(400).json({
                    message: 'The group owner cannot be removed',
                });
            }
            const hasFinancialHistory =
                (await GroupExpense.exists({ groupId: group._id })) ||
                (await GroupSettlement.exists({ groupId: group._id }));
            if (hasFinancialHistory) {
                return response.status(409).json({
                    message: 'Members cannot be removed after group financial activity has started',
                });
            }
            group.membersEmail = group.membersEmail.filter(
                (email) => !normalized.includes(normalizeEmail(email))
            );
            group.memberRoles = group.memberRoles.filter(
                (member) => !normalized.includes(normalizeEmail(member.email))
            );
            syncGroupMembers(group);
            await group.save();
            return response.json({ group });
        } catch (error) {
            console.error('Unable to remove group members:', error);
            return response.status(500).json({ message: 'Unable to remove members' });
        }
    },

    getGroupsByUser: async (request, response) => {
        try {
            const page = pageNumber(request.query.page, 1);
            const limit = Math.min(
                MAX_PAGE_SIZE,
                pageNumber(request.query.limit, 10)
            );
            const sortOptions =
                request.query.sortBy === 'oldest'
                    ? { createdAt: 1, _id: 1 }
                    : { createdAt: -1, _id: -1 };
            const filter = isPrivileged(request.user)
                ? {}
                : {
                      $or: [
                          {
                              membersEmail: normalizeEmail(
                                  request.user.email
                              ),
                          },
                          {
                              $expr: {
                                  $in: [
                                      normalizeEmail(request.user.email),
                                      {
                                          $map: {
                                              input: {
                                                  $ifNull: [
                                                      '$membersEmail',
                                                      [],
                                                  ],
                                              },
                                              as: 'memberEmail',
                                              in: {
                                                  $toLower: '$$memberEmail',
                                              },
                                          },
                                      },
                                  ],
                              },
                          },
                      ],
                  };
            const [groups, totalItems] = await Promise.all([
                Group.find(filter)
                    .sort(sortOptions)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                Group.countDocuments(filter),
            ]);
            return response.json({
                groups: groups.map((group) => ({
                    ...group,
                    members: getGroupMembers(group),
                    currentMemberRole:
                        getGroupRole(group, request.user.email) || 'admin',
                })),
                pagination: {
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                },
            });
        } catch (error) {
            console.error('Unable to fetch groups:', error);
            return response.status(500).json({ message: 'Unable to fetch groups' });
        }
    },

    getAudit: async (request, response) => {
        try {
            const group = await loadGroup(request.params.groupId, request.user);
            if (!group) {
                return response.status(404).json({ message: 'Group not found' });
            }
            const [settlements, last] = await Promise.all([
                GroupSettlement.find({ groupId: group._id })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean(),
                GroupSettlement.findOne({ groupId: group._id })
                    .sort({ createdAt: -1 })
                    .select('createdAt')
                    .lean(),
            ]);
            return response.json({
                settlements,
                lastSettled: last?.createdAt || null,
            });
        } catch (error) {
            console.error('Unable to fetch group audit:', error);
            return response.status(500).json({ message: 'Unable to fetch group audit' });
        }
    },

    updateMemberRole: async (request, response) => {
        try {
            const { groupId, email, role } = request.body;
            const group = await loadGroup(groupId, request.user);
            if (!group) {
                return response.status(404).json({ message: 'Group not found' });
            }
            if (!canManageMemberRoles(group, request.user)) {
                return response.status(403).json({
                    message: 'Only the group admin can assign member roles',
                });
            }

            const normalizedEmail = normalizeEmail(email);
            if (!['manager', 'user', 'viewer'].includes(role)) {
                return response.status(400).json({
                    message: 'Role must be manager, user, or viewer',
                });
            }
            if (
                normalizedEmail === normalizeEmail(group.adminEmail) ||
                !group.membersEmail.some(
                    (memberEmail) =>
                        normalizeEmail(memberEmail) === normalizedEmail
                )
            ) {
                return response.status(400).json({
                    message: 'Choose a group member other than the group admin',
                });
            }

            syncGroupMembers(group);
            const member = group.memberRoles.find(
                (entry) => normalizeEmail(entry.email) === normalizedEmail
            );
            if (!member) {
                return response.status(404).json({ message: 'Group member not found' });
            }
            member.role = role;
            await group.save();
            return response.json({
                group: {
                    ...group.toObject(),
                    members: getGroupMembers(group),
                    currentMemberRole:
                        getGroupRole(group, request.user.email) || 'admin',
                },
            });
        } catch (error) {
            console.error('Unable to update group member role:', error);
            return response.status(500).json({
                message: 'Unable to update member role',
            });
        }
    },
};

module.exports = groupController;
