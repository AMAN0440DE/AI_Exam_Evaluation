const mongoose = require('mongoose');
const Group = require('../model/group');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isPrivileged = (user) =>
    user?.role === 'admin';

const getGroupRole = (group, email) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;
    if (normalizeEmail(group.adminEmail) === normalizedEmail) return 'admin';
    const isMember = group.membersEmail.some(
        (memberEmail) => normalizeEmail(memberEmail) === normalizedEmail
    );
    if (!isMember) return null;
    const memberRole = (group.memberRoles || []).find(
        (member) => normalizeEmail(member.email) === normalizedEmail
    );
    return memberRole?.role || 'user';
};

const getGroupMembers = (group) => {
    const emails = new Set([
        ...group.membersEmail.map(normalizeEmail),
        normalizeEmail(group.adminEmail),
    ]);
    return [...emails]
        .filter(Boolean)
        .map((email) => ({
            email,
            role: getGroupRole(group, email),
        }));
};

const syncGroupMembers = (group) => {
    const rolesByEmail = new Map(
        (group.memberRoles || []).map((member) => [
            normalizeEmail(member.email),
            member.role,
        ])
    );
    group.membersEmail = [
        ...new Set([
            ...group.membersEmail.map(normalizeEmail),
            normalizeEmail(group.adminEmail),
        ]),
    ].filter(Boolean);
    group.memberRoles = group.membersEmail.map((email) => ({
        email,
        role:
            normalizeEmail(email) === normalizeEmail(group.adminEmail)
                ? 'user'
                : rolesByEmail.get(email) || 'user',
    }));
};

const loadAccessibleGroup = async (groupId, user) => {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return { status: 404, message: 'Group not found' };
    }

    const group = await Group.findById(groupId);
    if (!group) {
        return { status: 404, message: 'Group not found' };
    }

    const email = normalizeEmail(user?.email);
    const isMember = Boolean(getGroupRole(group, email));
    if (!isMember && !isPrivileged(user)) {
        return { status: 404, message: 'Group not found' };
    }

    return {
        group,
        isMember,
        memberRole: getGroupRole(group, email) || 'admin',
        members: getGroupMembers(group),
    };
};

const canManageGroup = (group, user) =>
    isPrivileged(user) ||
    ['admin', 'manager'].includes(getGroupRole(group, user?.email));

const canManageMemberRoles = (group, user) =>
    isPrivileged(user) ||
    (getGroupRole(group, user?.email) === 'admin' &&
        normalizeEmail(group.adminEmail) === normalizeEmail(user?.email));

module.exports = {
    canManageGroup,
    canManageMemberRoles,
    getGroupMembers,
    getGroupRole,
    isPrivileged,
    loadAccessibleGroup,
    normalizeEmail,
    syncGroupMembers,
};
