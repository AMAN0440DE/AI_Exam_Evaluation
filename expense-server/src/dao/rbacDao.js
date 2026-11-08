const User = require('../model/users');

const rbacDao = {

    create: async (email, name, role, password, adminId) => {
        return await User.create({
            email: email,
            password: password,
            name: name,
            role: role,
            adminId: adminId
        });

    },
    update: async (userId, adminId, name, role) => {
        return await User.findOneAndUpdate(
            { _id: userId, adminId },
            { name, role },
            { new: true, runValidators: true }
        ).select('name email role adminId');
    },

    delete: async (userId, adminId) => {
        return await User.findOneAndDelete({ _id: userId, adminId });
    },

    getUsersByAdminId: async (adminId) => {
        return await User.find({ adminId })
            .select("name email role adminId")
            .sort({ name: 1 });
    }
};
 module.exports = rbacDao;