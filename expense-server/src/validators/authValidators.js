const { body } = require('express-validator');

const loginValidators = [
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Provided email is not valid")
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 3 }).withMessage("Password must be atleast 3 character long")
];

const registerValidators = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Provided email is not valid')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

module.exports = {
    loginValidators,
    registerValidators
};