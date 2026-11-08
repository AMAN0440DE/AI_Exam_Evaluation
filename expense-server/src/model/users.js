const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    googleId: { type: String, required: false },
    role: { type: String, required: true, default: 'user', enum: ['admin', 'manager', 'user', 'viewer'] },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
});

module.exports = mongoose.model('User', userSchema);