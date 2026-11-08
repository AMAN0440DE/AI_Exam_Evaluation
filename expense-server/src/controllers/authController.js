const userDao = require('../dao/userDao');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { validationResult } = require('express-validator');
const { USER_ROLE } = require('../utility/userRoles');
const {
    createUserAndSyncHistory,
    syncPersonalHistory,
} = require('../services/personalFinanceSync');

const authController = {
    toPublicUser: (user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || USER_ROLE,
        adminId: user.adminId || user._id,
    }),

    login: async (request, response) => {
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response.status(400).json({
                errors: errors.array()
            });
        }
        
        const { email, password } = request.body;

        const user = await userDao.findByEmail(email);
        if (!user || !user.password) {
            return response.status(401).json({
                message: 'Invalid email or password'
            });
        }

        user.role = user.role || USER_ROLE;
        user.adminId = user.adminId ? user.adminId : user._id;

        const isPasswordMatched = await bcrypt.compare(password, user?.password);
        if (user && isPasswordMatched) {
            try {
                await syncPersonalHistory(user);
            } catch (error) {
                console.error('Unable to sync group expense history:', error);
            }
            user.role = user.role || USER_ROLE;
            user.adminId = user.adminId ? user.adminId : user._id;
            const token = jwt.sign({
                name: user.name,
                email: user.email,
                id: user._id,
                role: user.role || USER_ROLE,
                adminId: user.adminId ? user.adminId : user._id,
            }, 
            process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            response.cookie('jwtToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            });
            return response.status(200).json({
                message: 'User authenticated',
                user: authController.toPublicUser(user)
            });
        } else {
            return response.status(400).json({
                message: 'Invalid email or password'
            });
        }
    },

    register: async (request, response) => {
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response.status(400).json({
                message: errors.array()[0].msg,
                errors: errors.array()
            });
        }

        const { name, email, password } = request.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        try {
            const user = await createUserAndSyncHistory({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                role: USER_ROLE
            });
            return response.status(201).json({
                message: 'User registered',
                user: authController.toPublicUser(user)
            });
        } catch (error) {
            if (error.code === 'USER_EXIST' || error.code === 11000) {
                return response.status(409).json({
                    message: 'An account with this email already exists.'
                });
            }
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    isUserLoggedIn: async (request, response) => {
        try {
            const token = request.cookies?.jwtToken;

            if (!token) {
                return response.status(401).json({
                    message: 'Unauthorized access'
                });
            }

            jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
                if (error) {
                    return response.status(401).json({
                        message: 'Invalid token'
                    });
                } else {
                    response.json({
                        user: user
                    });
                }

            });
        } catch (error) {
            console.log(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    logout: async (request, response) => {
        try {
            response.clearCookie('jwtToken');
            response.json({ message: 'Logout successfull' });
        } catch (error) {
            console.log(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },

    googleSso: async (request, response) => {
        try {
            const { idToken } = request.body;
            if (!idToken) {
                return response.status(401).json({ message: 'Invalid request' });
            }
            if (
                !process.env.GOOGLE_CLIENT_ID ||
                process.env.GOOGLE_CLIENT_ID.startsWith('your-') ||
                process.env.GOOGLE_CLIENT_ID.startsWith('replace-')
            ) {
                return response.status(503).json({
                    message: 'Google sign-in is not configured with a valid OAuth client ID.'
                });
            }

            const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            let payload;
            try {
                const googleResponse = await googleClient.verifyIdToken({
                    idToken: idToken,
                    audience: process.env.GOOGLE_CLIENT_ID
                });
                payload = googleResponse.getPayload();
            } catch (error) {
                console.log(error);
                return response.status(401).json({
                    message: 'Google token could not be verified. Check the OAuth client ID and authorized origin.'
                });
            }
            if (!payload?.email_verified || !payload.email) {
                return response.status(401).json({
                    message: 'Google account email is not verified.'
                });
            }
            const { sub: googleId, name, email } = payload;

            let user = await userDao.findByEmail(email);
            if (!user) {
                user = await createUserAndSyncHistory({
                    name: name,
                    email: email,
                    googleId: googleId,
                    role: USER_ROLE
                });
            }
            await syncPersonalHistory(user);

            const token = jwt.sign({
                name: user.name,
                email: user.email,
                googleId: user.googleId,
                id: user._id,
                role: user.role || USER_ROLE,
                adminId: user.adminId ? user.adminId : user._id,
            }, process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            response.cookie('jwtToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            });
            return response.status(200).json({
                message: 'User authenticated',
                user: authController.toPublicUser(user)
            });

        } catch (error) {
            console.log(error);
            return response.status(500).json({
                message: 'Internal server error'
            });
        }
    },
};

module.exports = authController;