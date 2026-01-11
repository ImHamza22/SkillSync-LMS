import express from 'express'
import {
  adminDashboardData,
  bootstrapAdminRole,
  getAllCoursesAdmin,
  getAllPurchasesAdmin,
  getAllUsersAdmin,
  setUserRoleAdmin,
  toggleCoursePublishAdmin,
  deleteCourseAdmin, // ✅ added
  getInstructorRequestsAdmin,
  approveInstructorRequestAdmin,
  rejectInstructorRequestAdmin,
} from '../controllers/adminController.js'
import { protectAdmin } from '../middlewares/authMiddleware.js'

const adminRouter = express.Router()

// Allows initial bootstrapping when the role isn't set yet.
const protectAdminCandidate = (req, res, next) => {
  const userId = req.auth.userId
  if (!userId || !process.env.ADMIN_USER_ID || userId !== process.env.ADMIN_USER_ID) {
    return res.json({ success: false, message: 'Unauthorized Access' })
  }
  next()
}

// One-time setup: assigns Clerk publicMetadata.role = 'admin' to ADMIN_USER_ID
adminRouter.get('/bootstrap', protectAdminCandidate, bootstrapAdminRole)

// Dashboard
adminRouter.get('/dashboard', protectAdmin, adminDashboardData)

// Users
adminRouter.get('/users', protectAdmin, getAllUsersAdmin)
adminRouter.post('/users/set-role', protectAdmin, setUserRoleAdmin)

// Courses
adminRouter.get('/courses', protectAdmin, getAllCoursesAdmin)
adminRouter.post('/courses/toggle-publish', protectAdmin, toggleCoursePublishAdmin)

// ✅ Admin hard delete course (no restrictions)
adminRouter.delete('/courses/:courseId', protectAdmin, deleteCourseAdmin)

// Purchases
adminRouter.get('/purchases', protectAdmin, getAllPurchasesAdmin)

// Instructor requests (approval-based instructor onboarding)
adminRouter.get('/instructor-requests', protectAdmin, getInstructorRequestsAdmin)
adminRouter.post('/instructor-requests/:requestId/approve', protectAdmin, approveInstructorRequestAdmin)
adminRouter.post('/instructor-requests/:requestId/reject', protectAdmin, rejectInstructorRequestAdmin)

export default adminRouter
