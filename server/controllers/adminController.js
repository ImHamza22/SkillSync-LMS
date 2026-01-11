import Course from '../models/Course.js'
import { Purchase } from '../models/Purchase.js'
import User from '../models/User.js'
import { CourseProgress } from '../models/CourseProgress.js'
import InstructorRequest from '../models/InstructorRequest.js'
import { clerkClient } from '@clerk/express'

// One-time setup helper: sets Clerk publicMetadata.role = 'admin'
// Only callable by the user configured in ADMIN_USER_ID.
export const bootstrapAdminRole = async (req, res) => {
  try {
    const userId = req.auth.userId

    if (!process.env.ADMIN_USER_ID) {
      return res.json({ success: false, message: 'ADMIN_USER_ID is not configured on server.' })
    }

    if (userId !== process.env.ADMIN_USER_ID) {
      return res.json({ success: false, message: 'Unauthorized Access' })
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'admin' },
    })

    await User.findByIdAndUpdate(userId, { role: 'admin' })

    res.json({ success: true, message: 'Admin role bootstrapped successfully.' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const adminDashboardData = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      publishedCourses,
      unpublishedCourses,
      pendingPurchases,
      completedPurchases,
      totalCourseProgressDocs,
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Course.countDocuments({ isPublished: false }),
      Purchase.countDocuments({ status: 'pending' }),
      Purchase.find({ status: 'completed' }).select('amount'),
      CourseProgress.countDocuments(),
    ])

    const totalRevenue = completedPurchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    res.json({
      success: true,
      dashboardData: {
        totalUsers,
        totalCourses,
        publishedCourses,
        unpublishedCourses,
        pendingPurchases,
        completedPurchases: completedPurchases.length,
        totalRevenue,
        totalCourseProgressDocs,
      },
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find()
      .select('_id name email imageUrl role enrolledCourses createdAt')
      .sort({ createdAt: -1 })

    res.json({ success: true, users })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const setUserRoleAdmin = async (req, res) => {
  try {
    const { userId, role } = req.body

    if (!userId || !role) {
      return res.json({ success: false, message: 'userId and role are required.' })
    }

    // Disallow creating additional admins from API.
    const allowedRoles = ['student', 'instructor']
    if (!allowedRoles.includes(role)) {
      return res.json({ success: false, message: 'Invalid role. Allowed: student, instructor.' })
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    })

    // Keep Mongo role in sync with Clerk.
    await User.findByIdAndUpdate(userId, { role })

    res.json({ success: true, message: `User role updated to ${role}.` })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const getAllCoursesAdmin = async (req, res) => {
  try {
    const courses = await Course.find()
      .select('courseTitle coursePrice discount isPublished enrolledStudents instructor createdAt updatedAt')
      .populate('instructor', 'name email imageUrl role')
      .sort({ createdAt: -1 })

    res.json({ success: true, courses })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const toggleCoursePublishAdmin = async (req, res) => {
  try {
    const { courseId, isPublished } = req.body

    if (!courseId || typeof isPublished !== 'boolean') {
      return res.json({ success: false, message: 'courseId and isPublished(boolean) are required.' })
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { isPublished },
      { new: true }
    ).select('_id courseTitle isPublished')

    if (!updated) {
      return res.json({ success: false, message: 'Course not found.' })
    }

    res.json({ success: true, message: 'Course publish status updated.', course: updated })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const getAllPurchasesAdmin = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('courseId', 'courseTitle')
      .populate('userId', 'name email imageUrl')
      .sort({ createdAt: -1 })

    res.json({ success: true, purchases })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
// ✅ Admin hard delete course (no restrictions)
export const deleteCourseAdmin = async (req, res) => {
  try {
    const { courseId } = req.params

    const course = await Course.findById(courseId)
    if (!course) {
      return res.json({ success: false, message: 'Course not found.' })
    }

    const courseObjectId = course._id
    const courseIdString = course._id.toString()

    // Cleanup so users don't keep broken enrollments
    await User.updateMany(
      { enrolledCourses: courseObjectId },
      { $pull: { enrolledCourses: courseObjectId } }
    )

    // Cleanup progress docs (your CourseProgress model stores courseId as string)
    await CourseProgress.deleteMany({ courseId: courseIdString })

    /**
     * IMPORTANT:
     * I am NOT deleting Purchase records on purpose (recommended),
     * because you typically want audit/history and revenue stats to remain.
     * If you *really* want to delete purchases too, uncomment:
     *
     * await Purchase.deleteMany({ courseId: courseObjectId })
     */

    await Course.findByIdAndDelete(courseObjectId)

    return res.json({ success: true, message: 'Course deleted by admin.' })
  } catch (error) {
    return res.json({ success: false, message: error.message })
  }
}


// ----- Instructor Request Approval Flow -----

export const getInstructorRequestsAdmin = async (req, res) => {
  try {
    const status = (req.query.status || 'pending').toLowerCase()
    const allowed = ['pending', 'approved', 'rejected', 'all']

    if (!allowed.includes(status)) {
      return res.json({ success: false, message: 'Invalid status filter.' })
    }

    const filter = status === 'all' ? {} : { status }

    const requests = await InstructorRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    // Attach basic user info from Mongo for display
    const userIds = requests.map(r => r.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email imageUrl role')
      .lean()

    const usersMap = new Map(users.map(u => [u._id, u]))
    const enriched = requests.map(r => ({
      ...r,
      user: usersMap.get(r.userId) || null,
    }))

    res.json({ success: true, requests: enriched })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const approveInstructorRequestAdmin = async (req, res) => {
  try {
    const adminId = req.auth.userId
    const { requestId } = req.params

    const request = await InstructorRequest.findById(requestId)
    if (!request) {
      return res.json({ success: false, message: 'Request not found.' })
    }

    if (request.status === 'approved') {
      return res.json({ success: true, message: 'Request already approved.' })
    }

    // Set role in Clerk
    await clerkClient.users.updateUserMetadata(request.userId, {
      publicMetadata: { role: 'instructor' },
    })

    // Sync Mongo role with Clerk
    await User.findByIdAndUpdate(request.userId, { role: 'instructor' })

    request.status = 'approved'
    request.reviewedBy = adminId
    request.reviewedAt = new Date()
    request.decisionNote = ''
    await request.save()

    res.json({ success: true, message: 'Instructor request approved.' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


export const rejectInstructorRequestAdmin = async (req, res) => {
  try {
    const adminId = req.auth.userId
    const { requestId } = req.params
    const { decisionNote = '' } = req.body || {}

    const request = await InstructorRequest.findById(requestId)
    if (!request) {
      return res.json({ success: false, message: 'Request not found.' })
    }

    if (request.status === 'rejected') {
      return res.json({ success: true, message: 'Request already rejected.' })
    }

    request.status = 'rejected'
    request.reviewedBy = adminId
    request.reviewedAt = new Date()
    request.decisionNote = decisionNote
    await request.save()

    res.json({ success: true, message: 'Instructor request rejected.' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
