const {
  ADMIN_ROLE,
  MANAGER_ROLE,
  USER_ROLE,
  VIEWER_ROLE,
} = require("./userRoles");

const personalPermissions = [
  "personal:view",
  "personal:create",
  "personal:update",
  "personal:delete",
];
const expensePermissions = ["expense:create", "settlement:create"];

const permissions = {
  [ADMIN_ROLE]: [
    "user:create",
    "user:update",
    "user:delete",
    "user:view",
    "group:create",
    "group:update",
    "group:delete",
    "group:view",
    ...expensePermissions,
    ...personalPermissions,
  ],
  [MANAGER_ROLE]: [
    "user:view",
    "group:create",
    "group:update",
    "group:view",
    ...expensePermissions,
    ...personalPermissions,
  ],
  [USER_ROLE]: [
    "group:create",
    "group:update",
    "group:view",
    ...expensePermissions,
    ...personalPermissions,
  ],
  [VIEWER_ROLE]: ["user:view", "group:view", "personal:view"],
};

module.exports = permissions;
