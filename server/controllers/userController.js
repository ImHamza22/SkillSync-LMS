import Course from "../models/Course.js"
import { CourseProgress } from "../models/CourseProgress.js"
import { Purchase } from "../models/Purchase.js"
import User from "../models/User.js"
import InstructorRequest from "../models/InstructorRequest.js"
import stripe from "stripe"

import { clerkClient } from '@clerk/express'


// Ensure a MongoDB User document exists for the signed-in Clerk user.
// Fixes first-login race where the Clerk webhook may not have created the user yet.
const ensureUserInDB = async (userId) => {
    let user = await User.findById(userId)
    if (user) return user

    const cUser = await clerkClient.users.getUser(userId)

    const email = cUser?.emailAddresses?.[0]?.emailAddress
    const name =
        [cUser?.firstName, cUser?.lastName].filter(Boolean).join(' ').trim() ||
        cUser?.username ||
        'User'
    const imageUrl = cUser?.imageUrl || 'https://ui-avatars.com/api/?name=User'
    const role = cUser?.publicMetadata?.role || 'student'

    if (!email) {
        throw new Error('Clerk user has no email address')
    }

    try {
        user = await User.create({
            _id: userId,
            email,
            name,
            imageUrl,
            role,
        })
        return user
    } catch (err) {
        // If webhook created the user at the same time, just fetch again.
        if (err?.code === 11000) {
            const existing = await User.findById(userId)
            if (existing) return existing
        }
        throw err
    }
}



