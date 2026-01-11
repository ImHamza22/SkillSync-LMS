import express from 'express'
import {
  addCourse,
  instructorDashboardData,
  getInstructorCourses,
  getEnrolledStudentsData,
  getInstructorCourseById,
  updateCourse,
  deleteCourse,
} from '../controllers/instructorController.js';
import upload from '../configs/multer.js';
import { protectInstructor } from '../middlewares/authMiddleware.js';

const instructorRouter = express.Router()

// IMPORTANT: use upload.any() because we send: image + video_<lectureId> fields
// Put protectInstructor BEFORE upload to avoid uploading big files for unauthorized users
instructorRouter.post('/add-course', protectInstructor, upload.any(), addCourse)

instructorRouter.get('/courses', protectInstructor, getInstructorCourses)

instructorRouter.get('/course/:id', protectInstructor, getInstructorCourseById)

instructorRouter.put('/course/:id', protectInstructor, upload.any(), updateCourse)

instructorRouter.delete('/course/:id', protectInstructor, deleteCourse)

instructorRouter.get('/dashboard', protectInstructor, instructorDashboardData)

instructorRouter.get('/enrolled-students', protectInstructor, getEnrolledStudentsData)

export default instructorRouter;
