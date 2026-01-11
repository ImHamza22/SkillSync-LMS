import { v2 as cloudinary } from 'cloudinary'
import Course from '../models/Course.js';
import { CourseProgress } from '../models/CourseProgress.js';
import { Purchase } from '../models/Purchase.js';
import User from '../models/User.js';
import { clerkClient } from '@clerk/express'

// update role to instructor
export const updateRoleToInstructor = async (req, res) => {

    try {

        const userId = req.auth.userId

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'instructor',
            },
        })

        res.json({ success: true, message: 'You can publish a course now' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Add New Course
export const addCourse = async (req, res) => {
    try {
        const instructorId = req.auth.userId

        const files = Array.isArray(req.files) ? req.files : []
        const imageFile = files.find(f => f.fieldname === 'image')

        const { courseData } = req.body

        if (!courseData) {
            return res.json({ success: false, message: 'courseData is required' })
        }

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached' })
        }

        const parsedCourseData = JSON.parse(courseData)
        parsedCourseData.instructor = instructorId

        if (!Array.isArray(parsedCourseData.courseContent) || parsedCourseData.courseContent.length === 0) {
            return res.json({ success: false, message: 'Course content is required' })
        }

        // Map uploaded lecture video files by lectureId.
        // Frontend sends each lecture video as: formData.append(`video_${lectureId}`, file)
        const videoByLectureId = {}
        for (const f of files) {
            if (typeof f.fieldname === 'string' && f.fieldname.startsWith('video_')) {
                const lectureId = f.fieldname.replace('video_', '')
                videoByLectureId[lectureId] = f
            }
        }

        // Upload thumbnail
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
            folder: `skillsync/thumbnails/${instructorId}`
        })
        parsedCourseData.courseThumbnail = imageUpload.secure_url

        // Upload lecture videos and inject URLs into courseContent
        for (const chapter of parsedCourseData.courseContent) {
            if (!Array.isArray(chapter.chapterContent)) chapter.chapterContent = []

            for (const lecture of chapter.chapterContent) {
                // Ensure numbers are numbers
                if (lecture.lectureDuration !== undefined) {
                    const d = Number(lecture.lectureDuration)
                    lecture.lectureDuration = Number.isNaN(d) ? 0 : d
                }

                const lectureId = lecture.lectureId
                const videoFile = videoByLectureId[lectureId]

                if (!videoFile) {
                    return res.json({
                        success: false,
                        message: `Video file missing for lecture: ${lecture.lectureTitle || lectureId}`
                    })
                }

                const videoUpload = await cloudinary.uploader.upload(videoFile.path, {
                    resource_type: 'video',
                    folder: `skillsync/lectures/${instructorId}`
                })

                lecture.lectureUrl = videoUpload.secure_url
                lecture.lecturePublicId = videoUpload.public_id
            }
        }

        const newCourse = await Course.create(parsedCourseData)

        return res.json({ success: true, message: 'Course Added', courseId: newCourse._id })

    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

// Get Instructor Courses
export const getInstructorCourses = async (req, res) => {
    try {

        const instructor = req.auth.userId

        const courses = await Course.find({ instructor })

        res.json({ success: true, courses })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Instructor Dashboard Data ( Total Earning, Enrolled Students, No. of Courses)
export const instructorDashboardData = async (req, res) => {
    try {
        const instructor = req.auth.userId;

        const courses = await Course.find({ instructor });

        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id);

        // Calculate total earnings from purchases
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

        // Collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = [];
        for (const course of courses) {
            const students = await User.find({
                _id: { $in: course.enrolledStudents }
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                });
            });
        }

        res.json({
            success: true,
            dashboardData: {
                totalEarnings,
                enrolledStudentsData,
                totalCourses
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try {
        const instructor = req.auth.userId;

        // Fetch all courses created by the instructor
        const courses = await Course.find({ instructor });

        // Get the list of course IDs
        const courseIds = courses.map(course => course._id);

        // Fetch purchases with user and course data
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle');

        // enrolled students data
        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({
            success: true,
            enrolledStudents
        });

    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
};

// Get a single course by id (for instructor edit)
export const getInstructorCourseById = async (req, res) => {
    try {
        const instructor = req.auth.userId
        const { id } = req.params

        const course = await Course.findById(id)

        if (!course) {
            return res.json({ success: false, message: 'Course Not Found' })
        }

        if (course.instructor !== instructor) {
            return res.json({ success: false, message: 'Unauthorized Access' })
        }

        return res.json({ success: true, course })

    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

// Update course (thumbnail optional)
export const updateCourse = async (req, res) => {
    try {
        const instructor = req.auth.userId
        const { id } = req.params

        const course = await Course.findById(id)

        if (!course) {
            return res.json({ success: false, message: 'Course Not Found' })
        }

        if (course.instructor !== instructor) {
            return res.json({ success: false, message: 'Unauthorized Access' })
        }

        const parsedCourseData = req.body.courseData ? JSON.parse(req.body.courseData) : req.body

        if (typeof parsedCourseData.courseTitle === 'string') course.courseTitle = parsedCourseData.courseTitle

        // courseDescription is required
        if (parsedCourseData.courseDescription !== undefined) {
            if (typeof parsedCourseData.courseDescription !== 'string' || parsedCourseData.courseDescription.trim().length === 0) {
                return res.json({ success: false, message: 'Course description is required' })
            }
            course.courseDescription = parsedCourseData.courseDescription
        }

        if (parsedCourseData.coursePrice !== undefined) {
            const p = Number(parsedCourseData.coursePrice)
            if (!Number.isNaN(p)) course.coursePrice = p
        }

        if (parsedCourseData.discount !== undefined) {
            const d = Number(parsedCourseData.discount)
            if (!Number.isNaN(d)) course.discount = d
        }

        if (Array.isArray(parsedCourseData.courseContent)) {
            course.courseContent = parsedCourseData.courseContent
        }

        const files = Array.isArray(req.files) ? req.files : []
        const imageFile = files.find(f => f.fieldname === 'image')

        // Optional thumbnail update
        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
                folder: `skillsync/thumbnails/${instructor}`
            })
            course.courseThumbnail = imageUpload.secure_url
        }

        // Lecture video updates (optional)
        const videoByLectureId = {}
        for (const f of files) {
            if (typeof f.fieldname === 'string' && f.fieldname.startsWith('video_')) {
                const lectureId = f.fieldname.replace('video_', '')
                videoByLectureId[lectureId] = f
            }
        }

        if (Array.isArray(course.courseContent) && course.courseContent.length > 0) {
            for (const chapter of course.courseContent) {
                if (!Array.isArray(chapter.chapterContent)) continue

                for (const lecture of chapter.chapterContent) {
                    // Ensure numbers are numbers
                    if (lecture.lectureDuration !== undefined) {
                        const d = Number(lecture.lectureDuration)
                        lecture.lectureDuration = Number.isNaN(d) ? 0 : d
                    }

                    const lectureId = lecture.lectureId

                    if (videoByLectureId[lectureId]) {
                        const videoUpload = await cloudinary.uploader.upload(videoByLectureId[lectureId].path, {
                            resource_type: 'video',
                            folder: `skillsync/lectures/${instructor}`
                        })
                        lecture.lectureUrl = videoUpload.secure_url
                        lecture.lecturePublicId = videoUpload.public_id
                    }

                    if (!lecture.lectureUrl || String(lecture.lectureUrl).trim().length === 0) {
                        return res.json({
                            success: false,
                            message: `Lecture video is required for: ${lecture.lectureTitle || lectureId}`
                        })
                    }
                }
            }
        }

        await course.save()

        return res.json({ success: true, message: 'Course Updated' })

    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

// Delete course (BLOCKED if purchased/enrolled)
export const deleteCourse = async (req, res) => {
    try {
        const instructor = req.auth.userId
        const { id } = req.params

        const course = await Course.findById(id)

        if (!course) {
            return res.json({ success: false, message: 'Course Not Found' })
        }

        if (course.instructor !== instructor) {
            return res.json({ success: false, message: 'Unauthorized Access' })
        }

        // Block deletion if any students are enrolled
        if (Array.isArray(course.enrolledStudents) && course.enrolledStudents.length > 0) {
            return res.json({
                success: false,
                message: 'This course has enrolled students and cannot be deleted. Please unpublish/archive it instead.'
            })
        }

        // Block deletion if any purchase history exists (completed/pending/failed)
        const hasPurchases = await Purchase.exists({ courseId: course._id })
        if (hasPurchases) {
            return res.json({
                success: false,
                message: 'This course has purchase history and cannot be deleted. Please unpublish/archive it instead.'
            })
        }

        // Cleanup: remove references (defensive)
        await User.updateMany(
            { enrolledCourses: course._id },
            { $pull: { enrolledCourses: course._id } }
        )

        await CourseProgress.deleteMany({ courseId: course._id.toString() })

        await Course.findByIdAndDelete(course._id)

        return res.json({ success: true, message: 'Course Deleted' })

    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}
