import mongoose from 'mongoose'

const instructorRequestSchema = new mongoose.Schema(
  {
    // Multiple requests per user are allowed (we keep history).
    userId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Who created this request record
    source: { type: String, enum: ['user', 'admin'], default: 'user' },
    message: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date },
    decisionNote: { type: String, default: '' },
  },
  { timestamps: true }
)

const InstructorRequest = mongoose.model('InstructorRequest', instructorRequestSchema)

export default InstructorRequest
