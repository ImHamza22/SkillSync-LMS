import express from 'express'
import {
  addUserRating,
  getUserCourseProgress,
  getUserData,
  purchaseCourse,
  updateUserCourseProgress,
  userEnrolledCourses,
  requestInstructorRole,
  getMyInstructorRequest,
} from '../controllers/userController.js';

import { protectAuth } from '../middlewares/authMiddleware.js';


const userRouter = express.Router()

// Get user Data
userRouter.get('/data', protectAuth, getUserData)
userRouter.post('/purchase', protectAuth, purchaseCourse)
userRouter.get('/enrolled-courses', protectAuth, userEnrolledCourses)
userRouter.post('/update-course-progress', protectAuth, updateUserCourseProgress)
userRouter.post('/get-course-progress', protectAuth, getUserCourseProgress)
userRouter.post('/add-rating', protectAuth, addUserRating)

// Instructor onboarding (approval-based)
userRouter.post('/instructor-request', protectAuth, requestInstructorRole)
userRouter.get('/instructor-request', protectAuth, getMyInstructorRequest)

export default userRouter;
