import express from 'express';
import { registerStudent, registerTeacher, login, googleLogin, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authmiddleware.js';

const router = express.Router();

// Public routes
router.post('/register/student', registerStudent);
router.post('/register/teacher', registerTeacher);
router.post('/login', login);
router.post('/google', googleLogin);

// Protected routes
router.get('/me', verifyToken, getMe);

export default router;
