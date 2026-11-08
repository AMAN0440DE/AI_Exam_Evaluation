const { USER_ROLES } = require("../utility/userRoles");
const generateTemporaryPassword = require("../utility/generateTempPass");
const emailService = require("../services/emailService");
const rbacDao = require("../dao/rbacDao");
const bcrypt=require('bcryptjs');
const rbacController = {
    create: async (request, response) => {
        try {
            const adminUser = request.user;
            const { name, email, role } = request.body;

            if (!USER_ROLES.includes(role)) {
                return response.status(400).json({
                    message: 'Invalid role'
                });
            }

            const tempPassword = generateTemporaryPassword(8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);
            if (
                typeof email !== 'string' ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
                typeof name !== 'string' ||
                name.trim().length < 2 ||
                name.trim().length > 100
            ) {
                return response.status(400).json({
                    message: 'A valid name and email address are required',
                });
            }

            const user = await rbacDao.create(
                email.trim().toLowerCase(),
                name.trim(),
                role,
                hashedPassword,
                adminUser.adminId
            );
            let emailDelivered = true;
            try {
                await emailService.send(
                    email.trim(),
                    'Temporary Password',
                    `Your temporary password is: ${tempPassword}`
                );
            } 
            catch (error) {
                emailDelivered = false;
                console.error('Unable to email the new user their temporary password:', error.message);
            }

            return response.status(200).json({
                message: emailDelivered
                    ? "User created and temporary password sent by email."
                    : "User created. Share the one-time temporary password securely.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                ...(emailDelivered ? {} : { temporaryPassword: tempPassword }),
            });
        } 
        catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Internal Server Error" });
        }
    },

    update: async (request, response) => {
        try {
            const { name, role, userId } = request.body;
            if (!USER_ROLES.includes(role)) {
                return response.status(400).json({ message: 'Invalid role' });
            }
            if (
                typeof name !== 'string' ||
                name.trim().length < 2 ||
                name.trim().length > 100
            ) {
                return response.status(400).json({ message: 'Invalid name' });
            }
            const user = await rbacDao.update(
                userId,
                request.user.adminId,
                name.trim(),
                role
            );
            if (!user) {
                return response.status(404).json({ message: 'User not found' });
            }
            return response.status(200).json({
                message: "User updated!",
                user,
            });
        } 
        catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Internal server error" });
        }
    },

    delete: async (request, response) => {
        try {
            const { userId } = request.body;
            const user = await rbacDao.delete(userId, request.user.adminId);
            if (!user) {
                return response.status(404).json({ message: 'User not found' });
            }

            return response.status(200).json({
                message: "User deleted!",
            });
        } 
        catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Internal server error" });
        }
    },

    getAllUsers: async (request, response) => {
        try {
            const adminId = request.user.adminId;
            const users = await rbacDao.getUsersByAdminId(adminId);
            
            return response.status(200).json({
                users,
            });
        } 
        catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Internal server error" });
        }
    },
};

module.exports = rbacController;
