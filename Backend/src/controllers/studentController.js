import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Exam from '../models/exam.model.js';
import Submission from '../models/submission.model.js';
import { calculateTotalMarks, gradeMultipleChoice } from '../utils/grading.js';

export const getStudentTimetable = asyncHandler(async (req, res) => {
    const student = req.user;
    const timetable = await Exam.find({
      department: student.department,
      year: student.year,
      semester: student.semester,
      section: student.section,
      endTime: { $gte: new Date() } 
  })
  .populate('createdBy', 'firstName lastName')
  .select('-questions -allowedRollNumbers -__v')
  .sort({ date: 1, startTime: 1 });

  if (timetable.length > 0) {
    const submissions = await Submission.find({
      student: student._id,
      exam: { $in: timetable.map(exam => exam._id) },
      status: { $in: ['submitted', 'evaluated', 'published'] },
    }).select('exam status');
    const submissionStatusByExam = new Map(
      submissions.map(submission => [submission.exam.toString(), submission.status])
    );

    timetable.forEach(exam => {
      const submissionStatus = submissionStatusByExam.get(exam._id.toString());
      exam.set('submissionStatus', submissionStatus || null, { strict: false });
      exam.set('isSubmitted', Boolean(submissionStatus && submissionStatus !== 'in_progress'), { strict: false });
    });
  }

  return new ApiResponse(res).success(200, timetable, 'Timetable fetched successfully.');
});

export const getTodaysExams = asyncHandler(async (req, res) => {
  const student = req.user;

  const rawTimezoneOffset = req.query.timezoneOffset ?? '0';
  if (typeof rawTimezoneOffset !== 'string' || !/^-?\d+$/.test(rawTimezoneOffset)) {
    throw ApiError.BadRequest('Invalid timezone offset');
  }
  const timezoneOffset = Number(rawTimezoneOffset);
  if (Math.abs(timezoneOffset) > 14 * 60) {
    throw ApiError.BadRequest('Invalid timezone offset');
  }

  const nowInStudentTimezone = new Date(Date.now() - timezoneOffset * 60_000);
  const startOfDay = new Date(Date.UTC(
    nowInStudentTimezone.getUTCFullYear(),
    nowInStudentTimezone.getUTCMonth(),
    nowInStudentTimezone.getUTCDate()
  ) + timezoneOffset * 60_000);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

  const exams = await Exam.find({
    department: student.department,
    year: student.year,
    semester: student.semester,
    section: student.section,
    startTime: { $gte: startOfDay, $lte: endOfDay },
    $or: [
      { allowedRollNumbers: { $size: 0 } },
      { allowedRollNumbers: student.rollNumber }
    ]
  })
  .select('-questions -answerKey -createdBy -__v')
  .sort({ startTime: 1 })
  .lean();

  if (exams.length > 0) {
    const examIds = exams.map(exam => exam._id);

    const submissions = await Submission.find({
      student: student._id,
      exam: { $in: examIds }
    }).select('exam status');

    const submissionMap = new Map(submissions.map(sub => [sub.exam.toString(), sub.status]));

    exams.forEach(exam => {
      if (submissionMap.has(exam._id.toString()) && submissionMap.get(exam._id.toString()) !== 'in_progress') {
        exam.isSubmitted = true;
      } 
      else {
        exam.isSubmitted = false;
      }
    });
  }

  return new ApiResponse(res).success(200, exams, 'Today\'s exams fetched successfully');
});

