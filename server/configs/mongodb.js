import mongoose from "mongoose";
import InstructorRequest from "../models/InstructorRequest.js";

// Connect to the MongoDB database
const connectDB = async () => {

    mongoose.connection.on('connected', () => console.log('Database Connected'))

    await mongoose.connect(`${process.env.MONGODB_URI}/lms`)

    // Keep MongoDB indexes in sync with schema (important if you previously ran with different indexes).
    // This also drops the old unique index on InstructorRequest.userId if it exists.
    try {
        await InstructorRequest.syncIndexes()
    } catch (e) {
        console.log('InstructorRequest index sync skipped:', e.message)
    }

}

export default connectDB