// Get User Data
export const getUserData = async (req, res) => {
    try {

        const userId = req.auth.userId

        const user = await ensureUserInDB(userId)

        res.json({ success: true, user })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Purchase Course 

export const purchaseCourse = async (req, res) => {

    try {

        const { courseId } = req.body
        const { origin } = req.headers


        const userId = req.auth.userId

        const courseData = await Course.findById(courseId)
        const userData = await ensureUserInDB(userId)

        if (!userData || !courseData) {
            return res.json({ success: false, message: 'Data Not Found' })
        }

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100),
        }

        const newPurchase = await Purchase.create(purchaseData)

        // Stripe Gateway Initialize
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

        const currency = process.env.CURRENCY.toLocaleLowerCase()

        // Creating line items to for Stripe
        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount) * 100
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/my-enrollments`,
            cancel_url: `${origin}/course/${courseId}`,
            line_items,
            mode: 'payment',
            // Helps webhook reconciliation for different event types
            client_reference_id: newPurchase._id.toString(),
            // Ensure purchaseId is available on BOTH the Checkout Session and the PaymentIntent.
            // (Some Stripe webhook setups listen to payment_intent.succeeded instead of checkout.session.completed.)
            payment_intent_data: {
                metadata: {
                    purchaseId: newPurchase._id.toString(),
                },
            },
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        })

        res.json({ success: true, session_url: session.url });


    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Users Enrolled Courses With Lecture Links

export const userEnrolledCourses = async (req, res) => {

    try {

        const userId = req.auth.userId

        const userData = await ensureUserInDB(userId)
        await userData.populate('enrolledCourses')

        res.json({ success: true, enrolledCourses: userData.enrolledCourses })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Update User Course Progress

export const updateUserCourseProgress = async (req, res) => {

    try {

        const userId = req.auth.userId

        const { courseId, lectureId } = req.body

        const progressData = await CourseProgress.findOne({ userId, courseId })

        if (progressData) {

            if (progressData.lectureCompleted.includes(lectureId)) {
                return res.json({ success: true, message: 'Lecture Already Completed' })
            }

            progressData.lectureCompleted.push(lectureId)
            await progressData.save()

        } else {

            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [lectureId]
            })

        }

        res.json({ success: true, message: 'Progress Updated' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// get User Course Progress

export const getUserCourseProgress = async (req, res) => {

    try {

        const userId = req.auth.userId

        const { courseId } = req.body

        const progressData = await CourseProgress.findOne({ userId, courseId })

        res.json({ success: true, progressData })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Add User Rating

export const addUserRating = async (req, res) => {
    const userId = req.auth.userId;
    const { courseId, rating } = req.body;

    // Validate inputs
    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
        return res.json({ success: false, message: 'InValid Details' });
    }

    try {
        // Find the course by ID
        const course = await Course.findById(courseId);

        if (!course) {
            return res.json({ success: false, message: 'Course not found.' });
        }

        const user = await ensureUserInDB(userId);

        if (!user || !user.enrolledCourses.includes(courseId)) {
            return res.json({ success: false, message: 'User has not purchased this course.' });
        }

        // Check if the user has already rated this course
        const existingRatingIndex = course.courseRatings.findIndex(
            (r) => r.userId === userId
        );

        if (existingRatingIndex > -1) {
            // Update the existing rating
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            // Add a new rating
            course.courseRatings.push({ userId, rating });
        }

        await course.save();

        return res.json({ success: true, message: 'Rating added' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};


// Request Instructor Role (approval-based)
export const requestInstructorRole = async (req, res) => {
    try {
        const userId = req.auth.userId
        const { message = '' } = req.body || {}

        // If user already instructor/admin, no request needed
        const [dbUser, clerkUser] = await Promise.all([
            User.findById(userId),
            clerkClient.users.getUser(userId),
        ])

        const roleFromClerk = clerkUser?.publicMetadata?.role
        const roleFromDb = dbUser?.role

        if (roleFromClerk === 'instructor' || roleFromDb === 'instructor') {
            return res.json({ success: false, message: 'You are already an instructor.' })
        }
        if (roleFromClerk === 'admin' || roleFromDb === 'admin') {
            return res.json({ success: false, message: 'Admins cannot request instructor role.' })
        }

        // Block if a pending request exists
        const pending = await InstructorRequest.findOne({ userId, status: 'pending' })
        if (pending) {
            return res.json({ success: false, message: 'You already have a pending request.' })
        }

        // Daily limit (2)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const requestsToday = await InstructorRequest.countDocuments({
            userId,
            createdAt: { $gte: startOfDay, $lt: endOfDay },
        })

        if (requestsToday >= 2) {
            return res.json({
                success: false,
                message: 'Daily limit reached. You can submit at most 2 instructor requests per day.',
            })
        }

        await InstructorRequest.create({ userId, message, status: 'pending', source: 'user' })

        res.json({ success: true, message: 'Instructor request submitted. Await admin approval.' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}


// Get current user's instructor request status
export const getMyInstructorRequest = async (req, res) => {
    try {
        const userId = req.auth.userId

        // Determine current role to avoid showing an old "approved" record when the user is currently a student.
        const [dbUser, clerkUser] = await Promise.all([
            User.findById(userId).select('role'),
            clerkClient.users.getUser(userId),
        ])

        const roleFromClerk = clerkUser?.publicMetadata?.role
        const currentRole = roleFromClerk || dbUser?.role || 'student'

        // For students: show the active request state.
        // - If there's a pending request, show it.
        // - Else, show the latest rejected request (so they can re-submit).
        // - DO NOT show approved when currently student (admin may have demoted).
        let request = null

        if (currentRole === 'student') {
            request = await InstructorRequest.findOne({ userId, status: 'pending' }).sort({ createdAt: -1 })
            if (!request) {
                request = await InstructorRequest.findOne({ userId, status: 'rejected' }).sort({ createdAt: -1 })
            }
        } else {
            // For instructors/admins: return latest request for history
            request = await InstructorRequest.findOne({ userId }).sort({ createdAt: -1 })
        }

        // Daily limit info
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const requestsToday = await InstructorRequest.countDocuments({
            userId,
            createdAt: { $gte: startOfDay, $lt: endOfDay },
        })

        res.json({
            success: true,
            request,
            currentRole,
            limit: {
                dailyMax: 2,
                requestsToday,
                remainingToday: Math.max(0, 2 - requestsToday),
            },
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}