export const startExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { accessCode } = req.body;
  const student = req.user;
  
  if (!accessCode) {
    throw new ApiError(400, 'Access code is required');
  }

  const exam = await Exam.findById(examId).populate('questions');
  if (!exam) {
    throw new ApiError(404, 'Exam not found');
  }

  const canAccess = await exam.canAccess(student, accessCode);
  if (!canAccess) {
    throw new ApiError(403, 'You do not have access to this exam');
  }

  const existingSubmission = await Submission.findOne({ 
    exam: examId, 
    student: student._id 
  }).populate({ path: 'exam', populate: { path: 'questions' } });
  if (existingSubmission) {
    if (existingSubmission.status !== 'in_progress') {
      throw new ApiError(400, 'You have already submitted this exam');
    }
    return new ApiResponse(res).success(200, existingSubmission, 'Continue your exam');
  }
  
  const submission = await Submission.create({
    exam: examId,
    student: student._id,
    answers: exam.questions.map(question => ({ question: question._id, response: '' }))
  });

  const populatedSubmission = await Submission.findById(submission._id)
    .populate({
        path: 'exam',
        populate: {
          path: 'questions'
        }
    });
  
  return new ApiResponse(res).success(201, populatedSubmission, 'Exam started successfully');
});

export const getSubmissionById = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const student = req.user;

  const submission = await Submission.findOne({ _id: submissionId, student: student._id })
    .populate({
        path: 'exam',
        populate: {
          path: 'questions'
        }
    });

  if (!submission) {
    throw new ApiError(404, 'Exam session not found or you are not authorized.');
  }

  if (submission.status !== 'in_progress') {
    throw new ApiError(400, 'This exam is no longer in progress.');
  }

  return new ApiResponse(res).success(200, submission, 'Exam session data retrieved successfully.');
});

export const submitExam = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { answers } = req.body;
  const student = req.user;
  if (!Array.isArray(answers)) {
    throw ApiError.BadRequest('Answers must be provided as an array.');
  }
  
  const submission = await Submission.findOne({ 
    _id: submissionId, 
    student: student._id, 
    status: 'in_progress' 
  });
  if (!submission) {
    throw new ApiError(404, 'Submission not found or already submitted');
  }
  
  const exam = await Exam.findById(submission.exam).populate('questions');
  if (!exam) {
    throw new ApiError(404, 'Exam not found.');
  }
  const currentTime = new Date();
  if (currentTime > exam.endTime) {
    throw new ApiError(400, 'Exam time has ended');
  }
  
  const answersByQuestion = new Map(
    answers
      .filter(answer => answer?.question)
      .map(answer => [answer.question.toString(), answer.response])
  );
  submission.answers = exam.questions.map(question => {
    const response = answersByQuestion.get(question._id.toString()) ?? '';
    if (question.type === 'MCQ') {
      const { marksAwarded } = gradeMultipleChoice(response, question.options || [], question.marks);
      return { question: question._id, response, marksAwarded };
    }

    const hasResponse = typeof response === 'string' && response.trim().length > 0;
    return {
      question: question._id,
      response,
      marksAwarded: hasResponse ? null : 0,
      feedback: hasResponse ? undefined : 'No answer provided.',
    };
  });
  submission.totalMarks = calculateTotalMarks(submission.answers);
  const fullyGraded = submission.answers.every(answer => Number.isFinite(answer.marksAwarded));
  submission.status = fullyGraded ? 'evaluated' : 'submitted';
  if (fullyGraded) {
    submission.evaluatedAt = currentTime;
  }
  submission.submittedAt = currentTime;
  await submission.save();
  
  return new ApiResponse(res).success(200, submission, 'Exam submitted successfully');
});

export const getExamResult = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const student = req.user;
    
    const submission = await Submission.findOne({ 
      _id: submissionId, 
      student: student._id, 
      status: { $in: ['evaluated', 'published'] } 
    })
    .populate('exam')
    .populate('evaluatedBy', 'firstName lastName');
    
    if (!submission) {
      throw new ApiError(404, 'Result not available yet');
    }
    
    return new ApiResponse(res).success(200, submission, 'Exam result fetched successfully');
});

export const getStudentResults = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const results = await Submission.find({ student: studentId, status: 'published' })
      .populate({
          path: 'exam',
          populate: [
              { path: 'createdBy', select: 'firstName lastName' },
              { path: 'questions', select: 'text type marks options' } 
          ]
      })
      .sort({ submittedAt: -1 });

  return new ApiResponse(res).success(200, results, 'Results fetched successfully.');
});
