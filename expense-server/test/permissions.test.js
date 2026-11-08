const test = require('node:test');
const assert = require('node:assert/strict');
const permissions = require('../src/utility/permission');
const User = require('../src/model/users');
const { USER_ROLES } = require('../src/utility/userRoles');

test('all supported roles have an explicit permission set', () => {
    for (const role of USER_ROLES) {
        assert.ok(Array.isArray(permissions[role]), `${role} permissions`);
    }
});

test('standard users can manage personal finance and add group expenses', () => {
    assert.ok(permissions.user.includes('personal:create'));
    assert.ok(permissions.user.includes('personal:view'));
    assert.ok(permissions.user.includes('expense:create'));
    assert.ok(permissions.user.includes('settlement:create'));
    assert.ok(!permissions.user.includes('user:delete'));
});

test('viewers remain read-only', () => {
    assert.ok(permissions.viewer.includes('group:view'));
    assert.ok(permissions.viewer.includes('personal:view'));
    assert.ok(!permissions.viewer.includes('group:create'));
    assert.ok(!permissions.viewer.includes('expense:create'));
    assert.ok(!permissions.viewer.includes('personal:create'));
});

test('billing permissions and user fields are removed', () => {
    for (const role of USER_ROLES) {
        assert.ok(!permissions[role].includes('payment:create'));
    }
    assert.equal(User.schema.path('credits'), undefined);
    assert.equal(User.schema.path('subscription'), undefined);
    assert.equal(User.schema.path('processedPaymentIds'), undefined);
});
