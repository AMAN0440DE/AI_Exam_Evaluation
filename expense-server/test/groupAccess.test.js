const test = require('node:test');
const assert = require('node:assert/strict');
const {
    canManageGroup,
    canManageMemberRoles,
    getGroupMembers,
    getGroupRole,
    isPrivileged,
} = require('../src/services/groupAccess');

const group = {
    adminEmail: 'owner@example.test',
    membersEmail: [
        'owner@example.test',
        'member@example.test',
        'manager@example.test',
        'viewer@example.test',
    ],
    memberRoles: [
        { email: 'member@example.test', role: 'user' },
        { email: 'manager@example.test', role: 'manager' },
        { email: 'viewer@example.test', role: 'viewer' },
    ],
};

test('group owner and platform admin are group admins', () => {
    assert.equal(getGroupRole(group, 'OWNER@example.test'), 'admin');
    assert.equal(getGroupRole(group, 'platform@example.test'), null);
    assert.equal(isPrivileged({ role: 'admin' }), true);
    assert.equal(isPrivileged({ role: 'manager' }), false);
});

test('existing members receive their group role with a user fallback', () => {
    assert.equal(getGroupRole(group, 'MEMBER@example.test'), 'user');
    assert.equal(getGroupRole(group, 'manager@example.test'), 'manager');
    assert.equal(getGroupRole(group, 'viewer@example.test'), 'viewer');
    assert.equal(getGroupRole(group, 'outsider@example.test'), null);
    assert.equal(
        getGroupRole(
            { ...group, memberRoles: [{ email: 'removed@example.test', role: 'manager' }] },
            'removed@example.test'
        ),
        null
    );
});

test('only group admins assign roles while group managers can manage the group', () => {
    assert.equal(canManageGroup(group, { email: 'manager@example.test' }), true);
    assert.equal(canManageGroup(group, { email: 'member@example.test' }), false);
    assert.equal(
        canManageMemberRoles(group, { email: 'owner@example.test' }),
        true
    );
    assert.equal(
        canManageMemberRoles(group, { email: 'manager@example.test' }),
        false
    );
    assert.equal(
        canManageMemberRoles(group, { email: 'platform@example.test', role: 'admin' }),
        true
    );
});

test('member list always includes the group owner and normalizes addresses', () => {
    assert.deepEqual(
        getGroupMembers(group).map(({ email, role }) => [email, role]),
        [
            ['owner@example.test', 'admin'],
            ['member@example.test', 'user'],
            ['manager@example.test', 'manager'],
            ['viewer@example.test', 'viewer'],
        ]
    );
});
