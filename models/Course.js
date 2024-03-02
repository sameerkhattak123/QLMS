const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required:true,
  },
  instructorName: {
    type: String
  },
  instructorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstructorProfile',
  },
  instructorEmail: {
    type: String
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    }
  ],
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('course', CourseSchema);
