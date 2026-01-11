import { clerkClient } from "@clerk/express"

// Middleware ( Protect Authenticated Routes )
export const protectAuth = (req, res, next) => {
    const userId = req.auth?.userId
    if (!userId) {
        return res.json({ success: false, message: 'Unauthorized Access' })
    }
    next()
}

// Middleware ( Protect Instructor Routes )
export const protectInstructor = async (req,res,next) => {

    try {

        const userId = req.auth.userId
        
        const response = await clerkClient.users.getUser(userId)

        if (response.publicMetadata.role !== 'instructor') {
            return res.json({success:false, message: 'Unauthorized Access'})
        }
        
        next ()

    } catch (error) {
        res.json({success:false, message: error.message})
    }

}

// Middleware ( Protect Admin Routes )
// Enforces a *single* super-admin via ADMIN_USER_ID.
export const protectAdmin = async (req, res, next) => {
    try {
        const userId = req.auth.userId

        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized Access' })
        }

        if (!process.env.ADMIN_USER_ID || userId !== process.env.ADMIN_USER_ID) {
            return res.json({ success: false, message: 'Unauthorized Access' })
        }

        const response = await clerkClient.users.getUser(userId)

        if (response.publicMetadata.role !== 'admin') {
            return res.json({ success: false, message: 'Unauthorized Access' })
        }

        next()

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}
