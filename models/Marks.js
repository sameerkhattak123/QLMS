const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MarksSchema = new Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  marksType: {
    type: String,
    enum: ['Assignment', 'Quiz'],
    required: true,
  },
  students: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      obtainedMarks: {
        type: Number,
        required: true,
      },
      comments: {
        type: String,
      },
    },
  ],
  // You can add more fields as needed
});

MarksSchema.index({ course: 1, title: 1 }, { unique: true, partialFilterExpression: { course: { $exists: true } } });

module.exports = mongoose.model('Marks', MarksSchema);
