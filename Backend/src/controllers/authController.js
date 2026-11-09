import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import Student from '../models/student.model.js';
import Teacher from '../models/teacher.model.js';
import { ROLES } from '../middlewares/authmiddleware.js';
import { OAuth2Client } from 'google-auth-library';

const googleOAuthClient = new OAuth2Client();

// Helper function to generate JWT token
const generateToken = (user, role) => {
    return jwt.sign(
      { id: user._id, 
        email: user.email, 
        role: role 
      }, 
      process.env.JWT_SECRET, 
      { 
        expiresIn: '24h' 
      }
    );
};

// Student Registration
export const registerStudent = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, rollNumber, registrationID, ...otherData } = req.body;

  const requiredFields = ['email', 'password', 'firstName', 'lastName', 'rollNumber', 'registrationID'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  if (missingFields.length > 0) {
    throw ApiError.BadRequest(`Missing required fields: ${missingFields.join(', ')}`);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingStudent = await Student.findOne({ 
    $or: [
      { email: normalizedEmail },
      { rollNumber: rollNumber.toUpperCase() }, 
      { registrationID }
    ] 
  });
  if (existingStudent) {
    const conflictField = existingStudent.email === normalizedEmail ? 'email' : existingStudent.rollNumber === rollNumber.toUpperCase() ? 'rollNumber' : 'registrationID';
    throw ApiError.BadRequest(`${conflictField} already in use`);
  }

  const student = await Student.create({ 
    email: normalizedEmail,
    password, 
    firstName, 
    lastName, 
    rollNumber: rollNumber.toUpperCase(), 
    registrationID, 
    ...otherData 
  });
  const token = generateToken(student, ROLES.STUDENT);
  
  const studentResponse = student.toObject();
  delete studentResponse.password;
  
  return new ApiResponse(res).success(201, { 
    user: { ...studentResponse, role: ROLES.STUDENT }, 
    token 
  }, 'Student registration successful');
});

// Teacher Registration
export const registerTeacher = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, employeeID, ...otherData } = req.body;
  if (!email || !password || !firstName || !lastName || !employeeID) {
    throw ApiError.BadRequest('All required fields must be provided');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingTeacher = await Teacher.findOne({ 
    $or: [
      { email: normalizedEmail },
      { employeeID: employeeID.toUpperCase() }
    ] 
  });
  if (existingTeacher) {
    throw ApiError.BadRequest('Email or Employee ID already in use');
  }

  const teacher = await Teacher.create({ 
    email: normalizedEmail,
    password, 
    firstName, 
    lastName, 
    employeeID: employeeID.toUpperCase(), 
    ...otherData 
  });
  const token = generateToken(teacher, ROLES.TEACHER);

  const teacherResponse = teacher.toObject();
  delete teacherResponse.password;
  
  return new ApiResponse(res).success(201, {
    user: { ...teacherResponse, role: ROLES.TEACHER }, 
    token 
  }, 'Teacher registration successful');
});

// Login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || !email.trim() || !password) {
    throw new ApiError(400, 'Email and password are required');
  } 

  const normalizedEmail = email.trim().toLowerCase();
  let user = await Student.findOne({ email: normalizedEmail }).select('+password');
  let userRole = 'student';

  if (!user) {
    user = await Teacher.findOne({ email: normalizedEmail }).select('+password');
    userRole = 'teacher';
  }

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user, userRole === 'student' ? ROLES.STUDENT : ROLES.TEACHER);
  const userObj = user.toObject();
  delete userObj.password;
  userObj.role = userRole;

  return new ApiResponse(res).success(200, { user: userObj, token: token }, 'Login successful');
});

// Google sign-in is limited to accounts that already exist in the selected role.
export const googleLogin = asyncHandler(async (req, res) => {
  const { credential, role } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new ApiError(503, 'Google sign-in is not configured on the server');
  }
  if (typeof credential !== 'string' || !credential.trim()) {
    throw ApiError.BadRequest('Google credential is required');
  }
  if (role !== undefined && ![ROLES.STUDENT, ROLES.TEACHER].includes(role)) {
    throw ApiError.BadRequest('Role must be student or teacher');
  }

  let ticket;
  try {
    ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
  } catch (error) {
    if (error?.response || error?.code) {
      throw new ApiError(503, 'Google token verification is temporarily unavailable');
    }
    throw ApiError.Unauthorized('Invalid Google credential');
  }

  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified !== true) {
    throw ApiError.Unauthorized('A verified Google email is required');
  }

  const email = payload.email.trim().toLowerCase();
  let user;
  let userRole;

  if (role === ROLES.STUDENT) {
    user = await Student.findOne({ email });
    userRole = ROLES.STUDENT;
  } else if (role === ROLES.TEACHER) {
    user = await Teacher.findOne({ email });
    userRole = ROLES.TEACHER;
  } else {
    const [student, teacher] = await Promise.all([
      Student.findOne({ email }),
      Teacher.findOne({ email }),
    ]);

    if (student && teacher) {
      throw new ApiError(409, 'This email has both student and teacher accounts. Sign in from the correct portal.');
    }

    user = student || teacher;
    userRole = student ? ROLES.STUDENT : ROLES.TEACHER;
  }

  if (!user) {
    throw ApiError.Unauthorized(`No existing ${role || 'student or teacher'} account matches this Google email. Create an account first.`);
  }

  const userResponse = user.toObject();
  delete userResponse.password;
  userResponse.role = userRole;

  return new ApiResponse(res).success(200, {
    user: userResponse,
    token: generateToken(user, userRole),
  }, 'Google sign-in successful');
});

// Get current user (TBC)
export const getMe = asyncHandler(async (req, res) => {
  const userWithRole = req.user;

  // TBC

  delete userWithRole.password;

  return new ApiResponse(res).success(200, { user: userWithRole }, 'User data retrieved successfully');
});
